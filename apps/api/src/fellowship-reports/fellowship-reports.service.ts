import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Role } from "@life-mmp/shared";
import { PrismaService } from "../prisma/prisma.service";
import { runWithTenant, TenantContext } from "../prisma/tenant";
import { NotificationsService } from "../notifications/notifications.service";
import { CreateFellowshipReportDto } from "./dto/create-fellowship-report.dto";
import { ApproveFellowshipReportDto } from "./dto/approve-fellowship-report.dto";
import { RejectFellowshipReportDto } from "./dto/reject-fellowship-report.dto";

const FINANCE_ROLES: Role[] = [Role.ORG_ADMIN, Role.FINANCE_OFFICER];

/** DDMMYYYY + a same-day sequence number (e.g. "20082026-1") so a paper
 * receipt from a cell meeting can be matched back to this exact record by
 * hand, and finance can search across every fellowship's reports by ref
 * instead of only browsing one fellowship at a time. */
async function generateRefNumber(tx: any, organizationId: string): Promise<string> {
  const now = new Date();
  const datePart = [
    String(now.getDate()).padStart(2, "0"),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getFullYear()),
  ].join("");
  const todaysCount = await tx.fellowshipReport.count({
    where: { organizationId, refNumber: { startsWith: `${datePart}-` } },
  });
  return `${datePart}-${todaysCount + 1}`;
}

const REPORT_INCLUDE = {
  fellowship: { select: { id: true, name: true } },
  submittedBy: { select: { id: true, fullName: true } },
  financeReviewedBy: { select: { id: true, fullName: true } },
  category: { select: { id: true, name: true } },
  attendees: { include: { member: { select: { id: true, fullName: true } } } },
} as const;

