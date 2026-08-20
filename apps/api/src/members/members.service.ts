import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { runWithTenant, TenantContext } from "../prisma/tenant";
import { CreateMemberDto } from "./dto/create-member.dto";
import { UpdateMemberDto } from "./dto/update-member.dto";

@Injectable()
export class MembersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Tier-1 offline create. The id is client-generated, so a retried sync of
   * the same queued write must be a no-op, not a duplicate or an error --
   * upsert with an empty `update` is what makes that true (Section 7/10).
   */
  async create(ctx: TenantContext, dto: CreateMemberDto, createdById?: string) {
    if (!ctx.organizationId) throw new ForbiddenException("Only an organization member can do that");
    const { id, spouseMemberId, joinedAt, ...rest } = dto;
    return runWithTenant(this.prisma, ctx, async (tx) => {
      // Only allocate on a genuinely new record -- upsert can't tell us
      // that in advance, and a retried sync of an already-created member
      // must stay a no-op, not burn another number on the org's counter.
      const alreadyExists = await tx.member.findUnique({ where: { id }, select: { id: true } });
      let memberNumber = rest.memberNumber;
      if (!alreadyExists && !memberNumber) {
        const org = await tx.organization.update({
          where: { id: ctx.organizationId as string },
          data: { memberNumberSeq: { increment: 1 } },
          select: { memberNumberSeq: true },
        });
        memberNumber = String(org.memberNumberSeq).padStart(4, "0");
      }
      let member = await tx.member.upsert({
        where: { id },
        create: {
          id,
          organizationId: ctx.organizationId as string,
          ...rest,
          memberNumber,
          createdById,
          joinedAt: joinedAt ? new Date(joinedAt) : undefined,
        },
        update: {},
      });
      if (spouseMemberId) {
        member = await this.linkSpouse(tx, ctx.organizationId as string, member.id, spouseMemberId);
      }
      return member;
    });
  }

  async update(ctx: TenantContext, id: string, dto: UpdateMemberDto) {
    const { spouseMemberId, ...rest } = dto;
    return runWithTenant(this.prisma, ctx, async (tx) => {
      let member = await tx.member.update({ where: { id }, data: rest });
      if (spouseMemberId) {
        if (!ctx.organizationId) throw new ForbiddenException("Only an organization member can do that");
        member = await this.linkSpouse(tx, ctx.organizationId, id, spouseMemberId);
      }
      return member;
    });
  }

  /** Marriage isn't tracked as its own relationship -- Household/
   * HouseholdRole (Section 5) already model "who's in a family unit and how",
   * so linking a spouse just joins both members into one, creating it if
   * neither has one yet. Whichever household the spouse already belongs to
   * (even a multi-generational one) is what gets joined -- correcting an
   * unusual case is a normal household edit, not a special path here. */
  private async linkSpouse(tx: any, organizationId: string, memberId: string, spouseMemberId: string) {
    const spouse = await tx.member.findUnique({ where: { id: spouseMemberId } });
    if (!spouse) throw new NotFoundException("Selected spouse member not found");

    let householdId = spouse.householdId as string | null;
    if (!householdId) {
      const member = await tx.member.findUnique({ where: { id: memberId } });
      const household = await tx.household.create({
        data: { organizationId, name: `${spouse.fullName} & ${member?.fullName ?? "Spouse"}` },
      });
      householdId = household.id;
      await tx.member.update({ where: { id: spouseMemberId }, data: { householdId, householdRole: "HEAD" } });
    }

    return tx.member.update({ where: { id: memberId }, data: { householdId, householdRole: "SPOUSE" } });
  }

  async list(ctx: TenantContext, search?: string) {
    return runWithTenant(this.prisma, ctx, (tx) =>
      tx.member.findMany({
        where: search
          ? {
              OR: [
                { fullName: { contains: search, mode: "insensitive" } },
                { phone: { contains: search, mode: "insensitive" } },
              ],
            }
          : undefined,
        orderBy: { fullName: "asc" },
        take: 100,
        include: {
          createdBy: { select: { id: true, fullName: true } },
          household: { select: { id: true, name: true } },
          fellowship: { select: { id: true, name: true } },
        },
      }),
    );
  }

  async get(ctx: TenantContext, id: string) {
    return runWithTenant(this.prisma, ctx, (tx) =>
      tx.member.findUnique({
        where: { id },
        include: {
          followUps: { orderBy: { createdAt: "desc" } },
          createdBy: { select: { id: true, fullName: true } },
        },
      }),
    );
  }
}
