import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import { OrgUnitType } from "@life-mmp/shared";
import { PrismaService } from "../prisma/prisma.service";
import { runWithTenant, TenantContext } from "../prisma/tenant";
import { CreateOrgUnitDto } from "./dto/create-org-unit.dto";
import { UpdateOrgUnitDto } from "./dto/update-org-unit.dto";

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
      return tx.orgUnit.create({ data: { organizationId: ctx.organizationId as string, ...dto } });
    });
  }

  async update(ctx: TenantContext, id: string, dto: UpdateOrgUnitDto) {
    return runWithTenant(this.prisma, ctx, (tx) => tx.orgUnit.update({ where: { id }, data: dto }));
  }

  /** Returns directorates with their departments nested under `children` --
   * two levels deep is all Sprint 4 models, so no recursion needed. */
  async listTree(ctx: TenantContext) {
    const units = await runWithTenant(this.prisma, ctx, (tx) =>
      tx.orgUnit.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { members: true } } } }),
    );
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
