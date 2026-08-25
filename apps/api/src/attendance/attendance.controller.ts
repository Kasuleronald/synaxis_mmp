import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { Role, type SessionUser } from "@life-mmp/shared";
import { SessionAuthGuard } from "../auth/guards/session-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { branchScopeFor, tenantContextFor } from "../auth/tenant-context";
import { CreateAttendanceSessionDto } from "./dto/create-session.dto";
import { CheckInDto } from "./dto/check-in.dto";
import { LinkMemberDto } from "./dto/link-member.dto";
import { AttendanceService } from "./attendance.service";

@Controller("attendance/sessions")
@UseGuards(SessionAuthGuard)
export class AttendanceController {
  constructor(private readonly attendance: AttendanceService) {}

  @Post()
  createSession(@CurrentUser() user: SessionUser, @Body() dto: CreateAttendanceSessionDto) {
    return this.attendance.createSession(tenantContextFor(user), dto);
  }

  @Get()
  listSessions(@CurrentUser() user: SessionUser) {
    return this.attendance.listSessions(tenantContextFor(user), branchScopeFor(user));
  }

  @Get(":id")
  getSession(@CurrentUser() user: SessionUser, @Param("id") id: string) {
    return this.attendance.getSession(tenantContextFor(user), id);
  }

  @Get(":id/records")
  getRecords(@CurrentUser() user: SessionUser, @Param("id") id: string) {
    return this.attendance.getSessionRecords(tenantContextFor(user), id);
  }

  // Staff-operated check-in, same shape as the public QR flow -- an usher
  // signed in on a shared device uses this instead of the /checkin/:token
  // page, but writes through the identical upsert-by-id path.
  @Post(":id/check-in")
  checkIn(@CurrentUser() user: SessionUser, @Param("id") id: string, @Body() dto: CheckInDto) {
    return this.attendance.checkIn(tenantContextFor(user), id, dto);
  }

  // Removing a mistaken/duplicate check-in is destructive (unlike checking
  // someone in), so unlike the rest of this controller it's restricted to
  // the roles that actually run a session, not every authenticated user.
  @Delete(":sessionId/records/:recordId")
  @UseGuards(RolesGuard)
  @Roles(Role.ORG_ADMIN, Role.DEPARTMENT_HEAD, Role.FELLOWSHIP_LEADER)
  deleteRecord(@CurrentUser() user: SessionUser, @Param("recordId") recordId: string) {
    return this.attendance.deleteRecord(tenantContextFor(user), recordId);
  }

  @Patch(":sessionId/records/:recordId/link-member")
  linkMember(@CurrentUser() user: SessionUser, @Param("recordId") recordId: string, @Body() dto: LinkMemberDto) {
    return this.attendance.linkMember(tenantContextFor(user), recordId, dto);
  }
}
