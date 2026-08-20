import { ForbiddenException, Injectable } from "@nestjs/common";
import { FollowUpStatus } from "@life-mmp/shared";
import { PrismaService } from "../prisma/prisma.service";
import { runWithTenant, TenantContext } from "../prisma/tenant";
import { CreateFollowUpDto } from "./dto/create-follow-up.dto";
import { UpdateFollowUpDto } from "./dto/update-follow-up.dto";

@Injectable()
export class FollowUpsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Tier-1 offline create -- same idempotent-upsert pattern as members. */
  async create(ctx: TenantContext, dto: CreateFollowUpDto) {
    if (!ctx.organizationId) throw new ForbiddenException("Only an organization member can do that");
    const { id, ...rest } = dto;
    return runWithTenant(this.prisma, ctx, (tx) =>
      tx.followUp.upsert({
        where: { id },
        create: { id, organizationId: ctx.organizationId as string, ...rest },
        update: {},
      }),
    );
  }

  async update(ctx: TenantContext, id: string, dto: UpdateFollowUpDto) {
    return runWithTenant(this.prisma, ctx, (tx) =>
      tx.followUp.update({
        where: { id },
        data: {
          ...dto,
          completedAt: dto.status === FollowUpStatus.COMPLETED ? new Date() : undefined,
        },
      }),
    );
  }

  async list(ctx: TenantContext, status?: FollowUpStatus) {
    return runWithTenant(this.prisma, ctx, (tx) =>
      tx.followUp.findMany({
        where: status ? { status } : undefined,
        include: { member: { select: { id: true, fullName: true, phone: true } } },
        orderBy: { createdAt: "desc" },
      }),
    );
  }
}
