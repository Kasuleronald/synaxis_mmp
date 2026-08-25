import { useEffect, useState, type FormEvent } from "react";
import { Role, type DevotionalDto } from "@life-mmp/shared";
import { useAuth } from "../context/AuthContext";
import { useTerminology } from "../hooks/useTerminology";
import { api } from "../lib/api";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function DevotionalPage() {
  const { user } = useAuth();
  const terms = useTerminology();
  const canEdit = user?.role === Role.ORG_ADMIN || user?.isDevotionalEditor;

  const [today, setToday] = useState<DevotionalDto | null>(null);
  const [history, setHistory] = useState<DevotionalDto[]>([]);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [scripture, setScripture] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const d = await api.get<DevotionalDto | null>(`/devotionals?date=${todayIso()}`);
    setToday(d);
    if (d) {
      setTitle(d.title);
      setScripture(d.scripture ?? "");
      setBody(d.body);
    }
    setHistory(await api.get<DevotionalDto[]>("/devotionals/history"));
  }

  useEffect(() => {
    load();
  }, []);

  function openEditor() {
    if (today) {
      setTitle(today.title);
      setScripture(today.scripture ?? "");
      setBody(today.body);
    } else {
      setTitle("");
      setScripture("");
      setBody("");
    }
    setEditing(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/devotionals", { date: todayIso(), title, scripture: scripture || undefined, body });
      setEditing(false);
      await load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold mb-1">{terms.devotional}</h1>
      <p className="text-sm mb-4" style={{ color: "var(--ink-muted)" }}>
        One entry a day, visible to everyone signed in.{" "}
        {canEdit ? "You can write or update today's." : "Only appointed editors and the Org Admin can write one."}
      </p>

      {canEdit && !editing && (
        <button
          type="button"
          onClick={openEditor}
          className="rounded-md px-4 py-2 text-sm font-medium mb-4"
          style={{ background: "var(--accent)", color: "white" }}
        >
          {today ? "Edit today's devotional" : "Write today's devotional"}
        </button>
      )}

      {editing && (
        <form
          onSubmit={onSubmit}
          className="rounded-xl border p-4 mb-6 grid gap-3"
          style={{ borderColor: "var(--line)", background: "var(--surface)" }}
        >
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
            <label className="block text-sm mb-1">Devotional</label>
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
              <div className="text-xs mb-1" style={{ color: "var(--ink-muted)" }}>
                {new Date(today.date).toLocaleDateString(undefined, { dateStyle: "full" })}
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
              Nothing posted for today yet.
            </p>
          )}
        </div>
      )}

      <h2 className="text-sm font-medium mb-3" style={{ color: "var(--ink-muted)" }}>
        Past devotionals
      </h2>
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--line)" }}>
        {history.filter((d) => d.date.slice(0, 10) !== todayIso()).length === 0 && (
          <div className="p-4 text-sm" style={{ color: "var(--ink-muted)" }}>
            Nothing else yet.
          </div>
        )}
        {history
          .filter((d) => d.date.slice(0, 10) !== todayIso())
          .map((d) => (
            <div key={d.id} className="px-4 py-3 border-t first:border-t-0 text-sm" style={{ borderColor: "var(--line-soft)" }}>
              <div className="flex items-center justify-between">
                <span className="font-medium">{d.title}</span>
                <span className="text-xs" style={{ color: "var(--ink-muted)" }}>
                  {new Date(d.date).toLocaleDateString(undefined, { dateStyle: "medium" })}
                </span>
              </div>
              {d.scripture && (
                <div className="text-xs italic mt-0.5" style={{ color: "var(--accent-ink)" }}>
                  {d.scripture}
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
