import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { runWithTenant, TenantContext } from "../prisma/tenant";
import { NotificationsService } from "../notifications/notifications.service";
import { CreateGivingCategoryDto } from "./dto/create-giving-category.dto";
import { RenameGivingCategoryDto } from "./dto/rename-giving-category.dto";
import { CreateGivingRecordDto } from "./dto/create-giving-record.dto";
import { CreateFundDto } from "./dto/create-fund.dto";
import { UpdateFundDto } from "./dto/update-fund.dto";
import { CreateVendorDto } from "./dto/create-vendor.dto";
import { UpdateVendorDto } from "./dto/update-vendor.dto";
import { CreatePledgeDto } from "./dto/create-pledge.dto";
import { UpdatePledgeDto } from "./dto/update-pledge.dto";
import { CreateGivingBatchDto } from "./dto/create-giving-batch.dto";
import { UpdateGivingBatchDto } from "./dto/update-giving-batch.dto";

const RECORD_INCLUDE = {
  category: { select: { id: true, name: true } },
  fund: { select: { id: true, name: true } },
  member: { select: { id: true, fullName: true } },
  partner: { select: { id: true, name: true } },
  recordedBy: { select: { id: true, fullName: true } },
} as const;

const PLEDGE_INCLUDE = {
  member: { select: { id: true, fullName: true } },
  partner: { select: { id: true, name: true } },
  fund: { select: { id: true, name: true } },
} as const;

