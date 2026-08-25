import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { runWithTenant, TenantContext } from "../prisma/tenant";
import { CreateSoulWinningRecordDto } from "./dto/create-soul-winning-record.dto";
import { UpdateSoulWinningRecordDto } from "./dto/update-soul-winning-record.dto";
import { AdvanceStageDto } from "./dto/advance-stage.dto";
import { LinkMemberDto } from "./dto/link-member.dto";

const RECORD_INCLUDE = {
  assignedTo: { select: { id: true, fullName: true } },
  fellowship: { select: { id: true, name: true } },
  class: { select: { id: true, name: true } },
  member: { select: { id: true, fullName: true } },
  stageHistory: { orderBy: { changedAt: "asc" } },
} as const;

@Injectable()
export class SoulWinningService {
  constructor(private readonly prisma: PrismaService) {}

  async create(ctx: TenantContext, dto: CreateSoulWinningRecordDto) {
    if (!ctx.organizationId) throw new ForbiddenException("Only an organization member can do that");
    return runWithTenant(this.prisma, ctx, async (tx) => {
      const record = await tx.soulWinningRecord.create({
        data: {
          organizationId: ctx.organizationId as string,
          branchId: dto.branchId,
          fullName: dto.fullName,
          phone: dto.phone,
          address: dto.address,
          wonAt: dto.wonAt ? new Date(dto.wonAt) : undefined,
          wonWhere: dto.wonWhere,
          assignedToId: dto.assignedToId,
          notes: dto.notes,
          stageHistory: { create: { stage: "WON" } },
        },
        include: RECORD_INCLUDE,
      });
      return record;
    });
  }

  async list(ctx: TenantContext, filters?: { stage?: string; assignedToId?: string }) {
    return runWithTenant(this.prisma, ctx, (tx) =>
      tx.soulWinningRecord.findMany({
        where: {
          ...(filters?.stage ? { stage: filters.stage as any } : {}),
          ...(filters?.assignedToId ? { assignedToId: filters.assignedToId } : {}),
        },
        orderBy: { wonAt: "desc" },
        include: RECORD_INCLUDE,
      }),
    );
  }

  async get(ctx: TenantContext, id: string) {
    return runWithTenant(this.prisma, ctx, async (tx) => {
      const record = await tx.soulWinningRecord.findUnique({ where: { id }, include: RECORD_INCLUDE });
      if (!record) throw new NotFoundException("Record not found");
      return record;
    });
  }

  async update(ctx: TenantContext, id: string, dto: UpdateSoulWinningRecordDto) {
    return runWithTenant(this.prisma, ctx, (tx) =>
      tx.soulWinningRecord.update({ where: { id }, data: dto, include: RECORD_INCLUDE }),
    );
  }

  /** Moves the pipeline forward and logs the transition -- "must be tracked
   * very well" per the request, so every change is its own history row, not
   * just an overwritten current-stage field. */
  async advanceStage(ctx: TenantContext, id: string, dto: AdvanceStageDto) {
    return runWithTenant(this.prisma, ctx, async (tx) => {
      const existing = await tx.soulWinningRecord.findUnique({ where: { id } });
      if (!existing) throw new NotFoundException("Record not found");

      const record = await tx.soulWinningRecord.update({
        where: { id },
        data: {
          stage: dto.stage,
          fellowshipId: dto.fellowshipId ?? existing.fellowshipId,
          classId: dto.classId ?? existing.classId,
          stageHistory: { create: { stage: dto.stage, note: dto.note } },
        },
        include: RECORD_INCLUDE,
      });
      return record;
    });
  }

  /** Promotes a fully-integrated soul-winning contact to a real Member --
   * the frontend creates the Member first (same /members endpoint as any
   * other add), then calls this to link the two, same pattern as attendance
   * check-in's walk-in-to-member conversion. */
  async linkMember(ctx: TenantContext, id: string, dto: LinkMemberDto) {
    return runWithTenant(this.prisma, ctx, async (tx) => {
      const record = await tx.soulWinningRecord.findUnique({ where: { id } });
      if (!record) throw new NotFoundException("Record not found");
      const member = await tx.member.findUnique({ where: { id: dto.memberId }, select: { id: true } });
      if (!member) throw new NotFoundException("Member not found");
      return tx.soulWinningRecord.update({ where: { id }, data: { memberId: dto.memberId }, include: RECORD_INCLUDE });
    });
  }
}
