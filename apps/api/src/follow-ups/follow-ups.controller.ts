import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import type { SessionUser } from "@life-mmp/shared";
import { FollowUpStatus } from "@life-mmp/shared";
import { SessionAuthGuard } from "../auth/guards/session-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { tenantContextFor } from "../auth/tenant-context";
import { CreateFollowUpDto } from "./dto/create-follow-up.dto";
import { UpdateFollowUpDto } from "./dto/update-follow-up.dto";
import { FollowUpsService } from "./follow-ups.service";

@Controller("follow-ups")
@UseGuards(SessionAuthGuard)
export class FollowUpsController {
  constructor(private readonly followUps: FollowUpsService) {}

  @Post()
  create(@CurrentUser() user: SessionUser, @Body() dto: CreateFollowUpDto) {
    return this.followUps.create(tenantContextFor(user), dto);
  }

  @Get()
  list(@CurrentUser() user: SessionUser, @Query("status") status?: FollowUpStatus) {
    return this.followUps.list(tenantContextFor(user), status);
  }

  @Patch(":id")
  update(@CurrentUser() user: SessionUser, @Param("id") id: string, @Body() dto: UpdateFollowUpDto) {
    return this.followUps.update(tenantContextFor(user), id, dto);
  }
}
