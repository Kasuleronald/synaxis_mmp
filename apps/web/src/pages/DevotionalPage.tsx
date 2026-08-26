import { useEffect, useState, type FormEvent } from "react";
import { Role, type DevotionalDto } from "@life-mmp/shared";
import { useAuth } from "../context/AuthContext";
import { useTerminology } from "../hooks/useTerminology";
import { api } from "../lib/api";
import { EditIcon, IconButton } from "../components/icons";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function DevotionalPage() {
  const { user } = useAuth();
  const terms = useTerminology();
  const canEdit = user?.role === Role.ORG_ADMIN || user?.isDevotionalEditor;

  const [today, setToday] = useState<DevotionalDto | null>(null);
  const [all, setAll] = useState<DevotionalDto[]>([]);
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState(todayIso());
  const [title, setTitle] = useState("");
  const [scripture, setScripture] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const d = await api.get<DevotionalDto | null>(`/devotionals?date=${todayIso()}`);
    setToday(d);
    setAll(await api.get<DevotionalDto[]>("/devotionals/history"));
  }

  useEffect(() => {
    load();
  }, []);

  // Every date can hold at most one entry (the server upserts by date), so
  // picking a date that already has one loads it for editing here instead
  // of risking a second, silently-merged entry for the same day.
  function loadDate(newDate: string) {
    setDate(newDate);
    const existing = all.find((d) => d.date.slice(0, 10) === newDate) ?? (newDate === todayIso() ? today : null);
    if (existing) {
      setTitle(existing.title);
      setScripture(existing.scripture ?? "");
      setBody(existing.body);
    } else {
      setTitle("");
      setScripture("");
      setBody("");
    }
  }

  function openEditor(existing?: DevotionalDto) {
    const d = existing ? existing.date.slice(0, 10) : todayIso();
    setDate(d);
    setTitle(existing?.title ?? "");
    setScripture(existing?.scripture ?? "");
    setBody(existing?.body ?? "");
    setEditing(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/devotionals", { date, title, scripture: scripture || undefined, body });
      setEditing(false);
      await load();
    } finally {
      setSaving(false);
    }
  }

  const otherEntries = all
    .filter((d) => d.date.slice(0, 10) !== todayIso())
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold mb-1">{terms.devotional}</h1>
      <p className="text-sm mb-4" style={{ color: "var(--ink-muted)" }}>
        One entry per date -- {canEdit ? "write one for today, or schedule as many ahead of time as you like; picking a date that already has one loads it for editing instead of creating a duplicate." : "only appointed editors and the Org Admin can write one."}
      </p>

      {canEdit && !editing && (
        <button
          type="button"
          onClick={() => openEditor()}
          className="rounded-md px-4 py-2 text-sm font-medium mb-4"
          style={{ background: "var(--accent)", color: "white" }}
        >
          Write a {terms.devotional.toLowerCase()}
        </button>
      )}

      {editing && (
        <form
          onSubmit={onSubmit}
          className="rounded-xl border p-4 mb-6 grid gap-3"
          style={{ borderColor: "var(--line)", background: "var(--surface)" }}
        >
          <div>
            <label className="block text-sm mb-1">Date</label>
            <input
              required
              type="date"
              value={date}
              onChange={(e) => loadDate(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: "var(--line)" }}
            />
            {(all.some((d) => d.date.slice(0, 10) === date) || (date === todayIso() && today)) && (
              <p className="text-xs mt-1" style={{ color: "var(--warn)" }}>
                This date already has an entry -- saving will update it, not add a second one.
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm mb-1">Title</label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: "var(--line)" }}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Scripture (optional)</label>
            <input
              value={scripture}
              onChange={(e) => setScripture(e.target.value)}
              placeholder="e.g. Psalm 23:1-6"
              className="w-full rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: "var(--line)" }}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">{terms.devotional}</label>
            <textarea
              required
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              className="w-full rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: "var(--line)" }}
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md px-4 py-2 text-sm font-medium disabled:opacity-60"
              style={{ background: "var(--accent)", color: "white" }}
            >
              {saving ? "Saving…" : "Publish"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-md px-4 py-2 text-sm font-medium"
              style={{ background: "var(--surface-2)", color: "var(--ink)" }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {!editing && (
        <div className="rounded-xl border p-5 mb-6" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
          {today ? (
            <>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs" style={{ color: "var(--ink-muted)" }}>
                  {new Date(today.date).toLocaleDateString(undefined, { dateStyle: "full" })}
                </span>
                {canEdit && (
                  <IconButton title={`Edit today's ${terms.devotional.toLowerCase()}`} onClick={() => openEditor(today)}>
                    <EditIcon />
                  </IconButton>
                )}
              </div>
              <h2 className="text-lg font-semibold mb-1">{today.title}</h2>
              {today.scripture && (
                <p className="text-sm italic mb-3" style={{ color: "var(--accent-ink)" }}>
                  {today.scripture}
                </p>
              )}
              <p className="text-sm whitespace-pre-wrap">{today.body}</p>
              {today.author && (
                <div className="text-xs mt-3" style={{ color: "var(--ink-muted)" }}>
                  By {today.author.fullName}
                </div>
              )}
            </>
          ) : (
            <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
              No {terms.devotional.toLowerCase()} posted for today yet.
            </p>
          )}
        </div>
      )}

      <h2 className="text-sm font-medium mb-3" style={{ color: "var(--ink-muted)" }}>
        Other entries -- past and scheduled ahead
      </h2>
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--line)" }}>
        {otherEntries.length === 0 && (
          <div className="p-4 text-sm" style={{ color: "var(--ink-muted)" }}>
            Nothing else yet.
          </div>
        )}
        {otherEntries.map((d) => {
          const isFuture = d.date.slice(0, 10) > todayIso();
          return (
            <div key={d.id} className="px-4 py-3 border-t first:border-t-0 text-sm" style={{ borderColor: "var(--line-soft)" }}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{d.title}</span>
                <div className="flex items-center gap-2 shrink-0">
                  {isFuture && (
                    <span className="text-xs font-medium rounded-full px-2 py-0.5" style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}>
                      Scheduled
                    </span>
                  )}
                  <span className="text-xs" style={{ color: "var(--ink-muted)" }}>
                    {new Date(d.date).toLocaleDateString(undefined, { dateStyle: "medium" })}
                  </span>
                  {canEdit && (
                    <IconButton title="Edit" onClick={() => openEditor(d)}>
                      <EditIcon />
                    </IconButton>
                  )}
                </div>
              </div>
              {d.scripture && (
                <div className="text-xs italic mt-0.5" style={{ color: "var(--accent-ink)" }}>
                  {d.scripture}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
