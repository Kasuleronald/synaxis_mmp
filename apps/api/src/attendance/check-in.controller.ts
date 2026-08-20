import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { CheckInDto } from "./dto/check-in.dto";
import { AttendanceService } from "./attendance.service";

/**
 * Deliberately unauthenticated (Section 2/10) -- a visitor scanning a QR
 * poster has no account. Access control is the qrToken itself, not a
 * session: unguessable (uuid), scoped to exactly one session, and the RLS
 * carve-out that makes the lookup possible touches only attendance_sessions
 * (see the public_checkin_rls migration) -- everything reachable from here
 * is scoped to that one session's own organizationId once resolved.
 */
@Controller("checkin")
export class CheckInController {
  constructor(private readonly attendance: AttendanceService) {}

  @Get(":token")
  info(@Param("token") token: string) {
    return this.attendance.getPublicCheckInInfo(token);
  }

  @Get(":token/search")
  search(@Param("token") token: string, @Query("q") q: string) {
    return this.attendance.searchMembersForCheckIn(token, q ?? "");
  }

  @Post(":token")
  checkIn(@Param("token") token: string, @Body() dto: CheckInDto) {
    return this.attendance.checkInByToken(token, dto);
  }
}
