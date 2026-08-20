import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { Role } from "@life-mmp/shared";
import { SessionAuthGuard } from "../auth/guards/session-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { tenantContextFor } from "../auth/tenant-context";
import { CreateOrganizationDto } from "./dto/create-organization.dto";
import { UpdateOrganizationDto } from "./dto/update-organization.dto";
import { SetSuspendedDto } from "./dto/set-suspended.dto";
import { OrganizationsService } from "./organizations.service";
import type { SessionUser } from "@life-mmp/shared";

@Controller("organizations")
@UseGuards(SessionAuthGuard, RolesGuard)
export class OrganizationsController {
  constructor(private readonly organizations: OrganizationsService) {}

  @Post()
  @Roles(Role.PLATFORM_ADMIN)
  create(@CurrentUser() user: SessionUser, @Body() dto: CreateOrganizationDto) {
    return this.organizations.createOrganization(tenantContextFor(user), dto);
  }

  @Get()
  @Roles(Role.PLATFORM_ADMIN)
  list(@CurrentUser() user: SessionUser) {
    return this.organizations.listOrganizations(tenantContextFor(user));
  }

  @Get(":id")
  get(@CurrentUser() user: SessionUser, @Param("id") id: string) {
    // No @Roles() here: RLS (organizationId = caller's org, OR platform-admin
    // bypass) is what actually decides whether the row comes back -- a
    // regular org member can fetch their own organization, everyone else
    // gets null.
    return this.organizations.getOrganization(tenantContextFor(user), id);
  }

  @Patch(":id")
  @Roles(Role.ORG_ADMIN, Role.PLATFORM_ADMIN)
  update(@CurrentUser() user: SessionUser, @Param("id") id: string, @Body() dto: UpdateOrganizationDto) {
    return this.organizations.updateOrganization(tenantContextFor(user), id, dto);
  }

  @Patch(":id/suspension")
  @Roles(Role.PLATFORM_ADMIN)
  setSuspended(@CurrentUser() user: SessionUser, @Param("id") id: string, @Body() dto: SetSuspendedDto) {
    return this.organizations.setSuspended(tenantContextFor(user), id, dto.isSuspended);
  }

  @Post(":id/admin/reset-link")
  @Roles(Role.PLATFORM_ADMIN)
  generateAdminResetLink(@CurrentUser() user: SessionUser, @Param("id") id: string) {
    return this.organizations.generateAdminResetLink(tenantContextFor(user), id);
  }
}
