import { ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { runWithTenant, TenantContext } from "../prisma/tenant";
import { CreateHouseholdDto } from "./dto/create-household.dto";
import { UpdateHouseholdDto } from "./dto/update-household.dto";

const HEAD_SELECT = { id: true, fullName: true } as const;

@Injectable()
export class HouseholdsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Households don't carry a head FK of their own (see the schema comment
   * on Household) -- "head" is just whichever member has householdRole
   * HEAD in this household. Swapping heads clears the old one first so a
   * household never ends up with two. */
  private async setHead(tx: any, householdId: string, headMemberId: string) {
    const currentHead = await tx.member.findFirst({ where: { householdId, householdRole: "HEAD" } });
    if (currentHead && currentHead.id !== headMemberId) {
      await tx.member.update({ where: { id: currentHead.id }, data: { householdRole: null } });
    }
    await tx.member.update({ where: { id: headMemberId }, data: { householdId, householdRole: "HEAD" } });
  }

  private async getHead(tx: any, householdId: string) {
    return tx.member.findFirst({ where: { householdId, householdRole: "HEAD" }, select: HEAD_SELECT });
  }

  async create(ctx: TenantContext, dto: CreateHouseholdDto) {
    if (!ctx.organizationId) throw new ForbiddenException("Only an organization member can do that");
    const { headMemberId, ...rest } = dto;
    return runWithTenant(this.prisma, ctx, async (tx) => {
      const household = await tx.household.create({
        data: { organizationId: ctx.organizationId as string, ...rest },
      });
      if (headMemberId) await this.setHead(tx, household.id, headMemberId);
      return { ...household, head: headMemberId ? await this.getHead(tx, household.id) : null };
    });
  }

  async update(ctx: TenantContext, id: string, dto: UpdateHouseholdDto) {
    const { headMemberId, ...rest } = dto;
    return runWithTenant(this.prisma, ctx, async (tx) => {
      const household = await tx.household.update({ where: { id }, data: rest });
      if (headMemberId) await this.setHead(tx, id, headMemberId);
      return { ...household, head: await this.getHead(tx, id) };
    });
  }

  async list(ctx: TenantContext) {
    return runWithTenant(this.prisma, ctx, async (tx) => {
      const households = await tx.household.findMany({ orderBy: { name: "asc" } });
      const heads = await tx.member.findMany({
        where: { householdId: { in: households.map((h) => h.id) }, householdRole: "HEAD" },
        select: { id: true, fullName: true, householdId: true },
      });
      const headByHousehold = new Map(heads.map((h) => [h.householdId, { id: h.id, fullName: h.fullName }]));
      return households.map((h) => ({ ...h, head: headByHousehold.get(h.id) ?? null }));
    });
  }
}
