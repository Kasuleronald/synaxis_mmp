import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { runWithTenant } from "../prisma/tenant";

const CHECK_INTERVAL_MS = 12 * 60 * 60 * 1000;
const ARCHIVE_GRACE_DAYS = 30;

/** Same "no @nestjs/schedule for one job" reasoning as the birthday
 * reminders: a plain interval timer, idempotent every time it runs (it only
 * ever moves a pledge forward through ACTIVE -> FULFILLED/ARCHIVED, never
 * back), so a dev-server restart re-running it early changes nothing. */
@Injectable()
export class PledgeLifecycleService implements OnModuleInit {
  private readonly logger = new Logger(PledgeLifecycleService.name);

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    this.checkAllOrganizations().catch((err) => this.logger.error("Pledge lifecycle check failed", err));
    setInterval(() => {
      this.checkAllOrganizations().catch((err) => this.logger.error("Pledge lifecycle check failed", err));
    }, CHECK_INTERVAL_MS);
  }

  private async checkAllOrganizations() {
    const orgs = await runWithTenant(this.prisma, { organizationId: null, isPlatformAdmin: true }, (tx) =>
      tx.organization.findMany({ where: { isSuspended: false }, select: { id: true } }),
    );
    for (const org of orgs) {
      await this.checkOrganization(org.id);
    }
  }

  private async checkOrganization(organizationId: string) {
    await runWithTenant(this.prisma, { organizationId, isPlatformAdmin: false }, async (tx) => {
      const [active, fulfilled] = await Promise.all([
        tx.pledge.findMany({ where: { status: "ACTIVE" } }),
        tx.givingRecord.groupBy({ by: ["pledgeId"], where: { pledgeId: { not: null } }, _sum: { amount: true } }),
      ]);
      const fulfilledByPledge = new Map(fulfilled.map((f) => [f.pledgeId as string, Number(f._sum.amount ?? 0)]));
      const now = Date.now();
      const graceMs = ARCHIVE_GRACE_DAYS * 24 * 60 * 60 * 1000;

      for (const pledge of active) {
        const raised = fulfilledByPledge.get(pledge.id) ?? 0;
        if (raised >= Number(pledge.amount)) {
          await tx.pledge.update({ where: { id: pledge.id }, data: { status: "FULFILLED" } });
        } else if (pledge.endDate && pledge.endDate.getTime() + graceMs < now) {
          await tx.pledge.update({ where: { id: pledge.id }, data: { status: "ARCHIVED" } });
        }
      }
    });
  }
}
