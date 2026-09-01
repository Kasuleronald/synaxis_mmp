import { randomUUID } from "crypto";
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { WeekdayOrdinal } from "@life-mmp/shared";
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
// Backstop on the month-scanning loop itself for MONTHLY_WEEKDAY (below) --
// belt-and-braces alongside MAX_OCCURRENCES, since that loop walks calendar
// months rather than counting occurrences directly.
const MAX_MONTHS_SCANNED = 1000;

/** The date of the Nth (1-4) or last (-1) occurrence of `weekday` (0=Sun) in
 * a given month -- null if that ordinal doesn't exist (e.g. a 5th Friday in
 * a month that only has four). */
function nthWeekdayOfMonth(year: number, month: number, weekday: number, ordinal: WeekdayOrdinal): Date | null {
  if (ordinal === -1) {
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const diff = (lastDayOfMonth.getDay() - weekday + 7) % 7;
    lastDayOfMonth.setDate(lastDayOfMonth.getDate() - diff);
    return lastDayOfMonth;
  }
  const firstDayOfMonth = new Date(year, month, 1);
  const diff = (weekday - firstDayOfMonth.getDay() + 7) % 7;
  const candidate = new Date(year, month, 1 + diff + (ordinal - 1) * 7);
  return candidate.getMonth() === month ? candidate : null;
}

/** "Every 1st/2nd/3rd Friday" and/or "every last Friday" of the month (Sep
 * 2026) -- ordinals are scanned together per month (sorted), so picking
 * several at once (e.g. 1st+2nd+3rd+4th) produces one occurrence per match,
 * not a separate series per ordinal. */
function computeMonthlyWeekdayOccurrences(
  startsAt: Date,
  until: Date,
  weekday: number,
  ordinals: WeekdayOrdinal[],
  durationMs: number | null,
): { startsAt: Date; endsAt: Date | null }[] {
  const occurrences: { startsAt: Date; endsAt: Date | null }[] = [];
  let year = startsAt.getFullYear();
  let month = startsAt.getMonth();

  for (let scanned = 0; scanned < MAX_MONTHS_SCANNED; scanned++) {
    const datesThisMonth = ordinals
      .map((ordinal) => nthWeekdayOfMonth(year, month, weekday, ordinal))
      .filter((d): d is Date => d !== null)
      .sort((a, b) => a.getTime() - b.getTime());

    for (const date of datesThisMonth) {
      const occurrence = new Date(date);
      occurrence.setHours(startsAt.getHours(), startsAt.getMinutes(), startsAt.getSeconds(), startsAt.getMilliseconds());
      if (occurrence < startsAt) continue;
      if (occurrence > until) return occurrences;
      if (occurrences.length >= MAX_OCCURRENCES) {
        throw new BadRequestException(`That repeats into more than ${MAX_OCCURRENCES} events -- pick a nearer end date.`);
      }
      occurrences.push({
        startsAt: occurrence,
        endsAt: durationMs != null ? new Date(occurrence.getTime() + durationMs) : null,
      });
    }

    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }
  return occurrences;
}

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

  if (recurrence.frequency === "MONTHLY_WEEKDAY") {
    return computeMonthlyWeekdayOccurrences(
      startsAt,
      until,
      recurrence.weekday as number,
      recurrence.ordinals as WeekdayOrdinal[],
      durationMs,
    );
  }

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
