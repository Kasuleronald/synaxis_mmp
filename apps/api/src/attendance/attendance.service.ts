import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { runWithTenant, TenantContext } from "../prisma/tenant";
import { CreateAttendanceSessionDto } from "./dto/create-session.dto";
import { CheckInDto } from "./dto/check-in.dto";

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  async createSession(ctx: TenantContext, dto: CreateAttendanceSessionDto) {
    if (!ctx.organizationId) throw new ForbiddenException("Only an organization member can do that");
    return runWithTenant(this.prisma, ctx, (tx) =>
      tx.attendanceSession.create({
        data: {
          organizationId: ctx.organizationId as string,
          branchId: dto.branchId,
          eventId: dto.eventId,
          classId: dto.classId,
          name: dto.name,
          date: new Date(dto.date),
        },
      }),
    );
  }

  async listSessions(ctx: TenantContext) {
    return runWithTenant(this.prisma, ctx, (tx) =>
      tx.attendanceSession.findMany({
        orderBy: { date: "desc" },
        include: { _count: { select: { records: true } } },
      }),
    );
  }

  async getSession(ctx: TenantContext, id: string) {
    return runWithTenant(this.prisma, ctx, (tx) =>
      tx.attendanceSession.findUnique({ where: { id }, include: { _count: { select: { records: true } } } }),
    );
  }

  async getSessionRecords(ctx: TenantContext, sessionId: string) {
    return runWithTenant(this.prisma, ctx, (tx) =>
      tx.attendanceRecord.findMany({
        where: { sessionId },
        include: { member: { select: { id: true, fullName: true } } },
        orderBy: { checkedInAt: "desc" },
      }),
    );
  }

  async checkIn(ctx: TenantContext, sessionId: string, dto: CheckInDto) {
    if (!ctx.organizationId) throw new ForbiddenException("Only an organization member can do that");
    const { id, memberId, visitorName } = dto;
    return runWithTenant(this.prisma, ctx, (tx) =>
      tx.attendanceRecord.upsert({
        where: { id },
        create: {
          id,
          organizationId: ctx.organizationId as string,
          sessionId,
          memberId,
          visitorName,
        },
        update: {},
      }),
    );
  }

  // --- Public QR check-in flow (Section 2/10) -- no session auth. ---------

  private async resolveSessionByToken(token: string) {
    const session = await runWithTenant(
      this.prisma,
      { organizationId: null, isPlatformAdmin: false, publicCheckin: true },
      (tx) => tx.attendanceSession.findUnique({ where: { qrToken: token } }),
    );
    if (!session) throw new NotFoundException("This check-in link is no longer valid");
    return session;
  }

  async getPublicCheckInInfo(token: string) {
    const session = await this.resolveSessionByToken(token);
    const organization = await runWithTenant(
      this.prisma,
      { organizationId: session.organizationId, isPlatformAdmin: false },
      (tx) =>
        tx.organization.findUnique({
          where: { id: session.organizationId },
          select: { displayName: true, logoUrl: true, theme: true },
        }),
    );
    return { session, organization };
  }

  async searchMembersForCheckIn(token: string, q: string) {
    const session = await this.resolveSessionByToken(token);
    return runWithTenant(
      this.prisma,
      { organizationId: session.organizationId, isPlatformAdmin: false },
      (tx) =>
        tx.member.findMany({
          where: { fullName: { contains: q, mode: "insensitive" } },
          select: { id: true, fullName: true, phone: true },
          take: 10,
          orderBy: { fullName: "asc" },
        }),
    );
  }

  async checkInByToken(token: string, dto: CheckInDto) {
    const session = await this.resolveSessionByToken(token);
    const { id, memberId, visitorName } = dto;
    return runWithTenant(
      this.prisma,
      { organizationId: session.organizationId, isPlatformAdmin: false },
      (tx) =>
        tx.attendanceRecord.upsert({
          where: { id },
          create: {
            id,
            organizationId: session.organizationId,
            sessionId: session.id,
            memberId,
            visitorName,
          },
          update: {},
        }),
    );
  }
}
