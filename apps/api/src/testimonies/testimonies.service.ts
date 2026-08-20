import { ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { runWithTenant, TenantContext } from "../prisma/tenant";
import { CreateTestimonyDto } from "./dto/create-testimony.dto";

@Injectable()
export class TestimoniesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(ctx: TenantContext, submittedById: string, dto: CreateTestimonyDto) {
    if (!ctx.organizationId) throw new ForbiddenException("Only an organization member can do that");
    return runWithTenant(this.prisma, ctx, (tx) =>
      tx.testimony.create({
        data: { organizationId: ctx.organizationId as string, submittedById, category: dto.category, content: dto.content },
        include: { submittedBy: { select: { id: true, fullName: true } } },
      }),
    );
  }

  async list(ctx: TenantContext) {
    return runWithTenant(this.prisma, ctx, (tx) =>
      tx.testimony.findMany({
        orderBy: { createdAt: "desc" },
        include: { submittedBy: { select: { id: true, fullName: true } } },
      }),
    );
  }

  /** No edit -- if it's wrong, take it down and repost (Org Admin only). */
  async remove(ctx: TenantContext, id: string) {
    await runWithTenant(this.prisma, ctx, (tx) => tx.testimony.delete({ where: { id } }));
  }
}
