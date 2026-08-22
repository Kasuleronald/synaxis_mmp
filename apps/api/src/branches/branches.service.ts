import { ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { runWithTenant, TenantContext } from "../prisma/tenant";
import { CreateBranchDto } from "./dto/create-branch.dto";
import { UpdateBranchDto } from "./dto/update-branch.dto";

/** leaderId is a bare id, not a Prisma relation -- same reasoning as
 * Fellowship.leaderId (fellowships.service.ts): a branch can name a leader
 * before that member record exists, or the reverse -- so "leader" is
 * attached with a manual batch lookup rather than an `include`. */
async function withLeaders<T extends { leaderId: string | null }>(tx: any, branches: T[]) {
  const leaderIds = branches.map((b) => b.leaderId).filter((id): id is string => !!id);
  const leaders = leaderIds.length
    ? await tx.member.findMany({ where: { id: { in: leaderIds } }, select: { id: true, fullName: true } })
    : [];
  const byId = new Map(leaders.map((l: any) => [l.id, l]));
  return branches.map((b) => ({ ...b, leader: b.leaderId ? (byId.get(b.leaderId) ?? null) : null }));
}

@Injectable()
export class BranchesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(ctx: TenantContext, dto: CreateBranchDto) {
    if (!ctx.organizationId) {
      // A Platform Administrator has no organization of their own -- branches
      // belong to a tenant, and "which tenant" always comes from the
      // caller's own session, never a request body field.
      throw new ForbiddenException("Only an organization member can create a branch");
    }
    return runWithTenant(this.prisma, ctx, async (tx) => {
      if (dto.isMain) await this.clearOtherMains(tx, ctx.organizationId as string);
      const branch = await tx.branch.create({
        data: { organizationId: ctx.organizationId as string, name: dto.name, isMain: dto.isMain ?? false },
      });
      return (await withLeaders(tx, [branch]))[0];
    });
  }

  async update(ctx: TenantContext, id: string, dto: UpdateBranchDto) {
    return runWithTenant(this.prisma, ctx, async (tx) => {
      // Only one branch is ever "main" at a time -- assigning it here means
      // taking it away from whichever branch currently holds it, not adding
      // a second one.
      if (dto.isMain && ctx.organizationId) await this.clearOtherMains(tx, ctx.organizationId, id);
      const branch = await tx.branch.update({ where: { id }, data: dto });
      return (await withLeaders(tx, [branch]))[0];
    });
  }

  async list(ctx: TenantContext) {
    return runWithTenant(this.prisma, ctx, async (tx) => {
      const branches = await tx.branch.findMany({ orderBy: { createdAt: "asc" } });
      return withLeaders(tx, branches);
    });
  }

  private async clearOtherMains(tx: any, organizationId: string, exceptId?: string) {
    await tx.branch.updateMany({
      where: { organizationId, isMain: true, ...(exceptId ? { id: { not: exceptId } } : {}) },
      data: { isMain: false },
    });
  }
}
