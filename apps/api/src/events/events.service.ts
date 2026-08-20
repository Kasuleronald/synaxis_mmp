import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { runWithTenant, TenantContext } from "../prisma/tenant";
import { NotificationsService } from "../notifications/notifications.service";
import { CreateEventDto } from "./dto/create-event.dto";
import { CreateDebriefDto } from "./dto/create-debrief.dto";

const DEBRIEF_INCLUDE = {
  submittedBy: { select: { id: true, fullName: true } },
} as const;

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(ctx: TenantContext, dto: CreateEventDto) {
    if (!ctx.organizationId) throw new ForbiddenException("Only an organization member can do that");
    return runWithTenant(this.prisma, ctx, (tx) =>
      tx.event.create({
        data: {
          organizationId: ctx.organizationId as string,
          branchId: dto.branchId,
          title: dto.title,
          description: dto.description,
          location: dto.location,
          startsAt: new Date(dto.startsAt),
          endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
        },
      }),
    );
  }

  /** Upcoming first (dashboard widget), then most-recent past. */
  async list(ctx: TenantContext) {
    return runWithTenant(this.prisma, ctx, (tx) =>
      tx.event.findMany({ orderBy: { startsAt: "asc" }, include: { debrief: { select: { id: true } } } }),
    );
  }

  /** Filed once an event has actually happened -- a concrete report type of
   * its own, not just an edit to the event, so it notifies broadly rather
   * than only reaching whoever created the event. */
  async createDebrief(ctx: TenantContext, eventId: string, submittedById: string, dto: CreateDebriefDto) {
    if (!ctx.organizationId) throw new ForbiddenException("Only an organization member can do that");
    return runWithTenant(this.prisma, ctx, async (tx) => {
      const event = await tx.event.findUnique({ where: { id: eventId } });
      if (!event) throw new NotFoundException("Event not found");

      const debrief = await tx.eventDebrief.create({
        data: {
          organizationId: ctx.organizationId as string,
          eventId,
          submittedById,
          venue: dto.venue,
          actualAttendance: dto.actualAttendance,
          ministers: dto.ministers,
          strengths: dto.strengths,
          challenges: dto.challenges,
          recommendations: dto.recommendations,
          notes: dto.notes,
        },
        include: DEBRIEF_INCLUDE,
      });

      // "Broadly" here means church leadership, not literally every login --
      // blasting every Volunteer/Fellowship Leader account on every debrief
      // would just get muted.
      const recipients = await tx.user.findMany({
        where: {
          organizationId: ctx.organizationId as string,
          id: { not: submittedById },
          role: { in: ["ORG_ADMIN", "DEPARTMENT_HEAD"] },
        },
        select: { id: true },
      });
      await this.notifications.notifyWithinTx(
        tx,
        ctx.organizationId as string,
        recipients.map((r) => r.id),
        "EVENT_DEBRIEF_SUBMITTED",
        `A debrief was filed for "${event.title}".`,
        "/events",
      );
      return debrief;
    });
  }

  async getDebrief(ctx: TenantContext, eventId: string) {
    return runWithTenant(this.prisma, ctx, (tx) =>
      tx.eventDebrief.findUnique({ where: { eventId }, include: DEBRIEF_INCLUDE }),
    );
  }
}
