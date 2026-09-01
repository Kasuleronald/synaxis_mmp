import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  RECURRENCE_FREQUENCY_LABELS,
  RecurrenceFrequency,
  WEEKDAY_NAMES,
  WEEKDAY_ORDINALS,
  WEEKDAY_ORDINAL_LABELS,
  type EventDebriefDto,
  type EventDto,
  type MeetingCategoryDto,
  type WeekdayOrdinal,
} from "@life-mmp/shared";
import { api } from "../lib/api";
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon, IconButton } from "../components/icons";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Always 42 cells (6 full weeks) so the grid is the same height every
 * month -- a 4-week February and a 6-week October never make the page jump. */
function buildMonthGrid(monthAnchor: Date): Date[] {
  const first = startOfMonth(monthAnchor);
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });
}

/** Local-datetime-input <-> ISO. `datetime-local` has no timezone of its
 * own -- read and written as the wall-clock value the person typed. */
function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EventsPage() {
  const [events, setEvents] = useState<EventDto[]>([]);
  const [categories, setCategories] = useState<MeetingCategoryDto[]>([]);
  const [monthAnchor, setMonthAnchor] = useState(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [repeats, setRepeats] = useState(false);
  const [frequency, setFrequency] = useState<RecurrenceFrequency>("WEEKLY");
  const [repeatUntil, setRepeatUntil] = useState("");
  const [weekday, setWeekday] = useState(5);
  const [ordinals, setOrdinals] = useState<WeekdayOrdinal[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [debriefingId, setDebriefingId] = useState<string | null>(null);
  const [venue, setVenue] = useState("");
  const [actualAttendance, setActualAttendance] = useState("");
  const [ministers, setMinisters] = useState("");
  const [strengths, setStrengths] = useState("");
  const [challenges, setChallenges] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [debriefNotes, setDebriefNotes] = useState("");
  const [savingDebrief, setSavingDebrief] = useState(false);

  const [viewingDebriefId, setViewingDebriefId] = useState<string | null>(null);
  const [viewedDebrief, setViewedDebrief] = useState<EventDebriefDto | null>(null);

  async function load() {
    const [eventList, categoryList] = await Promise.all([
      api.get<EventDto[]>("/events"),
      api.get<MeetingCategoryDto[]>("/meeting-categories"),
    ]);
    setEvents(eventList);
    setCategories(categoryList.filter((c) => c.isActive));
  }

  useEffect(() => {
    load();
  }, []);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, EventDto[]>();
    for (const e of events) {
      const key = dateKey(new Date(e.startsAt));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    for (const list of map.values()) list.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    return map;
  }, [events]);

  const grid = useMemo(() => buildMonthGrid(monthAnchor), [monthAnchor]);
  const today = new Date();
  const monthLabel = monthAnchor.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  function openCreate(defaultDate?: Date) {
    setCreateError(null);
    setTitle("");
    setLocation("");
    const base = defaultDate ?? new Date();
    const withTime = new Date(base);
    if (!defaultDate) {
      // Opened from the toolbar with no specific day in mind -- round to the
      // next half hour so the picker doesn't default to a stray minute.
      withTime.setMinutes(withTime.getMinutes() < 30 ? 30 : 0, 0, 0);
      if (withTime.getMinutes() === 0) withTime.setHours(withTime.getHours() + 1);
    } else {
      withTime.setHours(9, 0, 0, 0);
    }
    setStartsAt(toLocalInputValue(withTime.toISOString()));
    setEndsAt("");
    setRepeats(false);
    setFrequency("WEEKLY");
    setRepeatUntil("");
    setWeekday(withTime.getDay());
    setOrdinals([]);
    setCategoryId("");
    setShowCreate(true);
  }

  function onFrequencyChange(next: RecurrenceFrequency) {
    setFrequency(next);
    // Default the weekday picker to whatever day the chosen start date
    // actually falls on -- "every 1st/2nd/3rd Friday" only makes sense
    // starting from a Friday-shaped default, not last month's leftover pick.
    if (next === "MONTHLY_WEEKDAY" && startsAt) setWeekday(new Date(startsAt).getDay());
  }

  function toggleOrdinal(ordinal: WeekdayOrdinal) {
    setOrdinals((prev) => (prev.includes(ordinal) ? prev.filter((o) => o !== ordinal) : [...prev, ordinal]));
  }

  async function onSubmitCreate(e: FormEvent) {
    e.preventDefault();
    if (repeats && frequency === "MONTHLY_WEEKDAY" && ordinals.length === 0) {
      setCreateError("Pick at least one occurrence (1st, 2nd, 3rd, 4th, or Last) for the monthly-by-weekday repeat.");
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      await api.post("/events", {
        title,
        location: location || undefined,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: endsAt ? new Date(endsAt).toISOString() : undefined,
        categoryId: categoryId || undefined,
        recurrence:
          repeats && repeatUntil
            ? {
                frequency,
                until: new Date(repeatUntil).toISOString(),
                ...(frequency === "MONTHLY_WEEKDAY" ? { weekday, ordinals } : {}),
              }
            : undefined,
      });
      setShowCreate(false);
      await load();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Couldn't create this event.");
    } finally {
      setCreating(false);
    }
  }

  function resetDebriefForm() {
    setVenue("");
    setActualAttendance("");
    setMinisters("");
    setStrengths("");
    setChallenges("");
    setRecommendations("");
    setDebriefNotes("");
  }

  async function submitDebrief(eventId: string) {
    setSavingDebrief(true);
    try {
      await api.post(`/events/${eventId}/debrief`, {
        venue: venue || undefined,
        actualAttendance: actualAttendance ? Number(actualAttendance) : undefined,
        ministers: ministers || undefined,
        strengths: strengths || undefined,
        challenges: challenges || undefined,
        recommendations: recommendations || undefined,
        notes: debriefNotes || undefined,
      });
      setDebriefingId(null);
      resetDebriefForm();
      await load();
    } finally {
      setSavingDebrief(false);
    }
  }

  async function viewDebrief(eventId: string) {
    if (viewingDebriefId === eventId) {
      setViewingDebriefId(null);
      return;
    }
    const debrief = await api.get<EventDebriefDto>(`/events/${eventId}/debrief`);
    setViewedDebrief(debrief);
    setViewingDebriefId(eventId);
  }

  function toggleExpanded(eventId: string) {
    setExpandedEventId(expandedEventId === eventId ? null : eventId);
    setDebriefingId(null);
    setViewingDebriefId(null);
  }

  const dayDialogEvents = selectedDay ? (eventsByDay.get(dateKey(selectedDay)) ?? []) : [];

  return (
    <div className="max-w-4xl">
      <h1 className="text-xl font-semibold mb-1">Events</h1>
      <p className="text-sm mb-4" style={{ color: "var(--ink-muted)" }}>
        Services, classes, and gatherings -- creating one here also creates its public attendance
        registration link automatically, so people can check themselves in and you can track and plan
        around real numbers. Once an event has happened, file a debrief: venue, actual attendance,
        strengths, challenges, recommendations.
      </p>

      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <IconButton title="Previous month" onClick={() => setMonthAnchor((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}>
            <ChevronLeftIcon />
          </IconButton>
          <h2 className="text-base font-semibold min-w-[9rem] text-center">{monthLabel}</h2>
          <IconButton title="Next month" onClick={() => setMonthAnchor((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}>
            <ChevronRightIcon />
          </IconButton>
          <button
            type="button"
            onClick={() => setMonthAnchor(startOfMonth(new Date()))}
            className="rounded-md px-3 py-1.5 text-xs font-medium"
            style={{ background: "var(--surface-2)", color: "var(--ink)" }}
          >
            Today
          </button>
          <input
            type="date"
            title="Go to date"
            onChange={(e) => {
              if (!e.target.value) return;
              const [y, m] = e.target.value.split("-").map(Number);
              setMonthAnchor(new Date(y, m - 1, 1));
            }}
            className="rounded-md border px-2 py-1.5 text-xs"
            style={{ borderColor: "var(--line)" }}
          />
        </div>
        <button
          type="button"
          onClick={() => openCreate()}
          className="rounded-md px-3 py-1.5 text-sm font-medium"
          style={{ background: "var(--accent)", color: "white" }}
        >
          + New event
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAY_LABELS.map((w) => (
          <div key={w} className="text-center text-xs font-medium py-1" style={{ color: "var(--ink-muted)" }}>
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {grid.map((day) => {
          const inMonth = day.getMonth() === monthAnchor.getMonth();
          const isToday = sameDay(day, today);
          const dayEvents = eventsByDay.get(dateKey(day)) ?? [];
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => setSelectedDay(day)}
              className="rounded-lg border p-1.5 text-left flex flex-col items-stretch"
              style={{
                borderColor: isToday ? "var(--accent)" : "var(--line)",
                borderWidth: isToday ? 2 : 1,
                background: "var(--surface)",
                opacity: inMonth ? 1 : 0.4,
                minHeight: 96,
              }}
            >
              <span
                className="text-xs font-medium mb-1"
                style={{ color: isToday ? "var(--accent-ink)" : "var(--ink-muted)" }}
              >
                {day.getDate()}
              </span>
              <div className="grid gap-0.5 overflow-hidden">
                {dayEvents.slice(0, 3).map((e) => (
                  <div
                    key={e.id}
                    className="truncate rounded px-1 py-0.5"
                    style={{ background: "var(--accent-soft)", color: "var(--accent-ink)", fontSize: "11px" }}
                  >
                    {e.title}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div style={{ fontSize: "11px", color: "var(--ink-muted)" }}>+{dayEvents.length - 3} more</div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {selectedDay && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => setSelectedDay(null)}
        >
          <div
            className="w-full max-w-lg rounded-xl border max-h-[85vh] overflow-y-auto"
            style={{ borderColor: "var(--line)", background: "var(--surface)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--line-soft)" }}>
              <h2 className="text-lg font-semibold">
                {selectedDay.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
              </h2>
              <div className="flex items-center gap-1">
                <IconButton title="Add event on this day" onClick={() => openCreate(selectedDay)}>
                  <span className="text-lg leading-none">+</span>
                </IconButton>
                <IconButton title="Close" onClick={() => setSelectedDay(null)}>
                  <CloseIcon />
                </IconButton>
              </div>
            </div>

            <div className="p-3">
              {dayDialogEvents.length === 0 && (
                <p className="text-sm p-2" style={{ color: "var(--ink-muted)" }}>
                  Nothing scheduled this day.
                </p>
              )}
              {dayDialogEvents.map((e) => {
                const isPast = new Date(e.startsAt) <= today;
                const isExpanded = expandedEventId === e.id;
                return (
                  <div key={e.id} className="rounded-lg border mb-2" style={{ borderColor: "var(--line-soft)" }}>
                    <button
                      type="button"
                      onClick={() => toggleExpanded(e.id)}
                      className="w-full text-left px-3 py-2.5 flex items-center justify-between gap-2"
                    >
                      <div>
                        <div className="text-sm font-medium">{e.title}</div>
                        <div className="text-xs" style={{ color: "var(--ink-muted)" }}>
                          {new Date(e.startsAt).toLocaleTimeString(undefined, { timeStyle: "short" })}
                          {e.endsAt ? ` – ${new Date(e.endsAt).toLocaleTimeString(undefined, { timeStyle: "short" })}` : ""}
                          {e.location ? ` · ${e.location}` : ""}
                          {e.recurrenceGroupId ? " · repeats" : ""}
                        </div>
                      </div>
                      <span className="text-xs shrink-0" style={{ color: "var(--ink-muted)" }}>
                        {isExpanded ? "▲" : "▼"}
                      </span>
                    </button>

                    {isExpanded && (
                      <div className="px-3 pb-3">
                        <div className="flex items-center gap-3 flex-wrap mb-2">
                          {e.attendanceSessions?.[0] && (
                            <Link
                              to={`/attendance/${e.attendanceSessions[0].id}`}
                              className="text-xs underline"
                              style={{ color: "var(--accent-ink)" }}
                            >
                              Attendance link
                            </Link>
                          )}
                          {isPast &&
                            (e.debrief ? (
                              <button
                                type="button"
                                onClick={() => viewDebrief(e.id)}
                                className="text-xs underline"
                                style={{ color: "var(--accent-ink)" }}
                              >
                                {viewingDebriefId === e.id ? "Hide debrief" : "View debrief"}
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setDebriefingId(debriefingId === e.id ? null : e.id)}
                                className="rounded-md px-2.5 py-1 text-xs font-medium"
                                style={{ background: "var(--surface-2)", color: "var(--ink)" }}
                              >
                                File debrief
                              </button>
                            ))}
                        </div>

                        {debriefingId === e.id && (
                          <div className="rounded-md border p-3 grid gap-2 sm:grid-cols-2" style={{ borderColor: "var(--line)" }}>
                            <input value={venue} onChange={(ev) => setVenue(ev.target.value)} placeholder="Venue" className="rounded-md border px-2 py-1.5 text-sm" style={{ borderColor: "var(--line)" }} />
                            <input type="number" min="0" value={actualAttendance} onChange={(ev) => setActualAttendance(ev.target.value)} placeholder="Actual attendance" className="rounded-md border px-2 py-1.5 text-sm" style={{ borderColor: "var(--line)" }} />
                            <input value={ministers} onChange={(ev) => setMinisters(ev.target.value)} placeholder="Ministers involved" className="rounded-md border px-2 py-1.5 text-sm sm:col-span-2" style={{ borderColor: "var(--line)" }} />
                            <textarea value={strengths} onChange={(ev) => setStrengths(ev.target.value)} placeholder="Strengths" rows={2} className="rounded-md border px-2 py-1.5 text-sm" style={{ borderColor: "var(--line)" }} />
                            <textarea value={challenges} onChange={(ev) => setChallenges(ev.target.value)} placeholder="Challenges" rows={2} className="rounded-md border px-2 py-1.5 text-sm" style={{ borderColor: "var(--line)" }} />
                            <textarea value={recommendations} onChange={(ev) => setRecommendations(ev.target.value)} placeholder="Recommendations" rows={2} className="rounded-md border px-2 py-1.5 text-sm sm:col-span-2" style={{ borderColor: "var(--line)" }} />
                            <input value={debriefNotes} onChange={(ev) => setDebriefNotes(ev.target.value)} placeholder="Other notes" className="rounded-md border px-2 py-1.5 text-sm sm:col-span-2" style={{ borderColor: "var(--line)" }} />
                            <div className="sm:col-span-2 flex gap-2">
                              <button type="button" disabled={savingDebrief} onClick={() => submitDebrief(e.id)} className="rounded-md px-3 py-1.5 text-xs font-medium disabled:opacity-60" style={{ background: "var(--accent)", color: "white" }}>
                                {savingDebrief ? "Saving…" : "Submit debrief"}
                              </button>
                              <button type="button" onClick={() => { setDebriefingId(null); resetDebriefForm(); }} className="rounded-md px-3 py-1.5 text-xs font-medium" style={{ background: "var(--surface-2)", color: "var(--ink)" }}>
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}

                        {viewingDebriefId === e.id && viewedDebrief && (
                          <div className="rounded-md border p-3 text-sm grid gap-1" style={{ borderColor: "var(--line-soft)", background: "var(--surface-2)" }}>
                            {viewedDebrief.venue && <div><strong>Venue:</strong> {viewedDebrief.venue}</div>}
                            {viewedDebrief.actualAttendance != null && <div><strong>Actual attendance:</strong> {viewedDebrief.actualAttendance}</div>}
                            {viewedDebrief.ministers && <div><strong>Ministers:</strong> {viewedDebrief.ministers}</div>}
                            {viewedDebrief.strengths && <div><strong>Strengths:</strong> {viewedDebrief.strengths}</div>}
                            {viewedDebrief.challenges && <div><strong>Challenges:</strong> {viewedDebrief.challenges}</div>}
                            {viewedDebrief.recommendations && <div><strong>Recommendations:</strong> {viewedDebrief.recommendations}</div>}
                            {viewedDebrief.notes && <div><strong>Notes:</strong> {viewedDebrief.notes}</div>}
                            <div className="text-xs mt-1" style={{ color: "var(--ink-muted)" }}>
                              Filed by {viewedDebrief.submittedBy?.fullName} · {new Date(viewedDebrief.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => setShowCreate(false)}
        >
          <form
            onSubmit={onSubmitCreate}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-xl border p-5 grid gap-3 max-h-[90vh] overflow-y-auto"
            style={{ borderColor: "var(--line)", background: "var(--surface)" }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">New event</h2>
              <IconButton title="Close" onClick={() => setShowCreate(false)}>
                <CloseIcon />
              </IconButton>
            </div>

            <div>
              <label className="block text-sm mb-1">Title</label>
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Sunday Service"
                className="w-full rounded-md border px-3 py-2 text-sm"
                style={{ borderColor: "var(--line)" }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm mb-1">Starts</label>
                <input
                  required
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  style={{ borderColor: "var(--line)" }}
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Ends (optional)</label>
                <input
                  type="datetime-local"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                  min={startsAt || undefined}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  style={{ borderColor: "var(--line)" }}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm mb-1">Location</label>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm"
                style={{ borderColor: "var(--line)" }}
              />
            </div>

            {categories.length > 0 && (
              <div>
                <label className="block text-sm mb-1">Meeting category (optional)</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  style={{ borderColor: "var(--line)" }}
                >
                  <option value="">None</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="rounded-md border p-3" style={{ borderColor: "var(--line)" }}>
              <label className="flex items-center gap-2 text-sm mb-1">
                <input type="checkbox" checked={repeats} onChange={(e) => setRepeats(e.target.checked)} />
                Repeats
              </label>
              {repeats && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <select
                    value={frequency}
                    onChange={(e) => onFrequencyChange(e.target.value as RecurrenceFrequency)}
                    className="rounded-md border px-2 py-1.5 text-sm"
                    style={{ borderColor: "var(--line)" }}
                  >
                    {Object.entries(RECURRENCE_FREQUENCY_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                  <input
                    required={repeats}
                    type="date"
                    value={repeatUntil}
                    onChange={(e) => setRepeatUntil(e.target.value)}
                    title="Repeat until"
                    className="rounded-md border px-2 py-1.5 text-sm"
                    style={{ borderColor: "var(--line)" }}
                  />
                  {frequency === "MONTHLY_WEEKDAY" && (
                    <div className="col-span-2 grid gap-2">
                      <select
                        value={weekday}
                        onChange={(e) => setWeekday(Number(e.target.value))}
                        className="rounded-md border px-2 py-1.5 text-sm"
                        style={{ borderColor: "var(--line)" }}
                      >
                        {WEEKDAY_NAMES.map((name, i) => (
                          <option key={name} value={i}>
                            {name}
                          </option>
                        ))}
                      </select>
                      <div className="flex flex-wrap gap-2">
                        {WEEKDAY_ORDINALS.map((ordinal) => (
                          <label
                            key={ordinal}
                            className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                            style={
                              ordinals.includes(ordinal)
                                ? { background: "var(--accent-soft)", color: "var(--accent-ink)" }
                                : { background: "var(--surface-2)", color: "var(--ink-muted)" }
                            }
                          >
                            <input
                              type="checkbox"
                              className="hidden"
                              checked={ordinals.includes(ordinal)}
                              onChange={() => toggleOrdinal(ordinal)}
                            />
                            {WEEKDAY_ORDINAL_LABELS[ordinal]}
                          </label>
                        ))}
                      </div>
                      <p className="text-xs" style={{ color: "var(--ink-muted)" }}>
                        e.g. tick 1st, 2nd, 3rd &amp; 4th for "every {WEEKDAY_NAMES[weekday]} except the last one" and
                        just "Last" for the month's final {WEEKDAY_NAMES[weekday]}.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {createError && (
              <div className="rounded-md px-3 py-2 text-sm" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
                {createError}
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={creating}
                className="rounded-md px-4 py-2 text-sm font-medium disabled:opacity-60"
                style={{ background: "var(--accent)", color: "white" }}
              >
                {creating ? "Creating…" : "Create event"}
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="rounded-md px-4 py-2 text-sm font-medium"
                style={{ background: "var(--surface-2)", color: "var(--ink)" }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
