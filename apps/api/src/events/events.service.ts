import { randomUUID } from "crypto";
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { runWithTenant, TenantContext } from "../prisma/tenant";
import { NotificationsService } from "../notifications/notifications.service";
import { CreateEventDto } from "./dto/create-event.dto";
import { CreateDebriefDto } from "./dto/create-debrief.dto";

const DEBRIEF_INCLUDE = {
  submittedBy: { select: { id: true, fullName: true } },
} as const;

// A generous cap, not a real-world expectation -- weekly for two years,
// daily for ~3.5 months, or monthly for 8+ years all land under it. Exists
// so a mistyped "until" decades out can't silently generate thousands of
// rows (and attendance sessions to match) in one request.
const MAX_OCCURRENCES = 104;

/** One row per occurrence, each keeping the original's time-of-day and
 * duration -- a plain one-off event is just the degenerate one-occurrence
 * case, so create() never has to branch on whether recurrence was set. */
function computeOccurrences(
  startsAt: Date,
  endsAt: Date | null,
  recurrence: CreateEventDto["recurrence"],
): { startsAt: Date; endsAt: Date | null }[] {
  if (!recurrence) return [{ startsAt, endsAt }];

  const until = new Date(recurrence.until);
  if (until < startsAt) {
    throw new BadRequestException("The recurrence end date can't be before the event's own start.");
  }
  const durationMs = endsAt ? endsAt.getTime() - startsAt.getTime() : null;

  const occurrences: { startsAt: Date; endsAt: Date | null }[] = [];
  const cursor = new Date(startsAt);
  while (cursor <= until) {
    if (occurrences.length >= MAX_OCCURRENCES) {
      throw new BadRequestException(`That repeats into more than ${MAX_OCCURRENCES} events -- pick a nearer end date.`);
    }
    occurrences.push({
      startsAt: new Date(cursor),
      endsAt: durationMs != null ? new Date(cursor.getTime() + durationMs) : null,
    });
    switch (recurrence.frequency) {
      case "DAILY":
        cursor.setDate(cursor.getDate() + 1);
        break;
      case "WEEKLY":
        cursor.setDate(cursor.getDate() + 7);
        break;
      case "MONTHLY":
        cursor.setMonth(cursor.getMonth() + 1);
        break;
    }
  }
  return occurrences;
}

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Every event gets a linked attendance session at creation time (Aug 2026:
   * "when events are entered, there must be a link created for the public to
   * register their attendance") -- reuses the existing check-in/QR
   * infrastructure entirely rather than a parallel registration system, so
   * the public link is just this session's already-working /checkin/:token
   * page. A recurring create produces one such event+session pair per
   * occurrence, sharing a recurrenceGroupId -- each occurrence is a fully
   * independent event afterward (own debrief, own attendance). */
  async create(ctx: TenantContext, dto: CreateEventDto) {
    if (!ctx.organizationId) throw new ForbiddenException("Only an organization member can do that");
    const occurrences = computeOccurrences(
      new Date(dto.startsAt),
      dto.endsAt ? new Date(dto.endsAt) : null,
      dto.recurrence,
    );
    return runWithTenant(this.prisma, ctx, async (tx) => {
      const recurrenceGroupId = occurrences.length > 1 ? randomUUID() : undefined;
      const created = [];
      for (const occ of occurrences) {
        const event = await tx.event.create({
          data: {
            organizationId: ctx.organizationId as string,
            branchId: dto.branchId,
            title: dto.title,
            description: dto.description,
            location: dto.location,
            startsAt: occ.startsAt,
            endsAt: occ.endsAt ?? undefined,
            recurrenceGroupId,
            categoryId: dto.categoryId,
          },
        });
        const session = await tx.attendanceSession.create({
          data: {
            organizationId: ctx.organizationId as string,
            branchId: dto.branchId,
            eventId: event.id,
            categoryId: dto.categoryId,
            name: event.title,
            date: event.startsAt,
          },
          select: { id: true, qrToken: true },
        });
        created.push({ ...event, attendanceSessions: [session] });
      }
      return created.length === 1 ? created[0] : { events: created };
    });
  }

  /** Upcoming first (dashboard widget), then most-recent past. */
  async list(ctx: TenantContext) {
    return runWithTenant(this.prisma, ctx, (tx) =>
      tx.event.findMany({
        orderBy: { startsAt: "asc" },
        include: {
          debrief: { select: { id: true } },
          attendanceSessions: { select: { id: true, qrToken: true }, take: 1, orderBy: { createdAt: "asc" } },
        },
      }),
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
