import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { runWithTenant } from "../prisma/tenant";
import { NotificationsService } from "../notifications/notifications.service";

const REMINDER_DAYS_AHEAD = 5;
const CHECK_INTERVAL_MS = 12 * 60 * 60 * 1000; // twice a day is plenty for a birthday check
const DEDUPE_WINDOW_MS = 20 * 60 * 60 * 1000; // don't re-notify within the same day's checks

/** No @nestjs/schedule dependency for one daily check -- a plain interval
 * timer plus a dedupe query against Notification (same link, same day)
 * covers it without adding a library, and survives dev-server restarts
 * safely since the dedupe check is idempotent, not state held in memory. */
@Injectable()
export class BirthdayRemindersService implements OnModuleInit {
  private readonly logger = new Logger(BirthdayRemindersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  onModuleInit() {
    this.checkAllOrganizations().catch((err) => this.logger.error("Birthday check failed", err));
    setInterval(() => {
      this.checkAllOrganizations().catch((err) => this.logger.error("Birthday check failed", err));
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
    const target = new Date();
    target.setDate(target.getDate() + REMINDER_DAYS_AHEAD);
    const targetMonth = target.getMonth() + 1;
    const targetDay = target.getDate();

    await runWithTenant(this.prisma, { organizationId, isPlatformAdmin: false }, async (tx) => {
      const [members, admins] = await Promise.all([
        tx.member.findMany({
          where: { birthMonth: targetMonth, birthDay: targetDay },
          select: { id: true, fullName: true },
        }),
        tx.user.findMany({ where: { role: "ORG_ADMIN", isActive: true }, select: { id: true } }),
      ]);
      if (members.length === 0 || admins.length === 0) return;

      const dedupeSince = new Date(Date.now() - DEDUPE_WINDOW_MS);
      for (const member of members) {
        const link = `/members/${member.id}`;
        const alreadySent = await tx.notification.findFirst({
          where: { type: "BIRTHDAY_REMINDER", link, createdAt: { gte: dedupeSince } },
        });
        if (alreadySent) continue;

        await this.notifications.notifyWithinTx(
          tx,
          organizationId,
          admins.map((a) => a.id),
          "BIRTHDAY_REMINDER",
          `${member.fullName}'s birthday is in ${REMINDER_DAYS_AHEAD} days.`,
          link,
        );
      }
    });
  }
}
