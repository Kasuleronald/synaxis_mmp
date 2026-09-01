import { randomUUID } from "crypto";
import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { runWithTenant, TenantContext } from "../prisma/tenant";
import { pickDefaultFollowUpAssignee } from "../follow-ups/default-assignee";
import { CreateAttendanceSessionDto } from "./dto/create-session.dto";
import { CheckInDto } from "./dto/check-in.dto";
import { LinkMemberDto } from "./dto/link-member.dto";

const REPEAT_WALKIN_THRESHOLD = 3;

function normalizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, "");
}

/** Auto-registers a repeat walk-in as a real (VISITOR-status) Member once
 * the same phone number has checked in, with no member match, at
 * REPEAT_WALKIN_THRESHOLD distinct sessions -- "automatically track
 * visitors ... those members that are first entered as walk-ins" (Sep
 * 2026). Every one of their past walk-in records is retroactively linked to
 * the new Member too, so their attendance history follows them once
 * converted; a follow-up is created so someone actually reaches out about
 * formally registering them, rather than this happening silently. Skipped
 * entirely if a Member with this phone already exists -- staff may have
 * already linked/registered them manually, and this never overrides that. */
async function maybeConvertRepeatWalkIn(
  tx: any,
  organizationId: string,
  visitorPhone: string | null | undefined,
  visitorName: string | null | undefined,
) {
  if (!visitorPhone) return;
  const normalized = normalizePhone(visitorPhone);
  if (!normalized) return;

  const existingMember = await tx.member.findFirst({ where: { organizationId, phone: normalized } });
  if (existingMember) return;

  const walkIns: { id: string; sessionId: string; visitorPhone: string | null }[] = await tx.attendanceRecord.findMany({
    where: { organizationId, memberId: null, visitorPhone: { not: null } },
    select: { id: true, sessionId: true, visitorPhone: true },
  });
  const matches = walkIns.filter((r) => r.visitorPhone && normalizePhone(r.visitorPhone) === normalized);
  const distinctSessions = new Set(matches.map((r) => r.sessionId));
  if (distinctSessions.size < REPEAT_WALKIN_THRESHOLD) return;

  const member = await tx.member.create({
    data: {
      organizationId,
      fullName: visitorName?.trim() || "Walk-in visitor",
      phone: normalized,
      status: "VISITOR",
      originatedAsWalkIn: true,
    },
  });
  await tx.attendanceRecord.updateMany({
    where: { id: { in: matches.map((r) => r.id) } },
    data: { memberId: member.id },
  });

  const assignedToId = await pickDefaultFollowUpAssignee(tx, organizationId);
  await tx.followUp.create({
    data: {
      id: randomUUID(),
      organizationId,
      memberId: member.id,
      assignedToId,
      notes: `Checked in as a walk-in ${distinctSessions.size} times -- may be ready to be registered as a full member.`,
    },
  });
}

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
          categoryId: dto.categoryId,
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
      const record = await tx.attendanceRecord.create({
        data: {
          id,
          organizationId: ctx.organizationId as string,
          sessionId,
          memberId,
          visitorName,
          visitorPhone,
        },
      });
      if (!memberId) await maybeConvertRepeatWalkIn(tx, ctx.organizationId as string, visitorPhone, visitorName);
      return record;
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
          select: { displayName: true, logoUrl: true, theme: true, country: true },
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
        const record = await tx.attendanceRecord.create({
          data: {
            id,
            organizationId: session.organizationId,
            sessionId: session.id,
            memberId,
            visitorName,
            visitorPhone,
          },
        });
        if (!memberId) await maybeConvertRepeatWalkIn(tx, session.organizationId, visitorPhone, visitorName);
        return record;
      },
    );
  }
}
