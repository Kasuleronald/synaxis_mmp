import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import type { SessionUser } from "@life-mmp/shared";
import { SessionAuthGuard } from "../auth/guards/session-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { tenantContextFor } from "../auth/tenant-context";
import { CreateMemberDto } from "./dto/create-member.dto";
import { UpdateMemberDto } from "./dto/update-member.dto";
import { MembersService } from "./members.service";

@Controller("members")
@UseGuards(SessionAuthGuard)
export class MembersController {
  constructor(private readonly members: MembersService) {}

  @Post()
  create(@CurrentUser() user: SessionUser, @Body() dto: CreateMemberDto) {
    return this.members.create(tenantContextFor(user), dto, user.id);
  }

  @Get()
  list(@CurrentUser() user: SessionUser, @Query("q") q?: string) {
    return this.members.list(tenantContextFor(user), q);
  }

  @Get(":id")
  get(@CurrentUser() user: SessionUser, @Param("id") id: string) {
    return this.members.get(tenantContextFor(user), id);
  }

  @Patch(":id")
  update(@CurrentUser() user: SessionUser, @Param("id") id: string, @Body() dto: UpdateMemberDto) {
    return this.members.update(tenantContextFor(user), id, dto);
  }
}
