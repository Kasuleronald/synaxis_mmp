import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { Role, SessionUser } from "@life-mmp/shared";
import { SessionAuthGuard } from "../auth/guards/session-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { tenantContextFor } from "../auth/tenant-context";
import { ReportsService } from "./reports.service";

@Controller("reports")
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles(Role.ORG_ADMIN, Role.FINANCE_OFFICER)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get("members-over-time")
  membersOverTime(@CurrentUser() user: SessionUser) {
    return this.reports.membersOverTime(tenantContextFor(user));
  }

  @Get("demographics")
  demographics(@CurrentUser() user: SessionUser) {
    return this.reports.demographics(tenantContextFor(user));
  }

  @Get("attendance-trend")
  attendanceTrend(@CurrentUser() user: SessionUser, @Query("groupBy") groupBy?: string) {
    return this.reports.attendanceTrend(tenantContextFor(user), groupBy);
  }

  @Get("giving-trend")
  givingTrend(@CurrentUser() user: SessionUser, @Query("groupBy") groupBy?: string) {
    return this.reports.givingTrend(tenantContextFor(user), groupBy);
  }

  @Get("giving-by-category")
  givingByCategory(@CurrentUser() user: SessionUser) {
    return this.reports.givingByCategory(tenantContextFor(user));
  }

  @Get("giving-by-fund")
  givingByFund(@CurrentUser() user: SessionUser) {
    return this.reports.givingByFund(tenantContextFor(user));
  }

  @Get("member-statement/:memberId")
  memberStatement(@CurrentUser() user: SessionUser, @Param("memberId") memberId: string) {
    return this.reports.memberStatement(tenantContextFor(user), memberId);
  }

  @Get("fund-statement/:fundId")
  fundStatement(@CurrentUser() user: SessionUser, @Param("fundId") fundId: string) {
    return this.reports.fundStatement(tenantContextFor(user), fundId);
  }

  @Get("fellowship-leaderboard")
  fellowshipLeaderboard(@CurrentUser() user: SessionUser) {
    return this.reports.fellowshipLeaderboard(tenantContextFor(user));
  }
}
