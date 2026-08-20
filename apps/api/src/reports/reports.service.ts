import { ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { runWithTenant, TenantContext } from "../prisma/tenant";

type Bucket = "week" | "month";

function normalizeBucket(groupBy?: string): Bucket {
  return groupBy === "week" ? "week" : "month";
}

function ageGroupFor(birthYear: number | null, now = new Date()): string {
  if (!birthYear) return "Unknown";
  const age = now.getFullYear() - birthYear;
  if (age < 13) return "Child (0-12)";
  if (age < 18) return "Teen (13-17)";
  if (age < 25) return "Young adult (18-24)";
  if (age < 40) return "Adult (25-39)";
  if (age < 60) return "Middle-aged (40-59)";
  return "Senior (60+)";
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /** New members per month, plus a running cumulative total -- the
   * cumulative side is computed here rather than in SQL so the frontend
   * never has to reconcile two different rounding/timezone behaviors. */
  async membersOverTime(ctx: TenantContext) {
    return runWithTenant(this.prisma, ctx, async (tx) => {
      const rows = await tx.$queryRaw<{ month: Date; count: bigint }[]>`
        SELECT date_trunc('month', COALESCE("joinedAt", "createdAt")) AS month, COUNT(*) AS count
        FROM members
        GROUP BY month
        ORDER BY month
      `;
      let cumulative = 0;
      return rows.map((r) => {
        cumulative += Number(r.count);
        return { month: r.month.toISOString().slice(0, 7), newMembers: Number(r.count), cumulative };
      });
    });
  }

  async demographics(ctx: TenantContext) {
    return runWithTenant(this.prisma, ctx, async (tx) => {
      const members = await tx.member.findMany({
        select: { gender: true, maritalStatus: true, status: true, birthYear: true },
      });
      const count = (arr: (string | null)[]) => {
        const map = new Map<string, number>();
        for (const v of arr) {
          const key = v ?? "Unspecified";
          map.set(key, (map.get(key) ?? 0) + 1);
        }
        return Array.from(map.entries()).map(([label, count]) => ({ label, count }));
      };
      return {
        total: members.length,
        byGender: count(members.map((m) => m.gender)),
        byMaritalStatus: count(members.map((m) => m.maritalStatus)),
        byStatus: count(members.map((m) => m.status)),
        byAgeGroup: count(members.map((m) => ageGroupFor(m.birthYear))),
      };
    });
  }

  async attendanceTrend(ctx: TenantContext, groupBy?: string) {
    const bucket = normalizeBucket(groupBy);
    return runWithTenant(this.prisma, ctx, async (tx) => {
      const rows =
        bucket === "week"
          ? await tx.$queryRaw<{ period: Date; count: bigint }[]>`
              SELECT date_trunc('week', "checkedInAt") AS period, COUNT(*) AS count
              FROM attendance_records
              GROUP BY period ORDER BY period
            `
          : await tx.$queryRaw<{ period: Date; count: bigint }[]>`
              SELECT date_trunc('month', "checkedInAt") AS period, COUNT(*) AS count
              FROM attendance_records
              GROUP BY period ORDER BY period
            `;
      return rows.map((r) => ({ period: r.period.toISOString().slice(0, 10), count: Number(r.count) }));
    });
  }

  async givingTrend(ctx: TenantContext, groupBy?: string) {
    const bucket = normalizeBucket(groupBy);
    return runWithTenant(this.prisma, ctx, async (tx) => {
      const rows =
        bucket === "week"
          ? await tx.$queryRaw<{ period: Date; total: string }[]>`
              SELECT date_trunc('week', "givenAt") AS period, SUM(amount) AS total
              FROM giving_records
              GROUP BY period ORDER BY period
            `
          : await tx.$queryRaw<{ period: Date; total: string }[]>`
              SELECT date_trunc('month', "givenAt") AS period, SUM(amount) AS total
              FROM giving_records
              GROUP BY period ORDER BY period
            `;
      return rows.map((r) => ({ period: r.period.toISOString().slice(0, 10), total: Number(r.total) }));
    });
  }

  async givingByCategory(ctx: TenantContext) {
    return runWithTenant(this.prisma, ctx, async (tx) => {
      const rows = await tx.givingRecord.groupBy({ by: ["categoryId"], _sum: { amount: true } });
      const categories = await tx.givingCategory.findMany({ select: { id: true, name: true } });
      const nameOf = new Map(categories.map((c) => [c.id, c.name]));
      return rows
        .map((r) => ({ categoryId: r.categoryId, name: nameOf.get(r.categoryId) ?? "—", total: Number(r._sum.amount ?? 0) }))
        .sort((a, b) => b.total - a.total);
    });
  }

  async givingByFund(ctx: TenantContext) {
    return runWithTenant(this.prisma, ctx, async (tx) => {
      const rows = await tx.givingRecord.groupBy({ by: ["fundId"], _sum: { amount: true } });
      const funds = await tx.fund.findMany({ select: { id: true, name: true } });
      const nameOf = new Map(funds.map((f) => [f.id, f.name]));
      return rows
        .map((r) => ({ fundId: r.fundId, name: r.fundId ? nameOf.get(r.fundId) ?? "—" : "Undesignated", total: Number(r._sum.amount ?? 0) }))
        .sort((a, b) => b.total - a.total);
    });
  }

  /** A member's own running giving statement -- ordered oldest-first so the
   * running total reads the way a bank/church statement would. */
  async memberStatement(ctx: TenantContext, memberId: string) {
    if (!ctx.organizationId) throw new ForbiddenException("Only an organization member can do that");
    return runWithTenant(this.prisma, ctx, async (tx) => {
      const [member, records] = await Promise.all([
        tx.member.findUnique({ where: { id: memberId }, select: { id: true, fullName: true } }),
        tx.givingRecord.findMany({
          where: { memberId },
          orderBy: { givenAt: "asc" },
          include: { category: { select: { id: true, name: true } }, fund: { select: { id: true, name: true } } },
        }),
      ]);
      let running = 0;
      const lines = records.map((r) => {
        running += Number(r.amount);
        return { ...r, runningTotal: running };
      });
      return { member, lines, total: running };
    });
  }

  /** Same running-balance idea, scoped to a Fund instead of a member --
   * "how much has actually landed in the Building Fund, and from what." */
  async fundStatement(ctx: TenantContext, fundId: string) {
    return runWithTenant(this.prisma, ctx, async (tx) => {
      const [fund, records] = await Promise.all([
        tx.fund.findUnique({ where: { id: fundId } }),
        tx.givingRecord.findMany({
          where: { fundId },
          orderBy: { givenAt: "asc" },
          include: { category: { select: { id: true, name: true } }, member: { select: { id: true, fullName: true } } },
        }),
      ]);
      let running = 0;
      const lines = records.map((r) => {
        running += Number(r.amount);
        return { ...r, runningTotal: running };
      });
      return { fund, lines, total: running };
    });
  }

  /** Per fellowship leader (the User who submitted the report, not
   * necessarily the Member tagged as the fellowship's ministry leader):
   * submission volume, average attendance, and how much of their reported
   * giving actually held up under finance review -- the closest thing to
   * "leader performance" this dataset supports today. */
  async fellowshipLeaderboard(ctx: TenantContext) {
    return runWithTenant(this.prisma, ctx, async (tx) => {
      const reports = await tx.fellowshipReport.findMany({
        include: { submittedBy: { select: { id: true, fullName: true } }, fellowship: { select: { id: true, name: true } } },
      });
      const byLeader = new Map<
        string,
        {
          leaderId: string;
          leaderName: string;
          fellowships: Set<string>;
          reportsSubmitted: number;
          approved: number;
          rejected: number;
          pending: number;
          totalAttendance: number;
          givingReported: number;
          givingApproved: number;
        }
      >();
      for (const r of reports) {
        const key = r.submittedById;
        if (!byLeader.has(key)) {
          byLeader.set(key, {
            leaderId: key,
            leaderName: r.submittedBy?.fullName ?? "—",
            fellowships: new Set(),
            reportsSubmitted: 0,
            approved: 0,
            rejected: 0,
            pending: 0,
            totalAttendance: 0,
            givingReported: 0,
            givingApproved: 0,
          });
        }
        const agg = byLeader.get(key)!;
        agg.fellowships.add(r.fellowship.name);
        agg.reportsSubmitted += 1;
        agg.totalAttendance += r.attendanceCount;
        if (r.givingAmount) agg.givingReported += Number(r.givingAmount);
        if (r.financeStatus === "APPROVED") {
          agg.approved += 1;
          if (r.givingAmount) agg.givingApproved += Number(r.givingAmount);
        } else if (r.financeStatus === "REJECTED") agg.rejected += 1;
        else agg.pending += 1;
      }
      return Array.from(byLeader.values())
        .map((a) => ({
          leaderId: a.leaderId,
          leaderName: a.leaderName,
          fellowships: Array.from(a.fellowships),
          reportsSubmitted: a.reportsSubmitted,
          approved: a.approved,
          rejected: a.rejected,
          pending: a.pending,
          averageAttendance: Math.round((a.totalAttendance / a.reportsSubmitted) * 10) / 10,
          givingReported: a.givingReported,
          givingApproved: a.givingApproved,
        }))
        .sort((a, b) => b.reportsSubmitted - a.reportsSubmitted);
    });
  }
}
