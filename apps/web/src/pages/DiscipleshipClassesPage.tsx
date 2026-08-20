import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import type { DiscipleshipClassDto, DiscipleshipProgramDto } from "@life-mmp/shared";
import { api } from "../lib/api";

type ClassWithCount = DiscipleshipClassDto & { _count: { enrollments: number } };

export function DiscipleshipClassesPage() {
  const [classes, setClasses] = useState<ClassWithCount[]>([]);
  const [programs, setPrograms] = useState<DiscipleshipProgramDto[]>([]);
  const [name, setName] = useState("");
  const [programId, setProgramId] = useState("");

  async function load() {
    const [c, p] = await Promise.all([
      api.get<ClassWithCount[]>("/discipleship/classes"),
      api.get<DiscipleshipProgramDto[]>("/discipleship/programs"),
    ]);
    setClasses(c);
    setPrograms(p);
  }

  useEffect(() => {
    load();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    await api.post("/discipleship/classes", { name, programId });
    setName("");
    load();
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold mb-1">Classes</h1>
      <p className="text-sm mb-4" style={{ color: "var(--ink-muted)" }}>
        One cohort/run of a program -- enroll members, then track attendance the same way a service does.
      </p>

      {programs.length === 0 ? (
        <p className="text-sm mb-4" style={{ color: "var(--ink-muted)" }}>
          <Link to="/discipleship/programs" style={{ color: "var(--accent-ink)" }}>
            Create a program
          </Link>{" "}
          first.
        </p>
      ) : (
        <form
          onSubmit={onSubmit}
          className="rounded-xl border p-4 mb-4 grid gap-3 sm:grid-cols-2"
          style={{ borderColor: "var(--line)", background: "var(--surface)" }}
        >
          <div>
            <label className="block text-sm mb-1">Program</label>
            <select
              required
              value={programId}
              onChange={(e) => setProgramId(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: "var(--line)" }}
            >
              <option value="">Choose one</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Class name</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Foundations - Jan 2027 cohort"
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
              Create class
            </button>
          </div>
        </form>
      )}

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--line)" }}>
        {classes.length === 0 && (
          <div className="p-4 text-sm" style={{ color: "var(--ink-muted)" }}>
            No classes yet.
          </div>
        )}
        {classes.map((c) => (
          <Link
            key={c.id}
            to={`/discipleship/classes/${c.id}`}
            className="flex items-center justify-between px-4 py-3 border-t first:border-t-0"
            style={{ borderColor: "var(--line-soft)" }}
          >
            <div>
              <div className="text-sm font-medium">{c.name}</div>
              <div className="text-xs" style={{ color: "var(--ink-muted)" }}>
                {c.program?.name}
              </div>
            </div>
            <span className="text-xs font-medium" style={{ color: "var(--accent-ink)" }}>
              {c._count.enrollments} enrolled
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
