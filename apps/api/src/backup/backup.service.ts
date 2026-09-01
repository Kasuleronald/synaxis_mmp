import { BadRequestException, Injectable } from "@nestjs/common";
import { SessionUser } from "@life-mmp/shared";
import { PrismaService } from "../prisma/prisma.service";
import { runWithTenant } from "../prisma/tenant";
import { tenantContextFor } from "../auth/tenant-context";
import { AuditLogService } from "../audit-log/audit-log.service";

const BACKUP_FORMAT_VERSION = 1;

/** One entry per table this backup covers, in dependency order (a row's own
 * foreign keys always point at a table earlier in this list) -- restore
 * inserts in this order and wipes in reverse, so every FK is satisfied
 * either way. Two tables (orgUnit, givingCategory) self-reference one level
 * deep (a department points at its directorate; a subcategory at its
 * category) and get a two-pass insert in the service methods below instead
 * of a plain createMany.
 *
 * Deliberately NOT covered: ImportBatch/ImportStagingRow (mid-review work,
 * not settled ministry data), Notification (ephemeral), AuditLog (this
 * backup's own trail, not the point of it), SelfRegistration (pending
 * public submissions), FellowshipReport/Attendee (derived reporting data
 * with a tie back into GivingRecord that complicates ordering for
 * comparatively low restore value), AssetConditionRequest/Photo and
 * FixedAssetEditRequest (in-flight approval workflow state). All of that
 * can be added later without changing anything already backed up. */
const TABLE_SPECS: {
  key: string;
  model: string;
  orgWhere: (organizationId: string) => Record<string, unknown>;
}[] = [
  { key: "branches", model: "branch", orgWhere: (organizationId) => ({ organizationId }) },
  { key: "users", model: "user", orgWhere: (organizationId) => ({ organizationId }) },
  { key: "households", model: "household", orgWhere: (organizationId) => ({ organizationId }) },
  { key: "fellowships", model: "fellowship", orgWhere: (organizationId) => ({ organizationId }) },
  { key: "orgUnits", model: "orgUnit", orgWhere: (organizationId) => ({ organizationId }) },
  { key: "serviceUnits", model: "serviceUnit", orgWhere: (organizationId) => ({ organizationId }) },
  { key: "givingCategories", model: "givingCategory", orgWhere: (organizationId) => ({ organizationId }) },
  { key: "funds", model: "fund", orgWhere: (organizationId) => ({ organizationId }) },
  { key: "vendors", model: "vendor", orgWhere: (organizationId) => ({ organizationId }) },
  { key: "partners", model: "partner", orgWhere: (organizationId) => ({ organizationId }) },
  { key: "discipleshipPrograms", model: "discipleshipProgram", orgWhere: (organizationId) => ({ organizationId }) },
  { key: "discipleshipClasses", model: "discipleshipClass", orgWhere: (organizationId) => ({ organizationId }) },
  { key: "events", model: "event", orgWhere: (organizationId) => ({ organizationId }) },
  { key: "members", model: "member", orgWhere: (organizationId) => ({ organizationId }) },
  { key: "serviceUnitMembers", model: "serviceUnitMember", orgWhere: (organizationId) => ({ serviceUnit: { organizationId } }) },
  { key: "classEnrollments", model: "classEnrollment", orgWhere: (organizationId) => ({ organizationId }) },
  { key: "attendanceSessions", model: "attendanceSession", orgWhere: (organizationId) => ({ organizationId }) },
  { key: "attendanceRecords", model: "attendanceRecord", orgWhere: (organizationId) => ({ organizationId }) },
  { key: "followUps", model: "followUp", orgWhere: (organizationId) => ({ organizationId }) },
  { key: "givingBatches", model: "givingBatch", orgWhere: (organizationId) => ({ organizationId }) },
  { key: "pledges", model: "pledge", orgWhere: (organizationId) => ({ organizationId }) },
  { key: "givingRecords", model: "givingRecord", orgWhere: (organizationId) => ({ organizationId }) },
  { key: "fundRequisitions", model: "fundRequisition", orgWhere: (organizationId) => ({ organizationId }) },
  { key: "requisitionAccountabilities", model: "requisitionAccountability", orgWhere: (organizationId) => ({ organizationId }) },
  { key: "assets", model: "asset", orgWhere: (organizationId) => ({ organizationId }) },
  { key: "fixedAssets", model: "fixedAsset", orgWhere: (organizationId) => ({ organizationId }) },
  { key: "fixedAssetPhotos", model: "fixedAssetPhoto", orgWhere: (organizationId) => ({ fixedAsset: { organizationId } }) },
  { key: "requisitionReceipts", model: "requisitionReceipt", orgWhere: (organizationId) => ({ accountability: { organizationId } }) },
  { key: "announcements", model: "announcement", orgWhere: (organizationId) => ({ organizationId }) },
  { key: "testimonies", model: "testimony", orgWhere: (organizationId) => ({ organizationId }) },
  { key: "devotionals", model: "devotional", orgWhere: (organizationId) => ({ organizationId }) },
  { key: "soulWinningRecords", model: "soulWinningRecord", orgWhere: (organizationId) => ({ organizationId }) },
  { key: "soulWinningStageChanges", model: "soulWinningStageChange", orgWhere: (organizationId) => ({ record: { organizationId } }) },
  { key: "deletionRequests", model: "deletionRequest", orgWhere: (organizationId) => ({ organizationId }) },
  { key: "eventDebriefs", model: "eventDebrief", orgWhere: (organizationId) => ({ organizationId }) },
];

