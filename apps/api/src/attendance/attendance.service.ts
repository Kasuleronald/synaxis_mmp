import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { runWithTenant, TenantContext } from "../prisma/tenant";
import { CreateAttendanceSessionDto } from "./dto/create-session.dto";
import { CheckInDto } from "./dto/check-in.dto";
import { LinkMemberDto } from "./dto/link-member.dto";

/** Same person, same session, twice -- whichever check-in got there first
 * wins; the second tap/scan just returns that existing record instead of
 * creating a duplicate. Looked up by memberId when known, otherwise by a
 * case-insensitive match on the walk-in's typed name. */
async function findDuplicate(tx: any, sessionId: string, memberId?: string, visitorName?: string) {
  if (memberId) return tx.attendanceRecord.findFirst({ where: { sessionId, memberId } });
  if (visitorName) {
    return tx.attendanceRecord.findFirst({
      where: { sessionId, visitorName: { equals: visitorName, mode: "insensitive" } },
    });
  }
  return null;
}

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

  async listSessions(ctx: TenantContext, branchId?: string | null) {
    return runWithTenant(this.prisma, ctx, (tx) =>
      tx.attendanceSession.findMany({
        where: { branchId },
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
        include: { member: { select: { id: true, fullName: true, phone: true } } },
        orderBy: { checkedInAt: "desc" },
      }),
    );
  }

  async checkIn(ctx: TenantContext, sessionId: string, dto: CheckInDto) {
    if (!ctx.organizationId) throw new ForbiddenException("Only an organization member can do that");
    const { id, memberId, visitorName, visitorPhone } = dto;
    return runWithTenant(this.prisma, ctx, async (tx) => {
      const existingById = await tx.attendanceRecord.findUnique({ where: { id } });
      if (existingById) return existingById;
      const duplicate = await findDuplicate(tx, sessionId, memberId, visitorName);
      if (duplicate) return duplicate;
      return tx.attendanceRecord.create({
        data: {
          id,
          organizationId: ctx.organizationId as string,
          sessionId,
          memberId,
          visitorName,
          visitorPhone,
        },
      });
    });
  }

  async deleteRecord(ctx: TenantContext, id: string) {
    return runWithTenant(this.prisma, ctx, async (tx) => {
      const record = await tx.attendanceRecord.findUnique({ where: { id } });
      if (!record) throw new NotFoundException("Attendance record not found");
      await tx.attendanceRecord.delete({ where: { id } });
      return { ok: true };
    });
  }

  /** Promotes a walk-in to a real Member -- the frontend creates the Member
   * first (same /members endpoint as any other add), then calls this to
   * link the two and clear the now-redundant walk-in fields. */
  async linkMember(ctx: TenantContext, id: string, dto: LinkMemberDto) {
    return runWithTenant(this.prisma, ctx, async (tx) => {
      const record = await tx.attendanceRecord.findUnique({ where: { id } });
      if (!record) throw new NotFoundException("Attendance record not found");
      const member = await tx.member.findUnique({ where: { id: dto.memberId }, select: { id: true } });
      if (!member) throw new NotFoundException("Member not found");
      return tx.attendanceRecord.update({
        where: { id },
        data: { memberId: dto.memberId, visitorName: null, visitorPhone: null },
      });
    });
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
    const { id, memberId, visitorName, visitorPhone } = dto;
    return runWithTenant(
      this.prisma,
      { organizationId: session.organizationId, isPlatformAdmin: false },
      async (tx) => {
        const existingById = await tx.attendanceRecord.findUnique({ where: { id } });
        if (existingById) return existingById;
        const duplicate = await findDuplicate(tx, session.id, memberId, visitorName);
        if (duplicate) return duplicate;
        return tx.attendanceRecord.create({
          data: {
            id,
            organizationId: session.organizationId,
            sessionId: session.id,
            memberId,
            visitorName,
            visitorPhone,
          },
        });
      },
    );
  }
}
