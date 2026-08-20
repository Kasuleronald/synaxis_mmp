import { ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { runWithTenant, TenantContext } from "../prisma/tenant";
import { CreateBranchDto } from "./dto/create-branch.dto";

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
    return runWithTenant(this.prisma, ctx, (tx) =>
      tx.branch.create({
        data: { organizationId: ctx.organizationId as string, name: dto.name, isMain: dto.isMain ?? false },
      }),
    );
  }

  async list(ctx: TenantContext) {
    return runWithTenant(this.prisma, ctx, (tx) =>
      tx.branch.findMany({ orderBy: { createdAt: "asc" } }),
    );
  }
}
