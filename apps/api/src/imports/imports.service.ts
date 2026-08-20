import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { ImportRowStatus, ImportStatus } from "@life-mmp/shared";
import { PrismaService } from "../prisma/prisma.service";
import { runWithTenant, TenantContext } from "../prisma/tenant";
import { mapColumns } from "./column-mapper";
import { parseSheet } from "./sheet-parser";
import { extractPdfText } from "./pdf-text";
import { extractMembersWithGemini, GeminiUnavailableError, type GeminiExtractedRow } from "./gemini";
import { UpdateStagingRowDto } from "./dto/update-staging-row.dto";

interface StagedCandidate {
  extractedFields: Record<string, unknown>;
  confidence: number;
  source: "deterministic" | "ai";
}

const GENDER_WORDS: Record<string, "MALE" | "FEMALE"> = {
  m: "MALE",
  male: "MALE",
  man: "MALE",
  f: "FEMALE",
  female: "FEMALE",
  woman: "FEMALE",
};

function normalizeGender(raw: string | undefined): "MALE" | "FEMALE" | undefined {
  if (!raw) return undefined;
  return GENDER_WORDS[raw.trim().toLowerCase()];
}

function normalizeName(raw: string): string {
  return raw.toLowerCase().replace(/\s+/g, " ").trim();
}

/** Staging keeps whatever raw date-of-birth string the sheet/AI produced;
 * only at commit time does it become the member's actual birthMonth/Day/Year. */
function parseBirthday(raw: string | undefined): { birthMonth?: number; birthDay?: number; birthYear?: number } {
  if (!raw) return {};
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return {};
  return { birthMonth: d.getUTCMonth() + 1, birthDay: d.getUTCDate(), birthYear: d.getUTCFullYear() };
}

@Injectable()
export class ImportsService {
  constructor(private readonly prisma: PrismaService) {}

  async upload(ctx: TenantContext, file: Express.Multer.File) {
    if (!ctx.organizationId) throw new ForbiddenException("Only an organization member can do that");
    if (!file) throw new BadRequestException("No file uploaded");

    const ext = (file.originalname.split(".").pop() || "").toLowerCase();
    if (ext === "doc" || ext === "docx") {
      throw new BadRequestException(
        "Word documents aren't supported yet -- export to PDF, or paste into a spreadsheet, and try again.",
      );
    }

    let candidates: StagedCandidate[];
    let usedAi = false;

    if (ext === "csv" || ext === "xlsx" || ext === "xls") {
      const { headers, rows } = parseSheet(file.buffer);
      const mapping = mapColumns(headers);
      const mappedFields = new Set(mapping.map((m) => m.field));

      if (!mappedFields.has("fullName")) {
        // Couldn't find anything that looks like a name column -- deterministic
        // mapping alone can't produce usable rows. Fall back to Gemini on the
        // raw sheet text, same as an unstructured document would get.
        candidates = await this.extractWithGeminiOrThrow(
          [headers.join(", "), ...rows.map((r) => headers.map((h) => r[h]).join(", "))].join("\n"),
        );
        usedAi = true;
      } else {
        candidates = rows.map((row) => {
          const extractedFields: Record<string, unknown> = {};
          let minConfidence = 1;
          for (const { field, header, confidence } of mapping) {
            const value = row[header]?.toString().trim();
            if (!value) continue;
            extractedFields[field] = field === "gender" ? (normalizeGender(value) ?? value) : value;
            minConfidence = Math.min(minConfidence, confidence);
          }
          return { extractedFields, confidence: minConfidence, source: "deterministic" as const };
        });
      }
    } else if (ext === "pdf") {
      const text = await extractPdfText(file.buffer);
      candidates = await this.extractWithGeminiOrThrow(text);
      usedAi = true;
    } else {
      throw new BadRequestException(`Unsupported file type: .${ext}`);
    }

    candidates = candidates.filter((c) => typeof c.extractedFields.fullName === "string" && c.extractedFields.fullName);
    if (candidates.length === 0) {
      throw new BadRequestException("Couldn't find any member records in this file.");
    }

    return runWithTenant(this.prisma, ctx, async (tx) => {
      const batch = await tx.importBatch.create({
        data: {
          organizationId: ctx.organizationId as string,
          filename: file.originalname,
          targetEntity: "member",
          status: ImportStatus.READY_FOR_REVIEW,
          usedAi,
        },
      });

      // Exact-name duplicate check against existing members -- a fast,
      // explainable first pass; not a fuzzy match against the whole
      // directory, which would be slow and second-guess the reviewer.
      const existing = await tx.member.findMany({ select: { id: true, fullName: true } });
      const existingByName = new Map(existing.map((m) => [normalizeName(m.fullName), m.id]));

      await tx.importStagingRow.createMany({
        data: candidates.map((c, i) => ({
          organizationId: ctx.organizationId as string,
          importBatchId: batch.id,
          rowIndex: i,
          extractedFields: c.extractedFields as any,
          confidence: c.confidence,
          source: c.source,
          possibleDuplicateOfId: existingByName.get(normalizeName(String(c.extractedFields.fullName))) ?? null,
        })),
      });

      return { ...batch, rowCount: candidates.length };
    });
  }

