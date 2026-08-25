import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import type { MemberDto, ServiceUnitDto } from "@life-mmp/shared";
import { api } from "../lib/api";
import { MemberSearchSelect } from "../components/MemberSearchSelect";

type ServiceUnitWithCount = ServiceUnitDto & { _count: { members: number } };

const SUGGESTED_NAMES = ["Media", "Ushers", "Protocol", "Music", "Children", "Devotional"];

export function ServiceUnitsPage() {
  const [units, setUnits] = useState<ServiceUnitWithCount[]>([]);
  const [members, setMembers] = useState<MemberDto[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [leaderId, setLeaderId] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const [u, m] = await Promise.all([
      api.get<ServiceUnitWithCount[]>("/service-units"),
      api.get<MemberDto[]>("/members"),
    ]);
    setUnits(u);
    setMembers(m);
  }

  useEffect(() => {
    load();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/service-units", { name, description: description || undefined, leaderId: leaderId || undefined });
      setName("");
      setDescription("");
      setLeaderId("");
      await load();
    } finally {
      setSaving(false);
    }
  }

  const existingNames = new Set(units.map((u) => u.name.toLowerCase()));
  const suggestions = SUGGESTED_NAMES.filter((n) => !existingNames.has(n.toLowerCase()));

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold mb-1">Service Units</h1>
      <p className="text-sm mb-4" style={{ color: "var(--ink-muted)" }}>
        Teams that serve in services and programs -- add members to a unit, then track their
        attendance and absenteeism from that unit's own page.
      </p>

      <form
        onSubmit={onSubmit}
        className="rounded-xl border p-4 mb-3 grid gap-3"
        style={{ borderColor: "var(--line)", background: "var(--surface)" }}
      >
        <div>
          <label className="block text-sm mb-1">Name</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Media"
            className="w-full rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: "var(--line)" }}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Description (optional)</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: "var(--line)" }}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Leader</label>
          <MemberSearchSelect members={members} value={leaderId} onChange={setLeaderId} emptyLabel="None yet" />
        </div>
        <div>
          <button
            type="submit"
            disabled={saving}
            className="rounded-md px-4 py-2 text-sm font-medium disabled:opacity-60"
            style={{ background: "var(--accent)", color: "white" }}
          >
            {saving ? "Adding…" : "Add service unit"}
          </button>
        </div>
      </form>

      {suggestions.length > 0 && (
        <p className="text-xs mb-4" style={{ color: "var(--ink-muted)" }}>
          Common units you don't have yet:{" "}
          {suggestions.map((s, i) => (
            <span key={s}>
              <button type="button" onClick={() => setName(s)} className="underline" style={{ color: "var(--accent-ink)" }}>
                {s}
              </button>
              {i < suggestions.length - 1 ? ", " : ""}
            </span>
          ))}
        </p>
      )}

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--line)" }}>
        {units.length === 0 && (
          <div className="p-4 text-sm" style={{ color: "var(--ink-muted)" }}>
            No service units yet.
          </div>
        )}
        {units.map((u) => (
          <Link
            key={u.id}
            to={`/service-units/${u.id}`}
            className="flex items-center justify-between px-4 py-3 border-t first:border-t-0"
            style={{ borderColor: "var(--line-soft)" }}
          >
            <div>
              <div className="text-sm font-medium">{u.name}</div>
              <div className="text-xs" style={{ color: "var(--ink-muted)" }}>
                {[u.leader?.fullName, u.description].filter(Boolean).join(" · ") || "No details set"}
              </div>
            </div>
            <span className="text-xs font-medium" style={{ color: "var(--accent-ink)" }}>
              {u._count.members} members
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
