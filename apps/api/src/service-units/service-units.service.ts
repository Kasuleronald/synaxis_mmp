import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { runWithTenant, TenantContext } from "../prisma/tenant";
import { CreateServiceUnitDto } from "./dto/create-service-unit.dto";
import { UpdateServiceUnitDto } from "./dto/update-service-unit.dto";
import { AddServiceUnitMemberDto } from "./dto/add-service-unit-member.dto";

/** leaderId is a bare id, not a Prisma relation -- same reasoning as
 * Fellowship.leaderId/Branch.leaderId: a unit can name a leader before that
 * member record exists, so the name is attached with a manual lookup. */
async function withLeaders<T extends { leaderId: string | null }>(tx: any, units: T[]) {
  const leaderIds = units.map((u) => u.leaderId).filter((id): id is string => !!id);
  const leaders = leaderIds.length
    ? await tx.member.findMany({ where: { id: { in: leaderIds } }, select: { id: true, fullName: true } })
    : [];
  const byId = new Map(leaders.map((l: any) => [l.id, l]));
  return units.map((u) => ({ ...u, leader: u.leaderId ? (byId.get(u.leaderId) ?? null) : null }));
}

@Injectable()
export class ServiceUnitsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(ctx: TenantContext, dto: CreateServiceUnitDto) {
    if (!ctx.organizationId) throw new ForbiddenException("Only an organization member can do that");
    return runWithTenant(this.prisma, ctx, async (tx) => {
      const unit = await tx.serviceUnit.create({ data: { organizationId: ctx.organizationId as string, ...dto } });
      return (await withLeaders(tx, [unit]))[0];
    });
  }

  async update(ctx: TenantContext, id: string, dto: UpdateServiceUnitDto) {
    return runWithTenant(this.prisma, ctx, async (tx) => {
      const unit = await tx.serviceUnit.update({ where: { id }, data: dto });
      return (await withLeaders(tx, [unit]))[0];
    });
  }

  async list(ctx: TenantContext) {
    return runWithTenant(this.prisma, ctx, async (tx) => {
      const units = await tx.serviceUnit.findMany({
        orderBy: { name: "asc" },
        include: { _count: { select: { members: true } } },
      });
      return withLeaders(tx, units);
    });
  }

  async get(ctx: TenantContext, id: string) {
    return runWithTenant(this.prisma, ctx, async (tx) => {
      const unit = await tx.serviceUnit.findUnique({
        where: { id },
        include: { members: { include: { member: { select: { id: true, fullName: true, phone: true } } } } },
      });
      if (!unit) throw new NotFoundException("Service unit not found");
      return (await withLeaders(tx, [unit]))[0];
    });
  }

  async addMember(ctx: TenantContext, id: string, dto: AddServiceUnitMemberDto) {
    return runWithTenant(this.prisma, ctx, (tx) =>
      tx.serviceUnitMember.create({
        data: { serviceUnitId: id, memberId: dto.memberId },
        include: { member: { select: { id: true, fullName: true, phone: true } } },
      }),
    );
  }

  async removeMember(ctx: TenantContext, id: string, memberId: string) {
    return runWithTenant(this.prisma, ctx, (tx) =>
      tx.serviceUnitMember.deleteMany({ where: { serviceUnitId: id, memberId } }),
    );
  }

  /** Cross-references the unit's members against every non-class attendance
   * session (a "service or program" occasion, per the request) in range,
   * rather than a separate check-in mechanism -- a unit member checks in the
   * same way anyone else does, this just reads what's already there. */
  async attendance(ctx: TenantContext, id: string, from?: string, to?: string) {
    return runWithTenant(this.prisma, ctx, async (tx) => {
      const unit = await tx.serviceUnit.findUnique({
        where: { id },
        include: { members: { include: { member: { select: { id: true, fullName: true } } } } },
      });
      if (!unit) throw new NotFoundException("Service unit not found");

      const memberIds = unit.members.map((m: any) => m.memberId);
      const sessions = await tx.attendanceSession.findMany({
        where: {
          classId: null,
          ...(from || to
            ? { date: { gte: from ? new Date(from) : undefined, lte: to ? new Date(to) : undefined } }
            : {}),
        },
        select: { id: true, name: true, date: true },
        orderBy: { date: "asc" },
      });

      const records =
        memberIds.length && sessions.length
          ? await tx.attendanceRecord.findMany({
              where: { memberId: { in: memberIds }, sessionId: { in: sessions.map((s: any) => s.id) } },
              select: { memberId: true, sessionId: true },
            })
          : [];
      const attendedSet = new Set(records.map((r: any) => `${r.memberId}:${r.sessionId}`));

      const members = unit.members.map((m: any) => {
        const attended = sessions.filter((s: any) => attendedSet.has(`${m.memberId}:${s.id}`)).length;
        const total = sessions.length;
        return {
          memberId: m.memberId,
          fullName: m.member.fullName,
          totalSessions: total,
          attended,
          absent: total - attended,
          rate: total > 0 ? Math.round((attended / total) * 1000) / 10 : null,
        };
      });

      return { unit: { id: unit.id, name: unit.name }, sessionCount: sessions.length, members };
    });
  }
}
