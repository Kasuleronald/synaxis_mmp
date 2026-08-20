import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import type { AttendanceSessionDto } from "@life-mmp/shared";
import { api } from "../lib/api";

type SessionWithCount = AttendanceSessionDto & { _count: { records: number } };

export function AttendancePage() {
  const [sessions, setSessions] = useState<SessionWithCount[]>([]);
  const [name, setName] = useState("Sunday Service");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 16));

  async function load() {
    setSessions(await api.get<SessionWithCount[]>("/attendance/sessions"));
  }

  useEffect(() => {
    load();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    await api.post("/attendance/sessions", { name, date: new Date(date).toISOString() });
    load();
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
          <label className="block text-sm mb-1">Name</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: "var(--line)" }}
          />
        </div>
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
          className="rounded-md px-4 py-2 text-sm font-medium"
          style={{ background: "var(--accent)", color: "white" }}
        >
          Start session
        </button>
      </form>

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--line)" }}>
        {sessions.length === 0 && (
          <div className="p-4 text-sm" style={{ color: "var(--ink-muted)" }}>
            No sessions yet.
          </div>
        )}
        {sessions.map((s) => (
          <Link
            key={s.id}
            to={`/attendance/${s.id}`}
            className="flex items-center justify-between px-4 py-3 border-t first:border-t-0"
            style={{ borderColor: "var(--line-soft)" }}
          >
            <div>
              <div className="text-sm font-medium">{s.name}</div>
              <div className="text-xs" style={{ color: "var(--ink-muted)" }}>
                {new Date(s.date).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
              </div>
            </div>
            <span className="text-xs font-medium" style={{ color: "var(--accent-ink)" }}>
              {s._count.records} checked in
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
