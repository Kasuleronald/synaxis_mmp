import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import type { SessionUser } from "@life-mmp/shared";
import { SessionAuthGuard } from "../auth/guards/session-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { tenantContextFor } from "../auth/tenant-context";
import { CreateAttendanceSessionDto } from "./dto/create-session.dto";
import { CheckInDto } from "./dto/check-in.dto";
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
    return this.attendance.listSessions(tenantContextFor(user));
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
}
