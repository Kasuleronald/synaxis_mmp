import { useEffect, useState, type FormEvent } from "react";
import type { EventDebriefDto, EventDto } from "@life-mmp/shared";
import { api } from "../lib/api";

export function EventsPage() {
  const [events, setEvents] = useState<EventDto[]>([]);
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [startsAt, setStartsAt] = useState("");

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
    setEvents(await api.get<EventDto[]>("/events"));
  }

  useEffect(() => {
    load();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    await api.post("/events", { title, location: location || undefined, startsAt: new Date(startsAt).toISOString() });
    setTitle("");
    setLocation("");
    setStartsAt("");
    load();
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

  const now = new Date();

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold mb-1">Events</h1>
      <p className="text-sm mb-4" style={{ color: "var(--ink-muted)" }}>
        Services, classes, and gatherings -- create one here, then start an attendance session against it.
        Once an event has happened, file a debrief: venue, actual attendance, strengths, challenges,
        recommendations.
      </p>

      <form
        onSubmit={onSubmit}
        className="rounded-xl border p-4 mb-4 grid gap-3 sm:grid-cols-2"
        style={{ borderColor: "var(--line)", background: "var(--surface)" }}
      >
        <div className="sm:col-span-2">
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
        <div>
          <label className="block text-sm mb-1">When</label>
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
          <label className="block text-sm mb-1">Location</label>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: "var(--line)" }}
          />
        </div>
        <div className="sm:col-span-2">
          <button
            type="submit"
            className="rounded-md px-4 py-2 text-sm font-medium"
            style={{ background: "var(--accent)", color: "white" }}
          >
            Create event
          </button>
        </div>
      </form>

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--line)" }}>
        {events.length === 0 && (
          <div className="p-4 text-sm" style={{ color: "var(--ink-muted)" }}>
            No events yet.
          </div>
        )}
        {events.map((e) => {
          const isPast = new Date(e.startsAt) <= now;
          return (
            <div key={e.id} className="px-4 py-3 border-t first:border-t-0" style={{ borderColor: "var(--line-soft)" }}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">{e.title}</div>
                  <div className="text-xs" style={{ color: "var(--ink-muted)" }}>
                    {new Date(e.startsAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                    {e.location ? ` · ${e.location}` : ""}
                  </div>
                </div>
                {isPast && (
                  e.debrief ? (
                    <button
                      type="button"
                      onClick={() => viewDebrief(e.id)}
                      className="text-xs underline shrink-0"
                      style={{ color: "var(--accent-ink)" }}
                    >
                      {viewingDebriefId === e.id ? "Hide debrief" : "View debrief"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDebriefingId(debriefingId === e.id ? null : e.id)}
                      className="rounded-md px-2.5 py-1 text-xs font-medium shrink-0"
                      style={{ background: "var(--surface-2)", color: "var(--ink)" }}
                    >
                      File debrief
                    </button>
                  )
                )}
              </div>

              {debriefingId === e.id && (
                <div className="mt-3 rounded-md border p-3 grid gap-2 sm:grid-cols-2" style={{ borderColor: "var(--line)" }}>
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
                <div className="mt-3 rounded-md border p-3 text-sm grid gap-1" style={{ borderColor: "var(--line-soft)", background: "var(--surface-2)" }}>
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
          );
        })}
      </div>
    </div>
  );
}