@Injectable()
export class FellowshipReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /** A leader files raw numbers -- attendance, giving, expenses -- none of
   * it touches the ledger yet. Giving only becomes real Giving once finance
   * approves (see `approveFinance`); expenses are recorded here for
   * visibility only, since there's no expense-tracking ledger to post into. */
  async create(ctx: TenantContext, submittedById: string, dto: CreateFellowshipReportDto) {
    if (!ctx.organizationId) throw new ForbiddenException("Only an organization member can do that");
    return runWithTenant(this.prisma, ctx, async (tx) => {
      const fellowship = await tx.fellowship.findUnique({ where: { id: dto.fellowshipId } });
      if (!fellowship) throw new NotFoundException("Fellowship not found");

      let currency = dto.currency;
      if (!currency && dto.givingAmount) {
        const org = await tx.organization.findUnique({ where: { id: ctx.organizationId as string }, select: { currency: true } });
        currency = org?.currency ?? "UGX";
      }

      const refNumber = await generateRefNumber(tx, ctx.organizationId as string);
      const report = await tx.fellowshipReport.create({
        data: {
          organizationId: ctx.organizationId as string,
          fellowshipId: dto.fellowshipId,
          refNumber,
          submittedById,
          meetingDate: new Date(dto.meetingDate),
          attendanceCount: dto.attendanceCount,
          notes: dto.notes,
          givingAmount: dto.givingAmount,
          expensesAmount: dto.expensesAmount,
          expenseNotes: dto.expenseNotes,
          currency,
          categoryId: dto.categoryId,
          attendees: dto.attendeeMemberIds?.length
            ? { create: dto.attendeeMemberIds.map((memberId) => ({ memberId })) }
            : undefined,
        },
        include: REPORT_INCLUDE,
      });

      // Every report goes to the org's general reviewer list -- the admin,
      // whoever's appointed Pastor, and the Fellowships department head
      // (Aug 2026: leaders "report to" that department) -- regardless of
      // whether it carries a giving figure.
      const generalReviewers = await tx.user.findMany({
        where: {
          organizationId: ctx.organizationId as string,
          OR: [{ role: Role.ORG_ADMIN }, { isPastor: true }, { isFellowshipsDepartmentHead: true }],
        },
        select: { id: true },
      });
      await this.notifications.notifyWithinTx(
        tx,
        report.organizationId,
        generalReviewers.map((r) => r.id),
        "FELLOWSHIP_REPORT_SUBMITTED",
        `${report.submittedBy?.fullName ?? "Someone"} submitted a report for "${fellowship.name}".`,
        "/fellowships/reports",
      );

      if (dto.givingAmount) {
        // Finance Officers aren't necessarily Pastors/department heads, so
        // they need their own notice when there's money to review -- Org
        // Admins already got the general one above, so they're excluded
        // here to avoid notifying them twice for the same report.
        const financeReviewers = await tx.user.findMany({
          where: { organizationId: ctx.organizationId as string, role: Role.FINANCE_OFFICER },
          select: { id: true },
        });
        await this.notifications.notifyWithinTx(
          tx,
          report.organizationId,
          financeReviewers.map((r) => r.id),
          "FELLOWSHIP_REPORT_SUBMITTED",
          `${report.submittedBy?.fullName ?? "Someone"} submitted a report for "${fellowship.name}" with giving to review.`,
          "/fellowships/reports",
        );
      }

      return report;
    });
  }

  /** Finance/admins see every report (that's the review inbox, the
   * cross-fellowship ref-number search, and the eventual analytics feed);
   * anyone else only ever sees their own. Filters are all optional and
   * additive -- this is the one endpoint behind both the plain list view
   * and the "find this report by ref/date/fellowship/status" search. */
  async list(
    ctx: TenantContext,
    requestingUser: { id: string; role: Role; isPastor?: boolean; isFellowshipsDepartmentHead?: boolean },
    filters?: { refNumber?: string; fellowshipId?: string; financeStatus?: string; from?: string; to?: string },
  ) {
    const seesAll =
      FINANCE_ROLES.includes(requestingUser.role) ||
      requestingUser.isPastor ||
      requestingUser.isFellowshipsDepartmentHead;
    return runWithTenant(this.prisma, ctx, (tx) =>
      tx.fellowshipReport.findMany({
        where: {
          ...(seesAll ? {} : { submittedById: requestingUser.id }),
          ...(filters?.refNumber ? { refNumber: { contains: filters.refNumber, mode: "insensitive" } } : {}),
          ...(filters?.fellowshipId ? { fellowshipId: filters.fellowshipId } : {}),
          ...(filters?.financeStatus ? { financeStatus: filters.financeStatus as any } : {}),
          ...(filters?.from || filters?.to
            ? {
                meetingDate: {
                  gte: filters?.from ? new Date(filters.from) : undefined,
                  lte: filters?.to ? new Date(filters.to) : undefined,
                },
              }
            : {}),
        },
        orderBy: { meetingDate: "desc" },
        include: REPORT_INCLUDE,
      }),
    );
  }

  async approveFinance(ctx: TenantContext, id: string, reviewerId: string, dto: ApproveFellowshipReportDto) {
    return runWithTenant(this.prisma, ctx, async (tx) => {
      const report = await tx.fellowshipReport.findUnique({ where: { id } });
      if (!report) throw new NotFoundException("Report not found");
      if (report.financeStatus !== "PENDING") throw new ForbiddenException("This report was already reviewed");
      if (report.submittedById === reviewerId) {
        throw new ForbiddenException("You can't approve your own report");
      }

      let givingRecordId: string | undefined;
      if (report.givingAmount) {
        const categoryId = dto.categoryId ?? report.categoryId;
        if (!categoryId) throw new ForbiddenException("Choose a giving category before approving");
        const fellowship = await tx.fellowship.findUnique({ where: { id: report.fellowshipId } });
        const givingRecord = await tx.givingRecord.create({
          data: {
            organizationId: ctx.organizationId as string,
            categoryId,
            fundId: dto.fundId,
            memberId: null,
            giverName: fellowship?.name ?? "Fellowship collection",
            amount: report.givingAmount,
            currency: report.currency ?? "UGX",
            method: dto.method,
            givenAt: report.meetingDate,
            recordedById: reviewerId,
            notes: `From fellowship report submitted ${report.createdAt.toISOString().slice(0, 10)}`,
          },
        });
        givingRecordId = givingRecord.id;
      }

      const updated = await tx.fellowshipReport.update({
        where: { id },
        data: {
          financeStatus: "APPROVED",
          financeReviewedById: reviewerId,
          financeReviewedAt: new Date(),
          financeNote: dto.note,
          categoryId: dto.categoryId ?? report.categoryId,
          givingRecordId,
        },
        include: REPORT_INCLUDE,
      });

      await this.notifications.notifyWithinTx(
        tx,
        updated.organizationId,
        [updated.submittedById],
        "FELLOWSHIP_REPORT_APPROVED",
        `Your report for "${updated.fellowship.name}" was approved.`,
        "/fellowships/reports",
      );
      return updated;
    });
  }

  async rejectFinance(ctx: TenantContext, id: string, reviewerId: string, dto: RejectFellowshipReportDto) {
    return runWithTenant(this.prisma, ctx, async (tx) => {
      const report = await tx.fellowshipReport.findUnique({ where: { id } });
      if (!report) throw new NotFoundException("Report not found");
      if (report.financeStatus !== "PENDING") throw new ForbiddenException("This report was already reviewed");

      const updated = await tx.fellowshipReport.update({
        where: { id },
        data: {
          financeStatus: "REJECTED",
          financeReviewedById: reviewerId,
          financeReviewedAt: new Date(),
          financeNote: dto.note,
        },
        include: REPORT_INCLUDE,
      });

      await this.notifications.notifyWithinTx(
        tx,
        updated.organizationId,
        [updated.submittedById],
        "FELLOWSHIP_REPORT_REJECTED",
        `Your report for "${updated.fellowship.name}" was rejected.${dto.note ? ` "${dto.note}"` : ""}`,
        "/fellowships/reports",
      );
      return updated;
    });
  }
}
