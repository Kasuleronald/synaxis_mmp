import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { ClassEnrollmentDto, DiscipleshipClassDto, MemberDto } from "@life-mmp/shared";
import { api } from "../lib/api";

type ClassDetail = DiscipleshipClassDto & { enrollments: ClassEnrollmentDto[] };

export function DiscipleshipClassDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [cls, setCls] = useState<ClassDetail | null>(null);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<MemberDto[]>([]);
  const [starting, setStarting] = useState(false);

  async function load() {
    if (!id) return;
    setCls(await api.get<ClassDetail>(`/discipleship/classes/${id}`));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (search.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      api.get<MemberDto[]>(`/members?q=${encodeURIComponent(search)}`).then(setResults).catch(() => setResults([]));
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  async function enroll(memberId: string) {
    if (!id) return;
    await api.post(`/discipleship/classes/${id}/enroll`, { memberId });
    setSearch("");
    setResults([]);
    load();
  }

  async function startSession() {
    if (!id || !cls) return;
    setStarting(true);
    try {
      const session = await api.post<{ id: string }>("/attendance/sessions", {
        classId: id,
        name: cls.name,
        date: new Date().toISOString(),
      });
      navigate(`/attendance/${session.id}`);
    } finally {
      setStarting(false);
    }
  }

  if (!cls) {
    return <div className="text-sm" style={{ color: "var(--ink-muted)" }}>Loading…</div>;
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-semibold">{cls.name}</h1>
        <button
          type="button"
          disabled={starting}
          onClick={startSession}
          className="rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-60"
          style={{ background: "var(--accent)", color: "white" }}
        >
          {starting ? "Starting…" : "Start attendance session"}
        </button>
      </div>
      <p className="text-sm mb-6" style={{ color: "var(--ink-muted)" }}>
        {cls.program?.name}
      </p>

      <section className="rounded-xl border p-4 mb-6" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
        <h2 className="text-sm font-medium mb-3">Enroll a member</h2>
        <div className="relative">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name…"
            className="w-full rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: "var(--line)" }}
          />
          {results.length > 0 && (
            <div className="absolute z-10 mt-1 w-full rounded-md border shadow-lg" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
              {results.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => enroll(m.id)}
                  className="block w-full text-left px-3 py-2 text-sm"
                  style={{ color: "var(--ink)" }}
                >
                  {m.fullName}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <h2 className="text-sm font-medium mb-3" style={{ color: "var(--ink-muted)" }}>
        Enrolled ({cls.enrollments.length})
      </h2>
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--line)" }}>
        {cls.enrollments.length === 0 && (
          <div className="p-4 text-sm" style={{ color: "var(--ink-muted)" }}>
            No one enrolled yet.
          </div>
        )}
        {cls.enrollments.map((e) => (
          <div key={e.id} className="flex items-center justify-between px-4 py-3 border-t first:border-t-0" style={{ borderColor: "var(--line-soft)" }}>
            <span className="text-sm">{e.member?.fullName}</span>
            <span className="text-xs" style={{ color: "var(--ink-muted)" }}>
              {e.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
