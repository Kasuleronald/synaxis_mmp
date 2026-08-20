import { Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import type { SessionUser } from "@life-mmp/shared";
import { SessionAuthGuard } from "../auth/guards/session-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { tenantContextFor } from "../auth/tenant-context";
import { NotificationsService } from "./notifications.service";

@Controller("notifications")
@UseGuards(SessionAuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: SessionUser) {
    return this.notifications.list(tenantContextFor(user), user.id);
  }

  @Get("unread-count")
  unreadCount(@CurrentUser() user: SessionUser) {
    return this.notifications.unreadCount(tenantContextFor(user), user.id);
  }

  @Post(":id/read")
  markRead(@CurrentUser() user: SessionUser, @Param("id") id: string) {
    return this.notifications.markRead(tenantContextFor(user), user.id, id);
  }

  @Post("read-all")
  markAllRead(@CurrentUser() user: SessionUser) {
    return this.notifications.markAllRead(tenantContextFor(user), user.id);
  }
}
