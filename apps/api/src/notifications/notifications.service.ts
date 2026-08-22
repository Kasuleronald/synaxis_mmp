import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { runWithTenant, TenantContext } from "../prisma/tenant";
import { EmailService } from "../email/email.service";

function humanizeType(type: string): string {
  return type.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

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

    // Fire-and-forget: emails are a best-effort mirror of the in-app
    // notification, never a condition of it -- a slow or failed SMTP send
    // must not delay or roll back the transaction that triggered it.
    const recipients = await tx.user.findMany({
      where: { id: { in: uniqueIds } },
      select: { email: true },
    });
    const url = link ? `${process.env.WEB_ORIGIN ?? ""}${link}` : undefined;
    const body = url ? `${message}\n\n${url}` : message;
    const subject = `Synaxis MMP: ${humanizeType(type)}`;
    for (const { email } of recipients) {
      this.email.send(email, subject, body);
    }
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
