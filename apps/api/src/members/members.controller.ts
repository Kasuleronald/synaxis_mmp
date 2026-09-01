import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import type { SessionUser } from "@life-mmp/shared";
import { SessionAuthGuard } from "../auth/guards/session-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { branchScopeFor, tenantContextFor } from "../auth/tenant-context";
import { Audit } from "../audit-log/audit.decorator";
import { CreateMemberDto } from "./dto/create-member.dto";
import { UpdateMemberDto } from "./dto/update-member.dto";
import { MembersService } from "./members.service";

@Controller("members")
@UseGuards(SessionAuthGuard)
export class MembersController {
  constructor(private readonly members: MembersService) {}

  @Post()
  @Audit({ action: "MEMBER_CREATED", entityType: "member" })
  create(@CurrentUser() user: SessionUser, @Body() dto: CreateMemberDto) {
    return this.members.create(tenantContextFor(user), dto, user.id);
  }

  @Get()
  list(@CurrentUser() user: SessionUser, @Query("q") q?: string) {
    return this.members.list(tenantContextFor(user), q, branchScopeFor(user));
  }

  @Get(":id")
  get(@CurrentUser() user: SessionUser, @Param("id") id: string) {
    return this.members.get(tenantContextFor(user), id);
  }

  @Patch(":id")
  @Audit({ action: "MEMBER_UPDATED", entityType: "member" })
  update(@CurrentUser() user: SessionUser, @Param("id") id: string, @Body() dto: UpdateMemberDto) {
    return this.members.update(tenantContextFor(user), id, dto);
  }
}
