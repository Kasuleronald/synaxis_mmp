import { ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { runWithTenant, TenantContext } from "../prisma/tenant";
import { CreateFellowshipDto } from "./dto/create-fellowship.dto";
import { UpdateFellowshipDto } from "./dto/update-fellowship.dto";

/** leaderId is a bare id, not a Prisma relation (a fellowship can name a
 * leader before that member exists, or the reverse) -- so "leader" is
 * attached with a manual batch lookup rather than an `include`. */
async function withLeaders<T extends { leaderId: string | null }>(tx: any, fellowships: T[]) {
  const leaderIds = fellowships.map((f) => f.leaderId).filter((id): id is string => !!id);
  const leaders = leaderIds.length
    ? await tx.member.findMany({ where: { id: { in: leaderIds } }, select: { id: true, fullName: true } })
    : [];
  const byId = new Map(leaders.map((l: any) => [l.id, l]));
  return fellowships.map((f) => ({ ...f, leader: f.leaderId ? (byId.get(f.leaderId) ?? null) : null }));
}

@Injectable()
export class FellowshipsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(ctx: TenantContext, dto: CreateFellowshipDto) {
    if (!ctx.organizationId) throw new ForbiddenException("Only an organization member can do that");
    return runWithTenant(this.prisma, ctx, async (tx) => {
      const fellowship = await tx.fellowship.create({ data: { organizationId: ctx.organizationId as string, ...dto } });
      return (await withLeaders(tx, [fellowship]))[0];
    });
  }

  async update(ctx: TenantContext, id: string, dto: UpdateFellowshipDto) {
    return runWithTenant(this.prisma, ctx, async (tx) => {
      const fellowship = await tx.fellowship.update({ where: { id }, data: dto });
      return (await withLeaders(tx, [fellowship]))[0];
    });
  }

  async list(ctx: TenantContext) {
    return runWithTenant(this.prisma, ctx, async (tx) => {
      const fellowships = await tx.fellowship.findMany({
        orderBy: { name: "asc" },
        include: { _count: { select: { members: true } } },
      });
      return withLeaders(tx, fellowships);
    });
  }
}
