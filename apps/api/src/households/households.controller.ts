import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import type { SessionUser } from "@life-mmp/shared";
import { SessionAuthGuard } from "../auth/guards/session-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { tenantContextFor } from "../auth/tenant-context";
import { Audit } from "../audit-log/audit.decorator";
import { CreateHouseholdDto } from "./dto/create-household.dto";
import { UpdateHouseholdDto } from "./dto/update-household.dto";
import { HouseholdsService } from "./households.service";

@Controller("households")
@UseGuards(SessionAuthGuard)
export class HouseholdsController {
  constructor(private readonly households: HouseholdsService) {}

  @Post()
  @Audit({ action: "HOUSEHOLD_CREATED", entityType: "household" })
  create(@CurrentUser() user: SessionUser, @Body() dto: CreateHouseholdDto) {
    return this.households.create(tenantContextFor(user), dto);
  }

  @Get()
  list(@CurrentUser() user: SessionUser) {
    return this.households.list(tenantContextFor(user));
  }

  @Patch(":id")
  @Audit({ action: "HOUSEHOLD_UPDATED", entityType: "household" })
  update(@CurrentUser() user: SessionUser, @Param("id") id: string, @Body() dto: UpdateHouseholdDto) {
    return this.households.update(tenantContextFor(user), id, dto);
  }
}