// Self-referencing one level deep -- parent rows (parentId null) must be
// inserted before their children in the same table.
const SELF_REFERENCING_KEYS = new Set(["orgUnits", "givingCategories"]);

function serializeRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    out[k] = Buffer.isBuffer(v) ? v.toString("base64") : v;
  }
  return out;
}

function deserializeRow(row: Record<string, unknown>, bytesFields: Set<string>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    out[k] = bytesFields.has(k) && typeof v === "string" ? Buffer.from(v, "base64") : v;
  }
  return out;
}

const BYTES_FIELDS_BY_MODEL: Record<string, Set<string>> = {
  asset: new Set(["data"]),
};

@Injectable()
export class BackupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async exportOrg(actor: SessionUser) {
    const ctx = tenantContextFor(actor);
    if (!ctx.organizationId) throw new BadRequestException("Only an organization member can back up an organization");
    const organizationId = ctx.organizationId;

    return runWithTenant(this.prisma, ctx, async (tx: any) => {
      const org = await tx.organization.findUnique({ where: { id: organizationId } });
      const data: Record<string, unknown[]> = {};
      for (const spec of TABLE_SPECS) {
        const rows = await tx[spec.model].findMany({ where: spec.orgWhere(organizationId) });
        data[spec.key] = rows.map(serializeRow);
      }

      await this.auditLog.recordWithinTx(tx, organizationId, actor, {
        action: "ORGANIZATION_BACKUP_EXPORTED",
        entityType: "organization",
        entityId: organizationId,
        entityLabel: org?.displayName,
      });

      return {
        formatVersion: BACKUP_FORMAT_VERSION,
        exportedAt: new Date().toISOString(),
        organization: { id: org.id, displayName: org.displayName, slug: org.slug },
        organizationProfile: org,
        data,
      };
    });
  }

  /** Wipes this organization's own data in every covered table (reverse
   * dependency order, so nothing fails on a still-referenced row) and
   * re-inserts the backup's rows (forward order) inside one transaction --
   * if anything goes wrong partway, Postgres rolls the whole thing back and
   * the organization is left exactly as it was before the attempt. IDs are
   * restored as-is (they're UUIDs, globally unique, not per-org sequence
   * numbers) so every relationship in the backup is intact automatically,
   * with no ID-remapping layer needed. */
  async restoreOrg(actor: SessionUser, bundle: any) {
    const ctx = tenantContextFor(actor);
    if (!ctx.organizationId) throw new BadRequestException("Only an organization member can restore into an organization");
    const organizationId = ctx.organizationId;

    if (!bundle || typeof bundle !== "object" || !bundle.data) {
      throw new BadRequestException("This doesn't look like a Synaxis backup file.");
    }
    if (bundle.formatVersion !== BACKUP_FORMAT_VERSION) {
      throw new BadRequestException("This backup was made by a different version of Synaxis and can't be restored here.");
    }
    if (bundle.organization?.id && bundle.organization.id !== organizationId) {
      throw new BadRequestException(
        "This backup belongs to a different organization -- restoring it here would mix in someone else's data.",
      );
    }

    const counts = await runWithTenant(this.prisma, ctx, async (tx: any) => {
      // Reverse order: a child row must go before the parent it points at.
      for (const spec of [...TABLE_SPECS].reverse()) {
        await tx[spec.model].deleteMany({ where: spec.orgWhere(organizationId) });
      }

      const created: Record<string, number> = {};
      for (const spec of TABLE_SPECS) {
        const rawRows: Record<string, unknown>[] = bundle.data[spec.key] ?? [];
        const bytesFields = BYTES_FIELDS_BY_MODEL[spec.model] ?? new Set<string>();
        // Every row's own organizationId is forced to the acting org, not
        // trusted from the file -- the id-match check above already refuses
        // a foreign backup, this is the second, row-level guarantee of it.
        const rows = rawRows.map((r) => {
          const row = deserializeRow(r, bytesFields);
          if ("organizationId" in row) row.organizationId = organizationId;
          return row;
        });

        if (SELF_REFERENCING_KEYS.has(spec.key)) {
          const parents = rows.filter((r) => !r.parentId);
          const children = rows.filter((r) => r.parentId);
          if (parents.length) await tx[spec.model].createMany({ data: parents });
          if (children.length) await tx[spec.model].createMany({ data: children });
        } else if (rows.length) {
          await tx[spec.model].createMany({ data: rows });
        }
        created[spec.key] = rows.length;
      }

      if (bundle.organizationProfile) {
        const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...profile } = bundle.organizationProfile;
        await tx.organization.update({ where: { id: organizationId }, data: profile });
      }

      await this.auditLog.recordWithinTx(tx, organizationId, actor, {
        action: "ORGANIZATION_BACKUP_RESTORED",
        entityType: "organization",
        entityId: organizationId,
        entityLabel: bundle.organization?.displayName,
      });

      return created;
    });

    return { ok: true, restoredAt: new Date().toISOString(), counts };
  }
}
