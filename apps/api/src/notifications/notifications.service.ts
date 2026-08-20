import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { runWithTenant, TenantContext } from "../prisma/tenant";

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Called from inside another service's own runWithTenant transaction
   * (deletion requests, giving) so the notification commits atomically with
   * whatever triggered it -- takes the already-scoped `tx`, not ctx. */
  async notifyWithinTx(
    tx: any,
    organizationId: string,
    userIds: string[],
    type: string,
    message: string,
    link?: string,
  ) {
    const uniqueIds = [...new Set(userIds)];
    if (uniqueIds.length === 0) return;
    await tx.notification.createMany({
      data: uniqueIds.map((userId) => ({ organizationId, userId, type, message, link })),
    });
  }

  async list(ctx: TenantContext, userId: string) {
    return runWithTenant(this.prisma, ctx, (tx) =>
      tx.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 50 }),
    );
  }

  async unreadCount(ctx: TenantContext, userId: string) {
    return runWithTenant(this.prisma, ctx, (tx) => tx.notification.count({ where: { userId, readAt: null } }));
  }

  async markRead(ctx: TenantContext, userId: string, id: string) {
    return runWithTenant(this.prisma, ctx, (tx) =>
      tx.notification.updateMany({ where: { id, userId }, data: { readAt: new Date() } }),
    );
  }

  async markAllRead(ctx: TenantContext, userId: string) {
    return runWithTenant(this.prisma, ctx, (tx) =>
      tx.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } }),
    );
  }
}