@Injectable()
export class GivingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // --- Categories (hierarchical) -----------------------------------------

  async createCategory(ctx: TenantContext, dto: CreateGivingCategoryDto) {
    if (!ctx.organizationId) throw new ForbiddenException("Only an organization member can do that");
    return runWithTenant(this.prisma, ctx, (tx) =>
      tx.givingCategory.create({
        data: { organizationId: ctx.organizationId as string, name: dto.name, parentId: dto.parentId },
      }),
    );
  }

  /** Flat list, `parentId` included -- the frontend builds the tree itself
   * (Financial Settings' Categories tab) so this stays a single cheap query. */
  async listCategories(ctx: TenantContext) {
    return runWithTenant(this.prisma, ctx, (tx) =>
      tx.givingCategory.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    );
  }

  async renameCategory(ctx: TenantContext, id: string, dto: RenameGivingCategoryDto) {
    return runWithTenant(this.prisma, ctx, (tx) =>
      tx.givingCategory.update({ where: { id }, data: { name: dto.name } }),
    );
  }

  async deactivateCategory(ctx: TenantContext, id: string) {
    return runWithTenant(this.prisma, ctx, (tx) =>
      tx.givingCategory.update({ where: { id }, data: { isActive: false } }),
    );
  }

  // --- Records --------------------------------------------------------------

  async createRecord(ctx: TenantContext, recordedById: string, dto: CreateGivingRecordDto) {
    if (!ctx.organizationId) throw new ForbiddenException("Only an organization member can do that");
    return runWithTenant(this.prisma, ctx, async (tx) => {
      let currency = dto.currency;
      if (!currency) {
        const org = await tx.organization.findUnique({
          where: { id: ctx.organizationId as string },
          select: { currency: true },
        });
        currency = org?.currency ?? "UGX";
      }
      const record = await tx.givingRecord.create({
        data: {
          organizationId: ctx.organizationId as string,
          branchId: dto.branchId,
          categoryId: dto.categoryId,
          fundId: dto.fundId,
          pledgeId: dto.pledgeId,
          batchId: dto.batchId,
          memberId: dto.memberId,
          partnerId: dto.partnerId,
          giverName: dto.giverName,
          amount: dto.amount,
          currency,
          method: dto.method,
          givenAt: dto.givenAt ? new Date(dto.givenAt) : undefined,
          recordedById,
          notes: dto.notes,
        },
        include: RECORD_INCLUDE,
      });

      if (dto.pledgeId) await this.notifyPledgeCreator(tx, record.organizationId, dto.pledgeId, dto.amount, currency);

      return record;
    });
  }

  /** Whoever logged a pledge wants to know when their pledger actually pays
   * something toward it -- partial or full, every giving entry tied to the
   * pledge fires this, since a part-payment is still progress worth seeing. */
  private async notifyPledgeCreator(tx: any, organizationId: string, pledgeId: string, paidAmount: number, currency: string) {
    const pledge = await tx.pledge.findUnique({
      where: { id: pledgeId },
      include: { member: { select: { fullName: true } }, partner: { select: { name: true } } },
    });
    if (!pledge?.createdById) return;
    const fulfilled = await tx.givingRecord.aggregate({ where: { pledgeId }, _sum: { amount: true } });
    const fulfilledAmount = Number(fulfilled._sum.amount ?? 0);
    const pct = Math.min(100, Math.round((fulfilledAmount / Number(pledge.amount)) * 100));
    const pledgerName = pledge.member?.fullName ?? pledge.partner?.name ?? "Someone";
    await this.notifications.notifyWithinTx(
      tx,
      organizationId,
      [pledge.createdById],
      "PLEDGE_PAYMENT_RECEIVED",
      `${pledgerName} paid ${paidAmount} ${currency} toward their pledge -- ${pct}% fulfilled.`,
      "/finance/pledges",
    );
  }

  async listRecords(ctx: TenantContext, from?: string, to?: string, batchId?: string) {
    return runWithTenant(this.prisma, ctx, (tx) =>
      tx.givingRecord.findMany({
        where: {
          ...(from || to
            ? { givenAt: { gte: from ? new Date(from) : undefined, lte: to ? new Date(to) : undefined } }
            : {}),
          ...(batchId ? { batchId } : {}),
        },
        orderBy: { givenAt: "desc" },
        take: batchId ? undefined : 200,
        include: RECORD_INCLUDE,
      }),
    );
  }

  async summary(ctx: TenantContext) {
    if (!ctx.organizationId) throw new ForbiddenException("Only an organization member can do that");
    return runWithTenant(this.prisma, ctx, async (tx) => {
      const org = await tx.organization.findUnique({
        where: { id: ctx.organizationId as string },
        select: { currency: true },
      });

      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      weekStart.setHours(0, 0, 0, 0);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const [weekRecords, monthRecords, categories] = await Promise.all([
        tx.givingRecord.findMany({ where: { givenAt: { gte: weekStart } }, select: { amount: true } }),
        tx.givingRecord.findMany({
          where: { givenAt: { gte: monthStart } },
          select: { amount: true, categoryId: true },
        }),
        tx.givingCategory.findMany({ select: { id: true, name: true } }),
      ]);

      const thisWeekTotal = weekRecords.reduce((sum, r) => sum + Number(r.amount), 0);
      const thisMonthTotal = monthRecords.reduce((sum, r) => sum + Number(r.amount), 0);

      const byCategory = categories
        .map((c) => ({
          categoryId: c.id,
          name: c.name,
          total: monthRecords
            .filter((r) => r.categoryId === c.id)
            .reduce((sum, r) => sum + Number(r.amount), 0),
        }))
        .filter((c) => c.total > 0)
        .sort((a, b) => b.total - a.total);

      return { currency: org?.currency ?? "UGX", thisWeekTotal, thisMonthTotal, byCategory };
    });
  }

  // --- Funds ------------------------------------------------------------

  async createFund(ctx: TenantContext, dto: CreateFundDto) {
    if (!ctx.organizationId) throw new ForbiddenException("Only an organization member can do that");
    return runWithTenant(this.prisma, ctx, (tx) =>
      tx.fund.create({
        data: {
          organizationId: ctx.organizationId as string,
          name: dto.name,
          description: dto.description,
          targetAmount: dto.targetAmount,
          deadlineDate: dto.deadlineDate ? new Date(dto.deadlineDate) : undefined,
        },
      }),
    );
  }

  /** `raisedAmount` is summed from GivingRecords carrying this fundId -- same
   * derived-not-stored reasoning as a Pledge's fulfilledAmount, so the
   * Funds page progress bar can't drift from the actual giving history. */
  async listFunds(ctx: TenantContext) {
    return runWithTenant(this.prisma, ctx, async (tx) => {
      const [funds, raised] = await Promise.all([
        tx.fund.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
        tx.givingRecord.groupBy({ by: ["fundId"], where: { fundId: { not: null } }, _sum: { amount: true } }),
      ]);
      const raisedByFund = new Map(raised.map((r) => [r.fundId as string, Number(r._sum.amount ?? 0)]));
      return funds.map((f) => ({ ...f, raisedAmount: raisedByFund.get(f.id) ?? 0 }));
    });
  }

  async updateFund(ctx: TenantContext, id: string, dto: UpdateFundDto) {
    return runWithTenant(this.prisma, ctx, (tx) =>
      tx.fund.update({
        where: { id },
        data: {
          name: dto.name,
          description: dto.description,
          targetAmount: dto.targetAmount,
          deadlineDate: dto.deadlineDate ? new Date(dto.deadlineDate) : undefined,
        },
      }),
    );
  }

  async deactivateFund(ctx: TenantContext, id: string) {
    return runWithTenant(this.prisma, ctx, (tx) => tx.fund.update({ where: { id }, data: { isActive: false } }));
  }

  // --- Vendors ------------------------------------------------------------

  async createVendor(ctx: TenantContext, dto: CreateVendorDto) {
    if (!ctx.organizationId) throw new ForbiddenException("Only an organization member can do that");
    return runWithTenant(this.prisma, ctx, (tx) =>
      tx.vendor.create({
        data: {
          organizationId: ctx.organizationId as string,
          name: dto.name,
          contactEmail: dto.contactEmail,
          contactPhone: dto.contactPhone,
          notes: dto.notes,
        },
      }),
    );
  }

  async listVendors(ctx: TenantContext) {
    return runWithTenant(this.prisma, ctx, (tx) =>
      tx.vendor.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    );
  }

  async updateVendor(ctx: TenantContext, id: string, dto: UpdateVendorDto) {
    return runWithTenant(this.prisma, ctx, (tx) =>
      tx.vendor.update({
        where: { id },
        data: {
          name: dto.name,
          contactEmail: dto.contactEmail,
          contactPhone: dto.contactPhone,
          notes: dto.notes,
        },
      }),
    );
  }

  async deactivateVendor(ctx: TenantContext, id: string) {
    return runWithTenant(this.prisma, ctx, (tx) => tx.vendor.update({ where: { id }, data: { isActive: false } }));
  }

  // --- Pledges ------------------------------------------------------------

  async createPledge(ctx: TenantContext, createdById: string, dto: CreatePledgeDto) {
    if (!ctx.organizationId) throw new ForbiddenException("Only an organization member can do that");
    if (!dto.memberId === !dto.partnerId) {
      // XOR: both set, or neither -- either way, that's not a valid pledger.
      throw new BadRequestException("A pledge needs exactly one of memberId or partnerId");
    }
    return runWithTenant(this.prisma, ctx, async (tx) => {
      let currency = dto.currency;
      if (!currency) {
        const org = await tx.organization.findUnique({
          where: { id: ctx.organizationId as string },
          select: { currency: true },
        });
        currency = org?.currency ?? "UGX";
      }
      return tx.pledge.create({
        data: {
          organizationId: ctx.organizationId as string,
          memberId: dto.memberId,
          partnerId: dto.partnerId,
          fundId: dto.fundId,
          amount: dto.amount,
          currency,
          frequency: dto.frequency,
          startDate: new Date(dto.startDate),
          endDate: dto.endDate ? new Date(dto.endDate) : undefined,
          notes: dto.notes,
          createdById,
        },
        include: PLEDGE_INCLUDE,
      });
    });
  }

  /** `fulfilledAmount` is summed from GivingRecords carrying this pledgeId --
   * one extra groupBy query, done once for the whole list rather than N+1. */
  async listPledges(ctx: TenantContext) {
    return runWithTenant(this.prisma, ctx, async (tx) => {
      const [pledges, fulfilled] = await Promise.all([
        tx.pledge.findMany({ orderBy: { createdAt: "desc" }, include: PLEDGE_INCLUDE }),
        tx.givingRecord.groupBy({ by: ["pledgeId"], where: { pledgeId: { not: null } }, _sum: { amount: true } }),
      ]);
      const fulfilledByPledge = new Map(fulfilled.map((f) => [f.pledgeId as string, Number(f._sum.amount ?? 0)]));
      return pledges.map((p) => ({ ...p, fulfilledAmount: fulfilledByPledge.get(p.id) ?? 0 }));
    });
  }

  /** Fund/amount/frequency/dates/notes only -- who's pledging isn't
   * editable here (that's a different pledge, not a correction). */
  async updatePledge(ctx: TenantContext, id: string, dto: UpdatePledgeDto) {
    return runWithTenant(this.prisma, ctx, (tx) =>
      tx.pledge.update({
        where: { id },
        data: {
          fundId: dto.fundId,
          amount: dto.amount,
          frequency: dto.frequency,
          startDate: dto.startDate ? new Date(dto.startDate) : undefined,
          endDate: dto.endDate ? new Date(dto.endDate) : undefined,
          notes: dto.notes,
        },
        include: PLEDGE_INCLUDE,
      }),
    );
  }

  /** Manual escape hatch for the auto-archive job below -- an admin decides
   * a lapsed pledge should be given another chance, sets a new end date,
   * and it goes back to being tracked as ACTIVE. */
  async reactivatePledge(ctx: TenantContext, id: string, newEndDate?: string) {
    return runWithTenant(this.prisma, ctx, (tx) =>
      tx.pledge.update({
        where: { id },
        data: { status: "ACTIVE", endDate: newEndDate ? new Date(newEndDate) : undefined },
        include: PLEDGE_INCLUDE,
      }),
    );
  }

  // --- Giving batches -------------------------------------------------------

  async createBatch(ctx: TenantContext, createdById: string, dto: CreateGivingBatchDto) {
    if (!ctx.organizationId) throw new ForbiddenException("Only an organization member can do that");
    return runWithTenant(this.prisma, ctx, async (tx) => {
      let currency = dto.currency;
      if (!currency) {
        const org = await tx.organization.findUnique({
          where: { id: ctx.organizationId as string },
          select: { currency: true },
        });
        currency = org?.currency ?? "UGX";
      }
      return tx.givingBatch.create({
        data: {
          organizationId: ctx.organizationId as string,
          name: dto.name,
          batchDate: new Date(dto.batchDate),
          declaredTotal: dto.declaredTotal,
          currency,
          createdById,
        },
      });
    });
  }

  async listBatches(ctx: TenantContext) {
    return runWithTenant(this.prisma, ctx, async (tx) => {
      const [batches, actuals] = await Promise.all([
        tx.givingBatch.findMany({
          orderBy: { batchDate: "desc" },
          include: { createdBy: { select: { id: true, fullName: true } } },
        }),
        tx.givingRecord.groupBy({
          by: ["batchId"],
          where: { batchId: { not: null } },
          _sum: { amount: true },
          _count: { _all: true },
        }),
      ]);
      const actualByBatch = new Map(actuals.map((a) => [a.batchId as string, a]));
      return batches.map((b) => {
        const actual = actualByBatch.get(b.id);
        const actualTotal = Number(actual?._sum.amount ?? 0);
        return {
          ...b,
          actualTotal,
          recordCount: actual?._count._all ?? 0,
          variance: b.declaredTotal != null ? Number(b.declaredTotal) - actualTotal : null,
        };
      });
    });
  }

  async updateBatch(ctx: TenantContext, id: string, dto: UpdateGivingBatchDto) {
    return runWithTenant(this.prisma, ctx, (tx) =>
      tx.givingBatch.update({
        where: { id },
        data: {
          name: dto.name,
          batchDate: dto.batchDate ? new Date(dto.batchDate) : undefined,
          declaredTotal: dto.declaredTotal,
        },
      }),
    );
  }

  async closeBatch(ctx: TenantContext, id: string) {
    return runWithTenant(this.prisma, ctx, async (tx) => {
      const batch = await tx.givingBatch.findUnique({ where: { id } });
      if (!batch) throw new NotFoundException("Batch not found");
      return tx.givingBatch.update({ where: { id }, data: { status: "CLOSED" } });
    });
  }
}
