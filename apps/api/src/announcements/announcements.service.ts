import { ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { runWithTenant, TenantContext } from "../prisma/tenant";
import { NotificationsService } from "../notifications/notifications.service";
import { CreateAnnouncementDto } from "./dto/create-announcement.dto";

function describeAudience(dto: CreateAnnouncementDto, branchName?: string): string {
  if (dto.targetRole) return `Everyone with the ${dto.targetRole.replace(/_/g, " ").toLowerCase()} role`;
  if (dto.targetBranchId) return `Everyone at ${branchName ?? "one branch"}`;
  return "Everyone with a login";
}

@Injectable()
export class AnnouncementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Reaches logged-in staff Users only -- there's no SMS/email/WhatsApp
   * provider wired up (Section 8's fast-follow), so this can't reach the
   * congregation (Members) directly, only whoever has a portal account. */
  async broadcast(ctx: TenantContext, senderId: string, dto: CreateAnnouncementDto) {
    if (!ctx.organizationId) throw new ForbiddenException("Only an organization member can do that");
    return runWithTenant(this.prisma, ctx, async (tx) => {
      const branch = dto.targetBranchId ? await tx.branch.findUnique({ where: { id: dto.targetBranchId } }) : null;

      const recipients = await tx.user.findMany({
        where: {
          organizationId: ctx.organizationId as string,
          isActive: true,
          id: { not: senderId },
          ...(dto.targetRole ? { role: dto.targetRole } : {}),
          ...(dto.targetBranchId ? { branchId: dto.targetBranchId } : {}),
        },
        select: { id: true },
      });

      const announcement = await tx.announcement.create({
        data: {
          organizationId: ctx.organizationId as string,
          senderId,
          message: dto.message,
          link: dto.link,
          audienceLabel: describeAudience(dto, branch?.name),
          recipientCount: recipients.length,
        },
        include: { sender: { select: { id: true, fullName: true } } },
      });

      await this.notifications.notifyWithinTx(
        tx,
        ctx.organizationId as string,
        recipients.map((r) => r.id),
        "ANNOUNCEMENT",
        dto.message,
        dto.link,
      );

      return announcement;
    });
  }

  async list(ctx: TenantContext) {
    return runWithTenant(this.prisma, ctx, (tx) =>
      tx.announcement.findMany({
        orderBy: { createdAt: "desc" },
        include: { sender: { select: { id: true, fullName: true } } },
      }),
    );
  }
}
