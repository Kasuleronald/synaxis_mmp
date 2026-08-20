import { useEffect, useState, type FormEvent } from "react";
import type { DiscipleshipProgramDto } from "@life-mmp/shared";
import { api } from "../lib/api";

type ProgramWithCount = DiscipleshipProgramDto & { _count: { classes: number } };

export function DiscipleshipProgramsPage() {
  const [programs, setPrograms] = useState<ProgramWithCount[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  async function load() {
    setPrograms(await api.get<ProgramWithCount[]>("/discipleship/programs"));
  }

  useEffect(() => {
    load();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    await api.post("/discipleship/programs", { name, description: description || undefined });
    setName("");
    setDescription("");
    load();
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold mb-1">Discipleship programs</h1>
      <p className="text-sm mb-4" style={{ color: "var(--ink-muted)" }}>
        The tracks your classes run under -- "Foundations", "Leadership", whatever your school teaches.
      </p>

      <form
        onSubmit={onSubmit}
        className="rounded-xl border p-4 mb-4 grid gap-3"
        style={{ borderColor: "var(--line)", background: "var(--surface)" }}
      >
        <div>
          <label className="block text-sm mb-1">Name</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Foundations"
            className="w-full rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: "var(--line)" }}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Description</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: "var(--line)" }}
          />
        </div>
        <div>
          <button
            type="submit"
            className="rounded-md px-4 py-2 text-sm font-medium"
            style={{ background: "var(--accent)", color: "white" }}
          >
            Create program
          </button>
        </div>
      </form>

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--line)" }}>
        {programs.length === 0 && (
          <div className="p-4 text-sm" style={{ color: "var(--ink-muted)" }}>
            No programs yet.
          </div>
        )}
        {programs.map((p) => (
          <div key={p.id} className="flex items-center justify-between px-4 py-3 border-t first:border-t-0" style={{ borderColor: "var(--line-soft)" }}>
            <div>
              <div className="text-sm font-medium">{p.name}</div>
              {p.description && (
                <div className="text-xs" style={{ color: "var(--ink-muted)" }}>
                  {p.description}
                </div>
              )}
            </div>
            <span className="text-xs font-medium" style={{ color: "var(--accent-ink)" }}>
              {p._count.classes} classes
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
