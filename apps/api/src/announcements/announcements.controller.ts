import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { Role, SessionUser } from "@life-mmp/shared";
import { SessionAuthGuard } from "../auth/guards/session-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { tenantContextFor } from "../auth/tenant-context";
import { CreateAnnouncementDto } from "./dto/create-announcement.dto";
import { Audit } from "../audit-log/audit.decorator";
import { AnnouncementsService } from "./announcements.service";

@Controller("announcements")
@UseGuards(SessionAuthGuard, RolesGuard)
export class AnnouncementsController {
  constructor(private readonly announcements: AnnouncementsService) {}

  @Post()
  @Roles(Role.ORG_ADMIN)
  @Audit({ action: "ANNOUNCEMENT_BROADCAST", entityType: "announcement", labelFields: ["message"] })
  broadcast(@CurrentUser() user: SessionUser, @Body() dto: CreateAnnouncementDto) {
    return this.announcements.broadcast(tenantContextFor(user), user.id, dto);
  }

  @Get()
  list(@CurrentUser() user: SessionUser) {
    return this.announcements.list(tenantContextFor(user));
  }
}
