import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Role } from "@life-mmp/shared";
import { PrismaService } from "../prisma/prisma.service";
import { runWithTenant, TenantContext } from "../prisma/tenant";
import { NotificationsService } from "../notifications/notifications.service";
import { CreateRequisitionDto } from "./dto/create-requisition.dto";
import { ReviewRequisitionDto } from "./dto/review-requisition.dto";
import { CreateAccountabilityDto } from "./dto/create-accountability.dto";

const FINANCE_ROLES: Role[] = [Role.ORG_ADMIN, Role.FINANCE_OFFICER];

const REQUISITION_INCLUDE = {
  requestedBy: { select: { id: true, fullName: true } },
  reviewedBy: { select: { id: true, fullName: true } },
  department: { select: { id: true, name: true } },
  fellowship: { select: { id: true, name: true } },
  accountability: {
    include: {
      submittedBy: { select: { id: true, fullName: true } },
      reviewedBy: { select: { id: true, fullName: true } },
      receipts: { include: { asset: { select: { id: true, name: true, mimeType: true } } } },
    },
  },
} as const;

/** Phase 1 (request/approve) -> Phase 2 (accountability/approve) -- distinct
 * from a straight Giving/expense entry: money is never posted anywhere by
 * this module, it's purely the "ask, then prove how it was spent" record
 * finance reviews. Modeled the same "row holds the ask, another holds the
 * response" shape as AssetConditionRequest and SelfRegistration. */
