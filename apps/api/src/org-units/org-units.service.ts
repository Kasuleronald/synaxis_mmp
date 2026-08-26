import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import { OrgUnitType } from "@life-mmp/shared";
import { PrismaService } from "../prisma/prisma.service";
import { runWithTenant, TenantContext } from "../prisma/tenant";
import { CreateOrgUnitDto } from "./dto/create-org-unit.dto";
import { UpdateOrgUnitDto } from "./dto/update-org-unit.dto";

/** headId is a bare id, not a Prisma relation -- same reasoning as
 * Fellowship.leaderId/Branch.leaderId: a unit can name a head before that
 * member record exists, so the name is attached with a manual lookup. */
async function withHeads<T extends { headId: string | null }>(tx: any, units: T[]) {
  const headIds = units.map((u) => u.headId).filter((id): id is string => !!id);
  const heads = headIds.length
    ? await tx.member.findMany({ where: { id: { in: headIds } }, select: { id: true, fullName: true } })
    : [];
  const byId = new Map(heads.map((h: any) => [h.id, h]));
  return units.map((u) => ({ ...u, head: u.headId ? (byId.get(u.headId) ?? null) : null }));
}

@Injectable()
export class OrgUnitsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(ctx: TenantContext, dto: CreateOrgUnitDto) {
    if (!ctx.organizationId) throw new ForbiddenException("Only an organization member can do that");
    if (dto.type === OrgUnitType.DIRECTORATE && dto.parentId) {
      throw new BadRequestException("A directorate can't have a parent -- only departments nest under one.");
    }
    if (dto.type === OrgUnitType.DEPARTMENT && !dto.parentId) {
      throw new BadRequestException("A department needs a parent directorate.");
    }
    return runWithTenant(this.prisma, ctx, async (tx) => {
      if (dto.parentId) {
        const parent = await tx.orgUnit.findUnique({ where: { id: dto.parentId } });
        if (!parent || parent.type !== OrgUnitType.DIRECTORATE) {
          throw new BadRequestException("Parent must be an existing directorate.");
        }
      }
      const unit = await tx.orgUnit.create({ data: { organizationId: ctx.organizationId as string, ...dto } });
      return (await withHeads(tx, [unit]))[0];
    });
  }

  async update(ctx: TenantContext, id: string, dto: UpdateOrgUnitDto) {
    return runWithTenant(this.prisma, ctx, async (tx) => {
      const unit = await tx.orgUnit.update({ where: { id }, data: dto });
      return (await withHeads(tx, [unit]))[0];
    });
  }

  /** Returns directorates with their departments nested under `children` --
   * two levels deep is all Sprint 4 models, so no recursion needed. */
  async listTree(ctx: TenantContext) {
    const units = await runWithTenant(this.prisma, ctx, async (tx) => {
      const rows = await tx.orgUnit.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { members: true } } } });
      return withHeads(tx, rows);
    });
    const byParent = new Map<string, typeof units>();
    for (const u of units) {
      const key = u.parentId ?? "root";
      if (!byParent.has(key)) byParent.set(key, []);
      byParent.get(key)!.push(u);
    }
    const attachChildren = (u: (typeof units)[number]): any => ({
      ...u,
      children: (byParent.get(u.id) ?? []).map(attachChildren),
    });
    return (byParent.get("root") ?? []).map(attachChildren);
  }
}
