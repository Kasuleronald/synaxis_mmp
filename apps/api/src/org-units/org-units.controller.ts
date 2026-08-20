import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import type { SessionUser } from "@life-mmp/shared";
import { SessionAuthGuard } from "../auth/guards/session-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { tenantContextFor } from "../auth/tenant-context";
import { CreateOrgUnitDto } from "./dto/create-org-unit.dto";
import { UpdateOrgUnitDto } from "./dto/update-org-unit.dto";
import { OrgUnitsService } from "./org-units.service";

@Controller("org-units")
@UseGuards(SessionAuthGuard)
export class OrgUnitsController {
  constructor(private readonly orgUnits: OrgUnitsService) {}

  @Post()
  create(@CurrentUser() user: SessionUser, @Body() dto: CreateOrgUnitDto) {
    return this.orgUnits.create(tenantContextFor(user), dto);
  }

  @Get()
  listTree(@CurrentUser() user: SessionUser) {
    return this.orgUnits.listTree(tenantContextFor(user));
  }

  @Patch(":id")
  update(@CurrentUser() user: SessionUser, @Param("id") id: string, @Body() dto: UpdateOrgUnitDto) {
    return this.orgUnits.update(tenantContextFor(user), id, dto);
  }
}
