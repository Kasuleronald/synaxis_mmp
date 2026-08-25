import { ForbiddenException, Injectable } from "@nestjs/common";
import { Role } from "@life-mmp/shared";
import { PrismaService } from "../prisma/prisma.service";
import { runWithTenant, TenantContext } from "../prisma/tenant";
import { UpsertDevotionalDto } from "./dto/upsert-devotional.dto";

const DEVOTIONAL_INCLUDE = { author: { select: { id: true, fullName: true } } } as const;

/** Devotionals are keyed one-per-calendar-day -- strip the time so "today"
 * always resolves to the same row regardless of what time it's requested. */
function dateOnly(raw: string): Date {
  const d = new Date(raw);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function assertCanEdit(user: { role: string; isDevotionalEditor: boolean }) {
  if (user.role !== Role.ORG_ADMIN && !user.isDevotionalEditor) {
    throw new ForbiddenException("You don't have permission to edit the Daily Devotional");
  }
}

@Injectable()
export class DevotionalsService {
  constructor(private readonly prisma: PrismaService) {}

  async getByDate(ctx: TenantContext, date?: string) {
    const day = dateOnly(date ?? new Date().toISOString());
    return runWithTenant(this.prisma, ctx, (tx) =>
      tx.devotional.findUnique({ where: { organizationId_date: { organizationId: ctx.organizationId as string, date: day } }, include: DEVOTIONAL_INCLUDE }),
    );
  }

  /** Most recent first -- a simple browsable history, not paginated (a
   * devotional archive is small: at most one row per day). */
  async list(ctx: TenantContext) {
    return runWithTenant(this.prisma, ctx, (tx) =>
      tx.devotional.findMany({ orderBy: { date: "desc" }, take: 90, include: DEVOTIONAL_INCLUDE }),
    );
  }

  async upsert(ctx: TenantContext, user: { id: string; role: string; isDevotionalEditor: boolean }, dto: UpsertDevotionalDto) {
    if (!ctx.organizationId) throw new ForbiddenException("Only an organization member can do that");
    assertCanEdit(user);
    const day = dateOnly(dto.date);
    return runWithTenant(this.prisma, ctx, (tx) =>
      tx.devotional.upsert({
        where: { organizationId_date: { organizationId: ctx.organizationId as string, date: day } },
        create: {
          organizationId: ctx.organizationId as string,
          date: day,
          title: dto.title,
          scripture: dto.scripture,
          body: dto.body,
          authorId: user.id,
        },
        update: { title: dto.title, scripture: dto.scripture, body: dto.body, authorId: user.id },
        include: DEVOTIONAL_INCLUDE,
      }),
    );
  }
}
