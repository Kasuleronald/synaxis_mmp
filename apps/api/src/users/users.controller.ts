import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { Role, SessionUser } from "@life-mmp/shared";
import { SessionAuthGuard } from "../auth/guards/session-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { tenantContextFor } from "../auth/tenant-context";
import { Audit } from "../audit-log/audit.decorator";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UpdateAvatarDto } from "./dto/update-avatar.dto";
import { UsersService } from "./users.service";

@Controller("users")
@UseGuards(SessionAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Post()
  @Roles(Role.ORG_ADMIN)
  @Audit({ action: "STAFF_INVITED", entityType: "user" })
  create(@CurrentUser() user: SessionUser, @Body() dto: CreateUserDto) {
    return this.users.create(tenantContextFor(user), dto);
  }

  @Get()
  @Roles(Role.ORG_ADMIN)
  list(@CurrentUser() user: SessionUser) {
    return this.users.list(tenantContextFor(user));
  }

  @Patch(":id")
  @Roles(Role.ORG_ADMIN)
  @Audit({ action: "STAFF_UPDATED", entityType: "user" })
  update(@CurrentUser() user: SessionUser, @Param("id") id: string, @Body() dto: UpdateUserDto) {
    return this.users.update(tenantContextFor(user), id, dto);
  }

  @Post(":id/reset-password")
  @Roles(Role.ORG_ADMIN)
  @Audit({ action: "STAFF_PASSWORD_RESET_SENT", entityType: "user" })
  requestPasswordReset(@CurrentUser() user: SessionUser, @Param("id") id: string) {
    return this.users.requestPasswordReset(tenantContextFor(user), id);
  }

  @Patch("me/avatar")
  setAvatar(@CurrentUser() user: SessionUser, @Body() dto: UpdateAvatarDto) {
    return this.users.setAvatar(tenantContextFor(user), user.id, dto.assetId);
  }

  @Delete("me/avatar")
  clearAvatar(@CurrentUser() user: SessionUser) {
    return this.users.clearAvatar(tenantContextFor(user), user.id);
  }
}
