import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { DeletionRequestStatus } from "@life-mmp/shared";
import { PrismaService } from "../prisma/prisma.service";
import { runWithTenant, TenantContext } from "../prisma/tenant";
import { NotificationsService } from "../notifications/notifications.service";
import { CreateDeletionRequestDto, DeletableEntityType } from "./dto/create-deletion-request.dto";

const INCLUDE = {
  requestedBy: { select: { id: true, fullName: true } },
  reviewedBy: { select: { id: true, fullName: true } },
} as const;

@Injectable()
export class DeletionRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Filing a request is not a delete -- everyone in the org can ask for
   * something to go; only an appointed approver can actually make it happen. */
  async create(ctx: TenantContext, requestedById: string, dto: CreateDeletionRequestDto) {
    if (!ctx.organizationId) throw new ForbiddenException("Only an organization member can do that");
    return runWithTenant(this.prisma, ctx, async (tx) => {
      const request = await tx.deletionRequest.create({
        data: { organizationId: ctx.organizationId as string, requestedById, ...dto },
        include: INCLUDE,
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
        "DELETION_REQUESTED",
        `${request.requestedBy?.fullName ?? "Someone"} asked to delete "${request.entityLabel}" -- review it.`,
        "/deletion-requests",
      );
      return request;
    });
  }

  async list(ctx: TenantContext) {
    return runWithTenant(this.prisma, ctx, (tx) =>
      tx.deletionRequest.findMany({ orderBy: { createdAt: "desc" }, include: INCLUDE }),
    );
  }

  private async assertReviewerIsApprover(tx: any, reviewerId: string) {
    const reviewer = await tx.user.findUnique({ where: { id: reviewerId } });
    // Re-checked fresh from the DB, not trusted off the session cookie --
    // an admin revoking approver status has to take effect immediately.
    if (!reviewer || (!reviewer.isDeletionApprover && reviewer.role !== "ORG_ADMIN")) {
      throw new ForbiddenException("You're not appointed as a deletion approver");
    }
  }

  async approve(ctx: TenantContext, id: string, reviewerId: string) {
    return runWithTenant(this.prisma, ctx, async (tx) => {
      await this.assertReviewerIsApprover(tx, reviewerId);
      const request = await tx.deletionRequest.findUnique({ where: { id } });
      if (!request) throw new NotFoundException("Deletion request not found");
      if (request.status !== DeletionRequestStatus.PENDING) {
        throw new ForbiddenException("This request was already reviewed");
      }
      if (request.requestedById === reviewerId) {
        // Maker-checker's whole point: the person who asked for it isn't
        // the person who can wave it through.
        throw new ForbiddenException("You can't approve your own deletion request");
      }

      await this.performDelete(tx, request.entityType as DeletableEntityType, request.entityId);

      const updated = await tx.deletionRequest.update({
        where: { id },
        data: { status: DeletionRequestStatus.APPROVED, reviewedById: reviewerId, reviewedAt: new Date() },
        include: INCLUDE,
      });
      await this.notifications.notifyWithinTx(
        tx,
        updated.organizationId,
        [updated.requestedById],
        "DELETION_APPROVED",
        `Your request to delete "${updated.entityLabel}" was approved.`,
        "/deletion-requests",
      );
      return updated;
    });
  }

  async reject(ctx: TenantContext, id: string, reviewerId: string) {
    return runWithTenant(this.prisma, ctx, async (tx) => {
      await this.assertReviewerIsApprover(tx, reviewerId);
      const request = await tx.deletionRequest.findUnique({ where: { id } });
      if (!request) throw new NotFoundException("Deletion request not found");
      if (request.status !== DeletionRequestStatus.PENDING) {
        throw new ForbiddenException("This request was already reviewed");
      }
      const updated = await tx.deletionRequest.update({
        where: { id },
        data: { status: DeletionRequestStatus.REJECTED, reviewedById: reviewerId, reviewedAt: new Date() },
        include: INCLUDE,
      });
      await this.notifications.notifyWithinTx(
        tx,
        updated.organizationId,
        [updated.requestedById],
        "DELETION_REJECTED",
        `Your request to delete "${updated.entityLabel}" was rejected.`,
        "/deletion-requests",
      );
      return updated;
    });
  }

  private async performDelete(tx: any, entityType: DeletableEntityType, entityId: string) {
    switch (entityType) {
      case "member":
        await tx.member.delete({ where: { id: entityId } });
        return;
      case "household":
        await tx.household.delete({ where: { id: entityId } });
        return;
      case "fellowship":
        await tx.fellowship.delete({ where: { id: entityId } });
        return;
      case "orgUnit":
        await tx.orgUnit.delete({ where: { id: entityId } });
        return;
      default:
        // Unreachable while DELETABLE_ENTITY_TYPES only lists "member" --
        // the DTO's @IsIn already rejects anything else before this runs.
        throw new Error(`No delete handler registered for entity type "${entityType}"`);
    }
  }
}
