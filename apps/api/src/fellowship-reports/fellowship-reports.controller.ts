import { Body, Controller, ForbiddenException, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { Role, SessionUser } from "@life-mmp/shared";
import { SessionAuthGuard } from "../auth/guards/session-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { tenantContextFor } from "../auth/tenant-context";
import { Audit } from "../audit-log/audit.decorator";
import { CreateFellowshipReportDto } from "./dto/create-fellowship-report.dto";
import { ApproveFellowshipReportDto } from "./dto/approve-fellowship-report.dto";
import { RejectFellowshipReportDto } from "./dto/reject-fellowship-report.dto";
import { FellowshipReportsService } from "./fellowship-reports.service";

@Controller("fellowship-reports")
@UseGuards(SessionAuthGuard, RolesGuard)
export class FellowshipReportsController {
  constructor(private readonly reports: FellowshipReportsService) {}

  @Post()
  @Audit({ action: "FELLOWSHIP_REPORT_SUBMITTED", entityType: "fellowshipReport" })
  create(@CurrentUser() user: SessionUser, @Body() dto: CreateFellowshipReportDto) {
    // Not an @Roles check -- isFellowshipLeader is an additive grant (Staff
    // screen), not tied to the base Role, so a Department Head who also
    // leads a cell group can submit without a role change.
    const allowed = user.role === Role.FELLOWSHIP_LEADER || user.role === Role.ORG_ADMIN || user.isFellowshipLeader;
    if (!allowed) throw new ForbiddenException("You're not appointed to lead a fellowship");
    return this.reports.create(tenantContextFor(user), user.id, dto);
  }

  @Get()
  list(
    @CurrentUser() user: SessionUser,
    @Query("refNumber") refNumber?: string,
    @Query("fellowshipId") fellowshipId?: string,
    @Query("financeStatus") financeStatus?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    return this.reports.list(
      tenantContextFor(user),
      { id: user.id, role: user.role, isPastor: user.isPastor, isFellowshipsDepartmentHead: user.isFellowshipsDepartmentHead },
      { refNumber, fellowshipId, financeStatus, from, to },
    );
  }

  @Post(":id/approve")
  @Roles(Role.ORG_ADMIN, Role.FINANCE_OFFICER)
  @Audit({ action: "FELLOWSHIP_REPORT_APPROVED", entityType: "fellowshipReport" })
  approve(@CurrentUser() user: SessionUser, @Param("id") id: string, @Body() dto: ApproveFellowshipReportDto) {
    return this.reports.approveFinance(tenantContextFor(user), id, user.id, dto);
  }

  @Post(":id/reject")
  @Roles(Role.ORG_ADMIN, Role.FINANCE_OFFICER)
  @Audit({ action: "FELLOWSHIP_REPORT_REJECTED", entityType: "fellowshipReport" })
  reject(@CurrentUser() user: SessionUser, @Param("id") id: string, @Body() dto: RejectFellowshipReportDto) {
    return this.reports.rejectFinance(tenantContextFor(user), id, user.id, dto);
  }
}
