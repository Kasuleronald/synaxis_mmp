import { randomUUID } from "crypto";
import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { runWithTenant } from "../prisma/tenant";
import { pickDefaultFollowUpAssignee } from "./default-assignee";

const MISS_THRESHOLD = 3;
const CHECK_INTERVAL_MS = 12 * 60 * 60 * 1000; // twice a day, same cadence as birthday reminders

/** "Track repeat absenteeism ... flag follow up after the third miss"
 * (Sep 2026). Per meeting category, per member who has attended that
 * category before: if they have zero attendance records across the 3 most
 * recent past sessions of it, that's 3 misses in a row -- auto-create a
 * follow-up. Only members with prior history in a category are tracked
 * ("only people already linked to it"), so someone who's simply never gone
 * to a Worship Evening is never flagged for missing one. Same plain-interval
 * pattern as BirthdayRemindersService -- idempotent via the "already has a
 * pending follow-up for this exact miss" check, so re-running on a timer
 * (rather than hooking session creation directly) never double-flags. */
@Injectable()
export class AbsenteeismCheckService implements OnModuleInit {
  private readonly logger = new Logger(AbsenteeismCheckService.name);

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    this.checkAllOrganizations().catch((err) => this.logger.error("Absenteeism check failed", err));
    setInterval(() => {
      this.checkAllOrganizations().catch((err) => this.logger.error("Absenteeism check failed", err));
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
      const categories = await tx.meetingCategory.findMany({ where: { isActive: true } });
      for (const category of categories) {
        await this.checkCategory(tx, organizationId, category.id, category.name);
      }
    });
  }

  private async checkCategory(tx: any, organizationId: string, categoryId: string, categoryName: string) {
    const recentSessions: { id: string; date: Date }[] = await tx.attendanceSession.findMany({
      where: { categoryId, date: { lte: new Date() } },
      orderBy: { date: "desc" },
      take: MISS_THRESHOLD,
      select: { id: true, date: true },
    });
    if (recentSessions.length < MISS_THRESHOLD) return;

    const windowSessionIds = recentSessions.map((s) => s.id);
    const windowStart = recentSessions[recentSessions.length - 1].date;

    const priorAttendance: { memberId: string | null }[] = await tx.attendanceRecord.findMany({
      where: { memberId: { not: null }, session: { categoryId, date: { lt: windowStart } } },
      select: { memberId: true },
      distinct: ["memberId"],
    });
    const trackedMemberIds = priorAttendance.map((r) => r.memberId as string);
    if (trackedMemberIds.length === 0) return;

    const attendedInWindow: { memberId: string | null }[] = await tx.attendanceRecord.findMany({
      where: { sessionId: { in: windowSessionIds }, memberId: { in: trackedMemberIds } },
      select: { memberId: true },
      distinct: ["memberId"],
    });
    const attendedSet = new Set(attendedInWindow.map((r) => r.memberId));
    const missedAll = trackedMemberIds.filter((id) => !attendedSet.has(id));

    const notes = `Missed the last ${MISS_THRESHOLD} ${categoryName} sessions in a row.`;
    for (const memberId of missedAll) {
      const alreadyFlagged = await tx.followUp.findFirst({ where: { memberId, status: "PENDING", notes } });
      if (alreadyFlagged) continue;

      const assignedToId = await pickDefaultFollowUpAssignee(tx, organizationId);
      await tx.followUp.create({
        data: { id: randomUUID(), organizationId, memberId, assignedToId, notes },
      });
    }
  }
}
