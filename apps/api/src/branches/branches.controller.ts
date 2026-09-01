import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { Role, SessionUser } from "@life-mmp/shared";
import { SessionAuthGuard } from "../auth/guards/session-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { tenantContextFor } from "../auth/tenant-context";
import { CreateBranchDto } from "./dto/create-branch.dto";
import { UpdateBranchDto } from "./dto/update-branch.dto";
import { Audit } from "../audit-log/audit.decorator";
import { BranchesService } from "./branches.service";

@Controller("branches")
@UseGuards(SessionAuthGuard, RolesGuard)
export class BranchesController {
  constructor(private readonly branches: BranchesService) {}

  @Post()
  @Roles(Role.ORG_ADMIN)
  @Audit({ action: "BRANCH_CREATED", entityType: "branch" })
  create(@CurrentUser() user: SessionUser, @Body() dto: CreateBranchDto) {
    return this.branches.create(tenantContextFor(user), dto);
  }

  @Get()
  list(@CurrentUser() user: SessionUser) {
    // Any authenticated org member can see their own org's branch list --
    // RLS still confines the result to the caller's organizationId.
    return this.branches.list(tenantContextFor(user));
  }

  @Patch(":id")
  @Roles(Role.ORG_ADMIN)
  @Audit({ action: "BRANCH_UPDATED", entityType: "branch" })
  update(@CurrentUser() user: SessionUser, @Param("id") id: string, @Body() dto: UpdateBranchDto) {
    return this.branches.update(tenantContextFor(user), id, dto);
  }
}
