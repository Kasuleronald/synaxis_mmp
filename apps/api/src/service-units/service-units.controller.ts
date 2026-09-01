import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import type { SessionUser } from "@life-mmp/shared";
import { SessionAuthGuard } from "../auth/guards/session-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { tenantContextFor } from "../auth/tenant-context";
import { Audit } from "../audit-log/audit.decorator";
import { CreateServiceUnitDto } from "./dto/create-service-unit.dto";
import { UpdateServiceUnitDto } from "./dto/update-service-unit.dto";
import { AddServiceUnitMemberDto } from "./dto/add-service-unit-member.dto";
import { ServiceUnitsService } from "./service-units.service";

@Controller("service-units")
@UseGuards(SessionAuthGuard)
export class ServiceUnitsController {
  constructor(private readonly serviceUnits: ServiceUnitsService) {}

  @Post()
  @Audit({ action: "SERVICE_UNIT_CREATED", entityType: "serviceUnit" })
  create(@CurrentUser() user: SessionUser, @Body() dto: CreateServiceUnitDto) {
    return this.serviceUnits.create(tenantContextFor(user), dto);
  }

  @Get()
  list(@CurrentUser() user: SessionUser) {
    return this.serviceUnits.list(tenantContextFor(user));
  }

  @Get(":id")
  get(@CurrentUser() user: SessionUser, @Param("id") id: string) {
    return this.serviceUnits.get(tenantContextFor(user), id);
  }

  @Patch(":id")
  @Audit({ action: "SERVICE_UNIT_UPDATED", entityType: "serviceUnit" })
  update(@CurrentUser() user: SessionUser, @Param("id") id: string, @Body() dto: UpdateServiceUnitDto) {
    return this.serviceUnits.update(tenantContextFor(user), id, dto);
  }

  @Post(":id/members")
  @Audit({ action: "SERVICE_UNIT_MEMBER_ADDED", entityType: "serviceUnit" })
  addMember(@CurrentUser() user: SessionUser, @Param("id") id: string, @Body() dto: AddServiceUnitMemberDto) {
    return this.serviceUnits.addMember(tenantContextFor(user), id, dto);
  }

  @Delete(":id/members/:memberId")
  @Audit({ action: "SERVICE_UNIT_MEMBER_REMOVED", entityType: "serviceUnit" })
  removeMember(@CurrentUser() user: SessionUser, @Param("id") id: string, @Param("memberId") memberId: string) {
    return this.serviceUnits.removeMember(tenantContextFor(user), id, memberId);
  }

  @Get(":id/attendance")
  attendance(
    @CurrentUser() user: SessionUser,
    @Param("id") id: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    return this.serviceUnits.attendance(tenantContextFor(user), id, from, to);
  }
}
