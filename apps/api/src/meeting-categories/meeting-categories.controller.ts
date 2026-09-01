import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { Role, SessionUser } from "@life-mmp/shared";
import { SessionAuthGuard } from "../auth/guards/session-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { tenantContextFor } from "../auth/tenant-context";
import { Audit } from "../audit-log/audit.decorator";
import { CreateMeetingCategoryDto } from "./dto/create-meeting-category.dto";
import { UpdateMeetingCategoryDto } from "./dto/update-meeting-category.dto";
import { MeetingCategoriesService } from "./meeting-categories.service";

@Controller("meeting-categories")
@UseGuards(SessionAuthGuard, RolesGuard)
export class MeetingCategoriesController {
  constructor(private readonly categories: MeetingCategoriesService) {}

  @Post()
  @Roles(Role.ORG_ADMIN)
  @Audit({ action: "MEETING_CATEGORY_CREATED", entityType: "meetingCategory" })
  create(@CurrentUser() user: SessionUser, @Body() dto: CreateMeetingCategoryDto) {
    return this.categories.create(tenantContextFor(user), dto);
  }

  @Get()
  list(@CurrentUser() user: SessionUser) {
    // Any org member can see the list -- needed to populate the category
    // dropdown on Attendance/Events, not just the admin screen that manages it.
    return this.categories.list(tenantContextFor(user));
  }

  @Patch(":id")
  @Roles(Role.ORG_ADMIN)
  @Audit({ action: "MEETING_CATEGORY_UPDATED", entityType: "meetingCategory" })
  update(@CurrentUser() user: SessionUser, @Param("id") id: string, @Body() dto: UpdateMeetingCategoryDto) {
    return this.categories.update(tenantContextFor(user), id, dto);
  }
}