  private async extractWithGeminiOrThrow(text: string): Promise<StagedCandidate[]> {
    try {
      const rows = await extractMembersWithGemini(text);
      return rows.map((r: GeminiExtractedRow) => ({
        extractedFields: {
          fullName: r.fullName,
          phone: r.phone,
          email: r.email,
          gender: r.gender,
          dateOfBirth: r.dateOfBirth,
          address: r.address,
        },
        confidence: r.confidence ?? 0.5,
        source: "ai" as const,
      }));
    } catch (err) {
      if (err instanceof GeminiUnavailableError) {
        throw new BadRequestException(
          "This file needs AI extraction (no clear name column found), but no Gemini API key is configured yet.",
        );
      }
      throw new BadRequestException(`AI extraction failed: ${(err as Error).message}`);
    }
  }

  async listBatches(ctx: TenantContext) {
    return runWithTenant(this.prisma, ctx, (tx) =>
      tx.importBatch.findMany({
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { rows: true } } },
      }),
    );
  }

  async getBatch(ctx: TenantContext, id: string) {
    return runWithTenant(this.prisma, ctx, (tx) =>
      tx.importBatch.findUnique({
        where: { id },
        include: { rows: { orderBy: { rowIndex: "asc" } } },
      }),
    );
  }

  async updateRow(ctx: TenantContext, rowId: string, dto: UpdateStagingRowDto) {
    return runWithTenant(this.prisma, ctx, (tx) =>
      tx.importStagingRow.update({
        where: { id: rowId },
        data: {
          extractedFields: dto.extractedFields as any,
          status: dto.status,
        },
      }),
    );
  }

  /** One transaction: every APPROVED row becomes a real member, or none do. */
  async commit(ctx: TenantContext, batchId: string) {
    if (!ctx.organizationId) throw new ForbiddenException("Only an organization member can do that");
    return runWithTenant(this.prisma, ctx, async (tx) => {
      const batch = await tx.importBatch.findUnique({ where: { id: batchId }, include: { rows: true } });
      if (!batch) throw new NotFoundException("Import batch not found");

      const approved = batch.rows.filter((r) => r.status === ImportRowStatus.APPROVED);
      for (const row of approved) {
        const f = row.extractedFields as Record<string, string | undefined>;
        await tx.member.create({
          data: {
            organizationId: ctx.organizationId as string,
            fullName: f.fullName as string,
            phone: f.phone || undefined,
            email: f.email || undefined,
            gender: (normalizeGender(f.gender) ?? undefined) as any,
            ...parseBirthday(f.dateOfBirth),
            address: f.address || undefined,
            status: "VISITOR",
          },
        });
        await tx.importStagingRow.update({ where: { id: row.id }, data: { status: ImportRowStatus.COMMITTED } });
      }

      await tx.importBatch.update({ where: { id: batchId }, data: { status: ImportStatus.COMMITTED } });
      return { committed: approved.length, skipped: batch.rows.length - approved.length };
    });
  }
}
