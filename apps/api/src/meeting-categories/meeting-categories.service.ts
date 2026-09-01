import { ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { runWithTenant, TenantContext } from "../prisma/tenant";
import { CreateMeetingCategoryDto } from "./dto/create-meeting-category.dto";
import { UpdateMeetingCategoryDto } from "./dto/update-meeting-category.dto";

@Injectable()
export class MeetingCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(ctx: TenantContext, dto: CreateMeetingCategoryDto) {
    if (!ctx.organizationId) throw new ForbiddenException("Only an organization member can do that");
    return runWithTenant(this.prisma, ctx, (tx) =>
      tx.meetingCategory.create({ data: { organizationId: ctx.organizationId as string, name: dto.name } }),
    );
  }

  /** Active-first, then alphabetical -- a retired category sinks to the
   * bottom of the admin list rather than cluttering the top, but nothing's
   * ever fully hidden (past sessions/events still reference it by id). */
  async list(ctx: TenantContext) {
    return runWithTenant(this.prisma, ctx, (tx) =>
      tx.meetingCategory.findMany({ orderBy: [{ isActive: "desc" }, { name: "asc" }] }),
    );
  }

  async update(ctx: TenantContext, id: string, dto: UpdateMeetingCategoryDto) {
    return runWithTenant(this.prisma, ctx, (tx) => tx.meetingCategory.update({ where: { id }, data: dto }));
  }
}
