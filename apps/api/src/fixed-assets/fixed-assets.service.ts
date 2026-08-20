import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { runWithTenant, TenantContext } from "../prisma/tenant";
import { NotificationsService } from "../notifications/notifications.service";
import { CreateFixedAssetDto } from "./dto/create-fixed-asset.dto";
import { UpdateFixedAssetDto } from "./dto/update-fixed-asset.dto";
import { CreateConditionRequestDto } from "./dto/create-condition-request.dto";
import { RespondConditionRequestDto } from "./dto/respond-condition-request.dto";
import { CreateFixedAssetEditRequestDto } from "./dto/create-fixed-asset-edit-request.dto";

const REQUEST_INCLUDE = {
  requestedBy: { select: { id: true, fullName: true } },
  respondedBy: { select: { id: true, fullName: true } },
  photos: { include: { asset: { select: { id: true, name: true, mimeType: true } } } },
} as const;

const EDIT_REQUEST_INCLUDE = {
  requestedBy: { select: { id: true, fullName: true } },
  reviewedBy: { select: { id: true, fullName: true } },
} as const;

/** Straight-line: value falls linearly by `rate`% of the original cost each
 * year, floored at 0 -- land (no rate set) simply never depreciates. */
function currentValue(cost: number, ratePercent: number | null, acquisitionDate: Date): number {
  if (!ratePercent) return cost;
  const years = (Date.now() - acquisitionDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  const remaining = cost * (1 - (ratePercent / 100) * years);
  return Math.max(0, Math.round(remaining * 100) / 100);
}

@Injectable()
export class FixedAssetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(ctx: TenantContext, dto: CreateFixedAssetDto, createdById: string) {
    if (!ctx.organizationId) throw new ForbiddenException("Only an organization member can do that");
    return runWithTenant(this.prisma, ctx, async (tx) => {
      let currency = dto.currency;
      if (!currency) {
        const org = await tx.organization.findUnique({ where: { id: ctx.organizationId as string }, select: { currency: true } });
        currency = org?.currency ?? "UGX";
      }
      const asset = await tx.fixedAsset.create({
        data: {
          organizationId: ctx.organizationId as string,
          branchId: dto.branchId,
          name: dto.name,
          category: dto.category,
          description: dto.description,
          acquisitionDate: new Date(dto.acquisitionDate),
          acquisitionCost: dto.acquisitionCost,
          currency,
          depreciationRatePercent: dto.depreciationRatePercent,
          conditionAtAcquisition: dto.conditionAtAcquisition,
          currentCondition: dto.conditionAtAcquisition,
          createdById,
        },
      });
      return { ...asset, currentValue: Number(asset.acquisitionCost) };
    });
  }

  /** Applies an already-approved change -- never called directly from a
   * controller route; only `approveEditRequest` below reaches this. */
  private async update(ctx: TenantContext, id: string, dto: UpdateFixedAssetDto) {
    return runWithTenant(this.prisma, ctx, (tx) =>
      tx.fixedAsset.update({
        where: { id },
        data: { ...dto, acquisitionDate: dto.acquisitionDate ? new Date(dto.acquisitionDate) : undefined },
      }),
    );
  }

  async list(ctx: TenantContext) {
    const assets = await runWithTenant(this.prisma, ctx, (tx) =>
      tx.fixedAsset.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          branch: { select: { id: true, name: true } },
          _count: { select: { conditionRequests: true } },
        },
      }),
    );
    return assets.map((a) => ({
      ...a,
      currentValue: currentValue(Number(a.acquisitionCost), a.depreciationRatePercent, a.acquisitionDate),
    }));
  }

  async get(ctx: TenantContext, id: string) {
    const asset = await runWithTenant(this.prisma, ctx, (tx) =>
      tx.fixedAsset.findUnique({
        where: { id },
        include: {
          branch: { select: { id: true, name: true } },
          conditionRequests: { orderBy: { createdAt: "desc" }, include: REQUEST_INCLUDE },
        },
      }),
    );
    if (!asset) return null;
    return { ...asset, currentValue: currentValue(Number(asset.acquisitionCost), asset.depreciationRatePercent, asset.acquisitionDate) };
  }

  async remove(ctx: TenantContext, id: string) {
    await runWithTenant(this.prisma, ctx, (tx) => tx.fixedAsset.delete({ where: { id } }));
  }

  /** The review inbox -- every condition request across every asset, newest
   * first, so a branch pastor (or the Senior Pastor checking on responses)
   * has one place to work from instead of opening each asset individually. */
  async listConditionRequests(ctx: TenantContext) {
    return runWithTenant(this.prisma, ctx, (tx) =>
      tx.assetConditionRequest.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          ...REQUEST_INCLUDE,
          fixedAsset: { select: { id: true, name: true, category: true, branch: { select: { id: true, name: true } } } },
        },
      }),
    );
  }

  /** Senior Pastor/Admin asks "what's the state of this" -- notifies
   * whoever's assigned to the asset's branch (or every Org Admin, if the
   * asset isn't tied to one branch specifically). */
  async createConditionRequest(ctx: TenantContext, fixedAssetId: string, dto: CreateConditionRequestDto, requestedById: string) {
    if (!ctx.organizationId) throw new ForbiddenException("Only an organization member can do that");
    return runWithTenant(this.prisma, ctx, async (tx) => {
      const asset = await tx.fixedAsset.findUnique({ where: { id: fixedAssetId } });
      if (!asset) throw new NotFoundException("Asset not found");

      const request = await tx.assetConditionRequest.create({
        data: {
          organizationId: ctx.organizationId as string,
          fixedAssetId,
          requestedById,
          message: dto.message,
        },
        include: REQUEST_INCLUDE,
      });

      const recipients = await tx.user.findMany({
        where: {
          organizationId: ctx.organizationId as string,
          id: { not: requestedById },
          OR: asset.branchId ? [{ branchId: asset.branchId }, { role: "ORG_ADMIN" }] : [{ role: "ORG_ADMIN" }],
        },
        select: { id: true },
      });
      await this.notifications.notifyWithinTx(
        tx,
        ctx.organizationId as string,
        recipients.map((r) => r.id),
        "ASSET_CONDITION_REQUESTED",
        `${request.requestedBy?.fullName ?? "Someone"} asked for the current state of "${asset.name}".`,
        "/fixed-assets",
      );

      return request;
    });
  }

  async respondToConditionRequest(ctx: TenantContext, requestId: string, dto: RespondConditionRequestDto, respondedById: string) {
    return runWithTenant(this.prisma, ctx, async (tx) => {
      const request = await tx.assetConditionRequest.findUnique({ where: { id: requestId } });
      if (!request) throw new NotFoundException("Request not found");
      if (request.status !== "PENDING") throw new ForbiddenException("This request was already answered");

      const updated = await tx.assetConditionRequest.update({
        where: { id: requestId },
        data: {
          status: "RESPONDED",
          respondedById,
          responseCondition: dto.condition,
          responseDescription: dto.description,
          respondedAt: new Date(),
          photos: dto.photoAssetIds?.length
            ? { create: dto.photoAssetIds.map((assetId) => ({ assetId })) }
            : undefined,
        },
        include: REQUEST_INCLUDE,
      });

      // The asset's currentCondition is always its latest confirmed report.
      await tx.fixedAsset.update({ where: { id: request.fixedAssetId }, data: { currentCondition: dto.condition } });

      await this.notifications.notifyWithinTx(
        tx,
        updated.organizationId,
        [request.requestedById],
        "ASSET_CONDITION_RESPONDED",
        `${updated.respondedBy?.fullName ?? "Someone"} responded to your condition check.`,
        "/fixed-assets",
      );

      return updated;
    });
  }

  // --- Edit requests (maker-checker on the register itself) ---------------

  /** Filing an edit is not an edit -- it proposes one. Only an appointed
   * approver (isDeletionApprover or ORG_ADMIN, the same reviewer gate the
   * deletion-request flow uses) can make it real. */
  async createEditRequest(ctx: TenantContext, fixedAssetId: string, dto: CreateFixedAssetEditRequestDto, requestedById: string) {
    if (!ctx.organizationId) throw new ForbiddenException("Only an organization member can do that");
    return runWithTenant(this.prisma, ctx, async (tx) => {
      const asset = await tx.fixedAsset.findUnique({ where: { id: fixedAssetId } });
      if (!asset) throw new NotFoundException("Asset not found");

      const { note, ...proposedChanges } = dto;
      const request = await tx.fixedAssetEditRequest.create({
        data: {
          organizationId: ctx.organizationId as string,
          fixedAssetId,
          requestedById,
          proposedChanges,
          note,
        },
        include: EDIT_REQUEST_INCLUDE,
      });

      const approvers = await tx.user.findMany({
        where: {
          organizationId: ctx.organizationId as string,
          id: { not: requestedById },
          OR: [{ isDeletionApprover: true }, { role: "ORG_ADMIN" }],
        },
        select: { id: true },
      });
      await this.notifications.notifyWithinTx(
        tx,
        request.organizationId,
        approvers.map((a) => a.id),
        "FIXED_ASSET_EDIT_REQUESTED",
        `${request.requestedBy?.fullName ?? "Someone"} proposed a change to "${asset.name}" -- review it.`,
        "/fixed-assets",
      );
      return request;
    });
  }

  async listEditRequests(ctx: TenantContext) {
    return runWithTenant(this.prisma, ctx, (tx) =>
      tx.fixedAssetEditRequest.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          ...EDIT_REQUEST_INCLUDE,
          fixedAsset: { select: { id: true, name: true, category: true, branch: { select: { id: true, name: true } } } },
        },
      }),
    );
  }

  private async assertReviewerIsApprover(tx: any, reviewerId: string) {
    const reviewer = await tx.user.findUnique({ where: { id: reviewerId } });
    if (!reviewer || (!reviewer.isDeletionApprover && reviewer.role !== "ORG_ADMIN")) {
      throw new ForbiddenException("You're not appointed as an approver");
    }
  }

  async approveEditRequest(ctx: TenantContext, id: string, reviewerId: string) {
    return runWithTenant(this.prisma, ctx, async (tx) => {
      await this.assertReviewerIsApprover(tx, reviewerId);
      const request = await tx.fixedAssetEditRequest.findUnique({ where: { id } });
      if (!request) throw new NotFoundException("Edit request not found");
      if (request.status !== "PENDING") throw new ForbiddenException("This request was already reviewed");
      if (request.requestedById === reviewerId) {
        throw new ForbiddenException("You can't approve your own edit request");
      }

      const changes = request.proposedChanges as Record<string, unknown>;
      await tx.fixedAsset.update({
        where: { id: request.fixedAssetId },
        data: { ...changes, acquisitionDate: changes.acquisitionDate ? new Date(changes.acquisitionDate as string) : undefined },
      });

      const updated = await tx.fixedAssetEditRequest.update({
        where: { id },
        data: { status: "APPROVED", reviewedById: reviewerId, reviewedAt: new Date() },
        include: EDIT_REQUEST_INCLUDE,
      });
      await this.notifications.notifyWithinTx(
        tx,
        updated.organizationId,
        [updated.requestedById],
        "FIXED_ASSET_EDIT_APPROVED",
        `Your proposed change was approved and applied.`,
        "/fixed-assets",
      );
      return updated;
    });
  }

  async rejectEditRequest(ctx: TenantContext, id: string, reviewerId: string) {
    return runWithTenant(this.prisma, ctx, async (tx) => {
      await this.assertReviewerIsApprover(tx, reviewerId);
      const request = await tx.fixedAssetEditRequest.findUnique({ where: { id } });
      if (!request) throw new NotFoundException("Edit request not found");
      if (request.status !== "PENDING") throw new ForbiddenException("This request was already reviewed");

      const updated = await tx.fixedAssetEditRequest.update({
        where: { id },
        data: { status: "REJECTED", reviewedById: reviewerId, reviewedAt: new Date() },
        include: EDIT_REQUEST_INCLUDE,
      });
      await this.notifications.notifyWithinTx(
        tx,
        updated.organizationId,
        [updated.requestedById],
        "FIXED_ASSET_EDIT_REJECTED",
        `Your proposed change was rejected.`,
        "/fixed-assets",
      );
      return updated;
    });
  }
}