@Injectable()
export class RequisitionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async createRequisition(ctx: TenantContext, requestedById: string, dto: CreateRequisitionDto) {
    if (!ctx.organizationId) throw new ForbiddenException("Only an organization member can do that");
    return runWithTenant(this.prisma, ctx, async (tx) => {
      let currency = dto.currency;
      if (!currency) {
        const org = await tx.organization.findUnique({ where: { id: ctx.organizationId as string }, select: { currency: true } });
        currency = org?.currency ?? "UGX";
      }
      const requisition = await tx.fundRequisition.create({
        data: {
          organizationId: ctx.organizationId as string,
          requestedById,
          departmentId: dto.departmentId,
          fellowshipId: dto.fellowshipId,
          amount: dto.amount,
          currency,
          reason: dto.reason,
        },
        include: REQUISITION_INCLUDE,
      });

      const reviewers = await tx.user.findMany({
        where: { organizationId: ctx.organizationId as string, role: { in: FINANCE_ROLES }, id: { not: requestedById } },
        select: { id: true },
      });
      await this.notifications.notifyWithinTx(
        tx,
        requisition.organizationId,
        reviewers.map((r) => r.id),
        "REQUISITION_REQUESTED",
        `${requisition.requestedBy?.fullName ?? "Someone"} requested ${currency} ${dto.amount.toLocaleString()} -- "${dto.reason}"`,
        "/finance/requisitions",
      );
      return requisition;
    });
  }

  /** Finance/admins see every requisition (the review inbox); anyone else
   * only ever sees their own asks. */
  async list(ctx: TenantContext, requestingUser: { id: string; role: Role }) {
    const seesAll = FINANCE_ROLES.includes(requestingUser.role);
    return runWithTenant(this.prisma, ctx, (tx) =>
      tx.fundRequisition.findMany({
        where: seesAll ? undefined : { requestedById: requestingUser.id },
        orderBy: { createdAt: "desc" },
        include: REQUISITION_INCLUDE,
      }),
    );
  }

  async approveRequisition(ctx: TenantContext, id: string, reviewerId: string, dto: ReviewRequisitionDto) {
    return runWithTenant(this.prisma, ctx, async (tx) => {
      const requisition = await tx.fundRequisition.findUnique({ where: { id } });
      if (!requisition) throw new NotFoundException("Requisition not found");
      if (requisition.status !== "REQUESTED") throw new ForbiddenException("This requisition was already reviewed");
      if (requisition.requestedById === reviewerId) throw new ForbiddenException("You can't approve your own requisition");

      const updated = await tx.fundRequisition.update({
        where: { id },
        data: { status: "APPROVED", reviewedById: reviewerId, reviewedAt: new Date(), reviewNote: dto.note },
        include: REQUISITION_INCLUDE,
      });
      await this.notifications.notifyWithinTx(
        tx,
        updated.organizationId,
        [updated.requestedById],
        "REQUISITION_APPROVED",
        `Your requisition for ${updated.currency} ${Number(updated.amount).toLocaleString()} was approved.`,
        "/finance/requisitions",
      );
      return updated;
    });
  }

  async rejectRequisition(ctx: TenantContext, id: string, reviewerId: string, dto: ReviewRequisitionDto) {
    return runWithTenant(this.prisma, ctx, async (tx) => {
      const requisition = await tx.fundRequisition.findUnique({ where: { id } });
      if (!requisition) throw new NotFoundException("Requisition not found");
      if (requisition.status !== "REQUESTED") throw new ForbiddenException("This requisition was already reviewed");

      const updated = await tx.fundRequisition.update({
        where: { id },
        data: { status: "REJECTED", reviewedById: reviewerId, reviewedAt: new Date(), reviewNote: dto.note },
        include: REQUISITION_INCLUDE,
      });
      await this.notifications.notifyWithinTx(
        tx,
        updated.organizationId,
        [updated.requestedById],
        "REQUISITION_REJECTED",
        `Your requisition for ${updated.currency} ${Number(updated.amount).toLocaleString()} was rejected.${dto.note ? ` "${dto.note}"` : ""}`,
        "/finance/requisitions",
      );
      return updated;
    });
  }

  /** Only ever filed against an already-APPROVED requisition, by whoever
   * requested it. */
  async submitAccountability(ctx: TenantContext, requisitionId: string, submittedById: string, dto: CreateAccountabilityDto) {
    return runWithTenant(this.prisma, ctx, async (tx) => {
      const requisition = await tx.fundRequisition.findUnique({ where: { id: requisitionId }, include: { accountability: true } });
      if (!requisition) throw new NotFoundException("Requisition not found");
      if (requisition.status !== "APPROVED") throw new ForbiddenException("Only an approved requisition can have an accountability filed against it");
      if (requisition.requestedById !== submittedById) throw new ForbiddenException("Only the person who requested this can account for it");
      if (requisition.accountability) throw new ForbiddenException("An accountability was already filed for this requisition");

      const accountability = await tx.requisitionAccountability.create({
        data: {
          organizationId: ctx.organizationId as string,
          requisitionId,
          submittedById,
          amountSpent: dto.amountSpent,
          description: dto.description,
          receipts: dto.receiptAssetIds?.length ? { create: dto.receiptAssetIds.map((assetId) => ({ assetId })) } : undefined,
        },
      });

      const reviewers = await tx.user.findMany({
        where: { organizationId: ctx.organizationId as string, role: { in: FINANCE_ROLES }, id: { not: submittedById } },
        select: { id: true },
      });
      await this.notifications.notifyWithinTx(
        tx,
        ctx.organizationId as string,
        reviewers.map((r) => r.id),
        "ACCOUNTABILITY_SUBMITTED",
        `${requisition.reason} -- an accountability was filed for review.`,
        "/finance/requisitions",
      );
      return accountability;
    });
  }

  async approveAccountability(ctx: TenantContext, id: string, reviewerId: string, dto: ReviewRequisitionDto) {
    return runWithTenant(this.prisma, ctx, async (tx) => {
      const accountability = await tx.requisitionAccountability.findUnique({ where: { id } });
      if (!accountability) throw new NotFoundException("Accountability not found");
      if (accountability.status !== "PENDING") throw new ForbiddenException("This accountability was already reviewed");
      if (accountability.submittedById === reviewerId) throw new ForbiddenException("You can't approve your own accountability");

      const updated = await tx.requisitionAccountability.update({
        where: { id },
        data: { status: "APPROVED", reviewedById: reviewerId, reviewedAt: new Date(), reviewNote: dto.note },
      });
      await this.notifications.notifyWithinTx(
        tx,
        updated.organizationId,
        [updated.submittedById],
        "ACCOUNTABILITY_APPROVED",
        `Your accountability report was approved.`,
        "/finance/requisitions",
      );
      return updated;
    });
  }

  async rejectAccountability(ctx: TenantContext, id: string, reviewerId: string, dto: ReviewRequisitionDto) {
    return runWithTenant(this.prisma, ctx, async (tx) => {
      const accountability = await tx.requisitionAccountability.findUnique({ where: { id } });
      if (!accountability) throw new NotFoundException("Accountability not found");
      if (accountability.status !== "PENDING") throw new ForbiddenException("This accountability was already reviewed");

      const updated = await tx.requisitionAccountability.update({
        where: { id },
        data: { status: "REJECTED", reviewedById: reviewerId, reviewedAt: new Date(), reviewNote: dto.note },
      });
      await this.notifications.notifyWithinTx(
        tx,
        updated.organizationId,
        [updated.submittedById],
        "ACCOUNTABILITY_REJECTED",
        `Your accountability report was rejected.${dto.note ? ` "${dto.note}"` : ""}`,
        "/finance/requisitions",
      );
      return updated;
    });
  }
}
