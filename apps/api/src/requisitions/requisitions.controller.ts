import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { Role, SessionUser } from "@life-mmp/shared";
import { SessionAuthGuard } from "../auth/guards/session-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { tenantContextFor } from "../auth/tenant-context";
import { CreateRequisitionDto } from "./dto/create-requisition.dto";
import { ReviewRequisitionDto } from "./dto/review-requisition.dto";
import { CreateAccountabilityDto } from "./dto/create-accountability.dto";
import { RequisitionsService } from "./requisitions.service";

const FINANCE_ROLES = [Role.ORG_ADMIN, Role.FINANCE_OFFICER] as const;

@Controller("requisitions")
@UseGuards(SessionAuthGuard, RolesGuard)
export class RequisitionsController {
  constructor(private readonly requisitions: RequisitionsService) {}

  @Post()
  create(@CurrentUser() user: SessionUser, @Body() dto: CreateRequisitionDto) {
    return this.requisitions.createRequisition(tenantContextFor(user), user.id, dto);
  }

  @Get()
  list(@CurrentUser() user: SessionUser) {
    return this.requisitions.list(tenantContextFor(user), { id: user.id, role: user.role });
  }

  @Post(":id/approve")
  @Roles(...FINANCE_ROLES)
  approve(@CurrentUser() user: SessionUser, @Param("id") id: string, @Body() dto: ReviewRequisitionDto) {
    return this.requisitions.approveRequisition(tenantContextFor(user), id, user.id, dto);
  }

  @Post(":id/reject")
  @Roles(...FINANCE_ROLES)
  reject(@CurrentUser() user: SessionUser, @Param("id") id: string, @Body() dto: ReviewRequisitionDto) {
    return this.requisitions.rejectRequisition(tenantContextFor(user), id, user.id, dto);
  }

  @Post(":id/accountability")
  submitAccountability(@CurrentUser() user: SessionUser, @Param("id") id: string, @Body() dto: CreateAccountabilityDto) {
    return this.requisitions.submitAccountability(tenantContextFor(user), id, user.id, dto);
  }

  @Post("accountability/:accountabilityId/approve")
  @Roles(...FINANCE_ROLES)
  approveAccountability(
    @CurrentUser() user: SessionUser,
    @Param("accountabilityId") accountabilityId: string,
    @Body() dto: ReviewRequisitionDto,
  ) {
    return this.requisitions.approveAccountability(tenantContextFor(user), accountabilityId, user.id, dto);
  }

  @Post("accountability/:accountabilityId/reject")
  @Roles(...FINANCE_ROLES)
  rejectAccountability(
    @CurrentUser() user: SessionUser,
    @Param("accountabilityId") accountabilityId: string,
    @Body() dto: ReviewRequisitionDto,
  ) {
    return this.requisitions.rejectAccountability(tenantContextFor(user), accountabilityId, user.id, dto);
  }
}
