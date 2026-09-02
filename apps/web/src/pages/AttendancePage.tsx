import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import type { AttendanceSessionDto, MeetingCategoryDto } from "@life-mmp/shared";
import { api, ApiError } from "../lib/api";
import { IconButton, TrashIcon } from "../components/icons";

type SessionWithCount = AttendanceSessionDto & { _count: { records: number } };

const CUSTOM_OPTION = "__custom__";

export function AttendancePage() {
  const [sessions, setSessions] = useState<SessionWithCount[]>([]);
  const [categories, setCategories] = useState<MeetingCategoryDto[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [customName, setCustomName] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function load() {
    const [sessionList, categoryList] = await Promise.all([
      api.get<SessionWithCount[]>("/attendance/sessions"),
      api.get<MeetingCategoryDto[]>("/meeting-categories"),
    ]);
    setSessions(sessionList);
    const active = categoryList.filter((c) => c.isActive);
    setCategories(active);
    setCategoryId((current) => current || active[0]?.id || CUSTOM_OPTION);
  }

  useEffect(() => {
    load();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    // Guards the double-click case directly -- the backend also rejects an
    // exact name+date repeat, but disabling here stops the second request
    // from ever firing in the first place (Sep 2026).
    if (submitting) return;
    setSubmitting(true);
    setCreateError(null);
    try {
      const category = categories.find((c) => c.id === categoryId);
      const name = category ? category.name : customName;
      await api.post("/attendance/sessions", {
        name,
        date: new Date(date).toISOString(),
        categoryId: category ? category.id : undefined,
      });
      setCustomName("");
      await load();
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : "Couldn't start this session.");
    } finally {
      setSubmitting(false);
    }
  }

  async function onDeleteSession(s: SessionWithCount) {
    const warning =
      s._count.records > 0
        ? `Delete "${s.name}" and its ${s._count.records} check-in${s._count.records === 1 ? "" : "s"}? This can't be undone.`
        : `Delete "${s.name}"? This can't be undone.`;
    if (!window.confirm(warning)) return;
    setDeletingId(s.id);
    try {
      await api.delete(`/attendance/sessions/${s.id}`);
      setSessions((prev) => prev.filter((x) => x.id !== s.id));
    } catch (err) {
      window.alert(err instanceof ApiError ? err.message : "Couldn't delete this session.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold mb-1">Attendance</h1>
      <p className="text-sm mb-4" style={{ color: "var(--ink-muted)" }}>
        Start a session, then check people in manually or by sharing its QR code.
      </p>

      <form
        onSubmit={onSubmit}
        className="rounded-xl border p-4 mb-4 flex flex-wrap gap-2 items-end"
        style={{ borderColor: "var(--line)", background: "var(--surface)" }}
      >
        <div className="flex-1 min-w-[160px]">
          <label className="block text-sm mb-1">Meeting</label>
          <select
            required
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: "var(--line)" }}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
            <option value={CUSTOM_OPTION}>Other (spot meeting)</option>
          </select>
        </div>
        {categoryId === CUSTOM_OPTION && (
          <div className="flex-1 min-w-[160px]">
            <label className="block text-sm mb-1">Name</label>
            <input
              required
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="e.g. Youth camp check-in"
              className="w-full rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: "var(--line)" }}
            />
          </div>
        )}
        <div>
          <label className="block text-sm mb-1">Date</label>
          <input
            required
            type="datetime-local"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: "var(--line)" }}
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md px-4 py-2 text-sm font-medium disabled:opacity-60"
          style={{ background: "var(--accent)", color: "white" }}
        >
          {submitting ? "Starting…" : "Start session"}
        </button>
      </form>
      {createError && (
        <div className="rounded-md px-3 py-2 text-sm mb-4" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
          {createError}
        </div>
      )}
      {categories.length === 0 && (
        <p className="text-xs mb-4" style={{ color: "var(--ink-muted)" }}>
          No meeting types set up yet -- add some under Setup → Organization Admin → Meeting
          categories to track repeat absenteeism per meeting type, or just use "Other" for now.
        </p>
      )}

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--line)" }}>
        {sessions.length === 0 && (
          <div className="p-4 text-sm" style={{ color: "var(--ink-muted)" }}>
            No sessions yet.
          </div>
        )}
        {sessions.map((s) => (
          <div
            key={s.id}
            className="flex items-center justify-between px-4 py-3 border-t first:border-t-0"
            style={{ borderColor: "var(--line-soft)" }}
          >
            <Link to={`/attendance/${s.id}`} className="flex-1 min-w-0">
              <div className="text-sm font-medium">{s.name}</div>
              <div className="text-xs" style={{ color: "var(--ink-muted)" }}>
                {new Date(s.date).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
              </div>
            </Link>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-medium" style={{ color: "var(--accent-ink)" }}>
                {s._count.records} checked in
              </span>
              <IconButton
                title={deletingId === s.id ? "Deleting…" : "Delete this session"}
                onClick={() => onDeleteSession(s)}
              >
                <TrashIcon />
              </IconButton>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
