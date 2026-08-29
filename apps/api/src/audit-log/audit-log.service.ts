import { Injectable } from "@nestjs/common";
import { SessionUser } from "@life-mmp/shared";
import { PrismaService } from "../prisma/prisma.service";
import { runWithTenant, TenantContext } from "../prisma/tenant";
import { tenantContextFor } from "../auth/tenant-context";

export interface AuditEntry {
  action: string;
  entityType?: string;
  entityId?: string;
  entityLabel?: string;
}

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  /** Called from inside another service's own runWithTenant transaction --
   * same reasoning as NotificationsService.notifyWithinTx, commits
   * atomically with whatever triggered it rather than as a second write. */
  async recordWithinTx(tx: any, organizationId: string | null, actor: SessionUser, entry: AuditEntry) {
    await tx.auditLog.create({
      data: {
        organizationId,
        actorId: actor.id,
        actorName: actor.fullName,
        actorRole: actor.role,
        ...entry,
      },
    });
  }

  /** Standalone version for the @Audit interceptor, which runs after a
   * request's own transaction has already committed -- opens its own. */
  async record(actor: SessionUser, entry: AuditEntry) {
    const ctx = tenantContextFor(actor);
    await runWithTenant(this.prisma, ctx, (tx) =>
      tx.auditLog.create({
        data: {
          organizationId: actor.organizationId,
          actorId: actor.id,
          actorName: actor.fullName,
          actorRole: actor.role,
          ...entry,
        },
      }),
    );
  }

  /** Org-scoped activity feed for the Org Admin's own Audit Log page --
   * logins, deletions, approvals, creates/edits, all of it, for this org
   * only. */
  async list(ctx: TenantContext, limit = 300) {
    return runWithTenant(this.prisma, ctx, (tx) =>
      tx.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: limit }),
    );
  }

  /** Platform-wide login events only, across every organization -- the
   * Platform Admin console's own login audit. Org names are resolved in a
   * second query rather than an `include`, since a Platform Administrator's
   * own login (organizationId null) has none to include. */
  async listLogins(ctx: TenantContext, limit = 500) {
    return runWithTenant(this.prisma, ctx, async (tx) => {
      const rows = await tx.auditLog.findMany({
        where: { action: "LOGIN" },
        orderBy: { createdAt: "desc" },
        take: limit,
      });
      const orgIds = [...new Set(rows.map((r: any) => r.organizationId).filter((v: any): v is string => !!v))];
      const orgs = orgIds.length
        ? await tx.organization.findMany({ where: { id: { in: orgIds } }, select: { id: true, displayName: true } })
        : [];
      const orgNameById = new Map(orgs.map((o: any) => [o.id, o.displayName as string]));
      return rows.map((r: any) => ({
        ...r,
        organizationName: r.organizationId ? (orgNameById.get(r.organizationId) ?? null) : null,
      }));
    });
  }
}
