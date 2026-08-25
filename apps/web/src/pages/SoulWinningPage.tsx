import { useEffect, useState, type FormEvent } from "react";
import {
  SOUL_WINNING_STAGE_LABELS,
  SOUL_WINNING_STAGE_ORDER,
  type FellowshipDto,
  type DiscipleshipClassDto,
  type MemberDto,
  type SoulWinningRecordDto,
  type SoulWinningStage,
  type UserDto,
} from "@life-mmp/shared";
import { api, ApiError } from "../lib/api";

function nextStage(current: SoulWinningStage): SoulWinningStage | null {
  const idx = SOUL_WINNING_STAGE_ORDER.indexOf(current);
  if (idx === -1 || idx === SOUL_WINNING_STAGE_ORDER.length - 1) return null;
  return SOUL_WINNING_STAGE_ORDER[idx + 1];
}

export function SoulWinningPage() {
  const [records, setRecords] = useState<SoulWinningRecordDto[]>([]);
  const [users, setUsers] = useState<UserDto[]>([]);
  const [fellowships, setFellowships] = useState<FellowshipDto[]>([]);
  const [classes, setClasses] = useState<DiscipleshipClassDto[]>([]);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [assignedToId, setAssignedToId] = useState("");
  const [saving, setSaving] = useState(false);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pendingFellowshipId, setPendingFellowshipId] = useState("");
  const [pendingClassId, setPendingClassId] = useState("");

  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [convertAddress, setConvertAddress] = useState("");
  const [convertError, setConvertError] = useState<string | null>(null);

  async function load() {
    const [r, u, f, c] = await Promise.all([
      api.get<SoulWinningRecordDto[]>("/soul-winning"),
      api.get<UserDto[]>("/users"),
      api.get<FellowshipDto[]>("/fellowships"),
      api.get<DiscipleshipClassDto[]>("/discipleship/classes"),
    ]);
    setRecords(r);
    setUsers(u);
    setFellowships(f);
    setClasses(c);
  }

  useEffect(() => {
    load();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/soul-winning", {
        fullName,
        phone: phone || undefined,
        address: address || undefined,
        assignedToId: assignedToId || undefined,
      });
      setFullName("");
      setPhone("");
      setAddress("");
      setAssignedToId("");
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function advance(record: SoulWinningRecordDto) {
    const stage = nextStage(record.stage);
    if (!stage) return;
    await api.post(`/soul-winning/${record.id}/advance-stage`, {
      stage,
      fellowshipId: stage === "ALLOCATED_TO_FELLOWSHIP" ? pendingFellowshipId || undefined : undefined,
      classId: stage === "ENROLLED_NEW_BELIEVERS_CLASS" ? pendingClassId || undefined : undefined,
    });
    setPendingFellowshipId("");
    setPendingClassId("");
    await load();
  }

  async function assign(record: SoulWinningRecordDto, userId: string) {
    await api.patch(`/soul-winning/${record.id}`, { assignedToId: userId || undefined });
    await load();
  }

  function openConvert(record: SoulWinningRecordDto) {
    setConvertingId(record.id);
    setConvertAddress(record.address ?? "");
    setConvertError(null);
  }

  async function convertToMember(record: SoulWinningRecordDto) {
    if (!convertAddress.trim()) {
      setConvertError("Address is required.");
      return;
    }
    try {
      const member = await api.post<MemberDto>("/members", {
        id: crypto.randomUUID(),
        fullName: record.fullName,
        phone: record.phone ?? "",
        address: convertAddress.trim(),
      });
      await api.patch(`/soul-winning/${record.id}/link-member`, { memberId: member.id });
      setConvertingId(null);
      await load();
    } catch (err) {
      setConvertError(err instanceof ApiError ? err.message : "Couldn't add this member. Try again.");
    }
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-semibold mb-1">Soul Winning</h1>
      <p className="text-sm mb-4" style={{ color: "var(--ink-muted)" }}>
        Every soul won in evangelism, tracked stage by stage -- attending church programs, being
        visited, allocated to a {fellowships.length ? "fellowship/cell" : "fellowship"}, enrolled in
        and completing a new believers class -- with someone assigned to follow them up throughout.
      </p>

      <form
        onSubmit={onSubmit}
        className="rounded-xl border p-4 mb-6 grid gap-3 sm:grid-cols-2"
        style={{ borderColor: "var(--line)", background: "var(--surface)" }}
      >
        <div className="sm:col-span-2">
          <label className="block text-sm mb-1">Full name</label>
          <input required value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm" style={{ borderColor: "var(--line)" }} />
        </div>
        <div>
          <label className="block text-sm mb-1">Phone</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm" style={{ borderColor: "var(--line)" }} />
        </div>
        <div>
          <label className="block text-sm mb-1">Address</label>
          <input value={address} onChange={(e) => setAddress(e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm" style={{ borderColor: "var(--line)" }} />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm mb-1">Assign to follow up (optional)</label>
          <select value={assignedToId} onChange={(e) => setAssignedToId(e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm" style={{ borderColor: "var(--line)" }}>
            <option value="">Unassigned</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.fullName}</option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <button type="submit" disabled={saving} className="rounded-md px-4 py-2 text-sm font-medium disabled:opacity-60" style={{ background: "var(--accent)", color: "white" }}>
            {saving ? "Adding…" : "Record a soul won"}
          </button>
        </div>
      </form>

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--line)" }}>
        {records.length === 0 && (
          <div className="p-4 text-sm" style={{ color: "var(--ink-muted)" }}>
            Nothing recorded yet.
          </div>
        )}
        {records.map((r) => {
          const expanded = expandedId === r.id;
          const upcoming = nextStage(r.stage);
          return (
            <div key={r.id} className="border-t first:border-t-0" style={{ borderColor: "var(--line-soft)" }}>
              <button
                type="button"
                onClick={() => setExpandedId(expanded ? null : r.id)}
                className="w-full flex items-center justify-between px-4 py-3 text-left"
              >
                <div>
                  <div className="text-sm font-medium">{r.fullName}{r.memberId ? " · now a member" : ""}</div>
                  <div className="text-xs" style={{ color: "var(--ink-muted)" }}>
                    {r.assignedTo ? `Following up: ${r.assignedTo.fullName}` : "Unassigned"}
                    {r.fellowship ? ` · ${r.fellowship.name}` : ""}
                  </div>
                </div>
                <span className="text-xs font-medium rounded-full px-2 py-0.5 shrink-0" style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}>
                  {SOUL_WINNING_STAGE_LABELS[r.stage]}
                </span>
              </button>

              {expanded && (
                <div className="px-4 pb-4 grid gap-3 text-sm">
                  <div className="grid gap-1">
                    {r.stageHistory.map((h) => (
                      <div key={h.id} style={{ color: "var(--ink-muted)" }}>
                        {SOUL_WINNING_STAGE_LABELS[h.stage]} -- {new Date(h.changedAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
                        {h.note ? ` (${h.note})` : ""}
                      </div>
                    ))}
                  </div>

                  <div>
                    <label className="block text-xs mb-1" style={{ color: "var(--ink-muted)" }}>Reassign follow-up</label>
                    <select value={r.assignedToId ?? ""} onChange={(e) => assign(r, e.target.value)} className="rounded-md border px-2 py-1.5 text-sm" style={{ borderColor: "var(--line)" }}>
                      <option value="">Unassigned</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>{u.fullName}</option>
                      ))}
                    </select>
                  </div>

                  {upcoming === "ALLOCATED_TO_FELLOWSHIP" && (
                    <div>
                      <label className="block text-xs mb-1" style={{ color: "var(--ink-muted)" }}>Allocate to</label>
                      <select value={pendingFellowshipId} onChange={(e) => setPendingFellowshipId(e.target.value)} className="rounded-md border px-2 py-1.5 text-sm" style={{ borderColor: "var(--line)" }}>
                        <option value="">Choose a fellowship/cell</option>
                        {fellowships.map((f) => (
                          <option key={f.id} value={f.id}>{f.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {upcoming === "ENROLLED_NEW_BELIEVERS_CLASS" && (
                    <div>
                      <label className="block text-xs mb-1" style={{ color: "var(--ink-muted)" }}>Enroll in</label>
                      <select value={pendingClassId} onChange={(e) => setPendingClassId(e.target.value)} className="rounded-md border px-2 py-1.5 text-sm" style={{ borderColor: "var(--line)" }}>
                        <option value="">Choose a class</option>
                        {classes.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="flex gap-2">
                    {upcoming && (
                      <button type="button" onClick={() => advance(r)} className="rounded-md px-3 py-1.5 text-xs font-medium" style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}>
                        Move to: {SOUL_WINNING_STAGE_LABELS[upcoming]}
                      </button>
                    )}
                    {!r.memberId && r.stage === "COMPLETED_NEW_BELIEVERS_CLASS" && (
                      <button type="button" onClick={() => openConvert(r)} className="rounded-md px-3 py-1.5 text-xs font-medium" style={{ background: "var(--accent)", color: "white" }}>
                        Add as a member
                      </button>
                    )}
                  </div>

                  {convertingId === r.id && (
                    <div className="rounded-md border p-3 grid gap-2" style={{ borderColor: "var(--line)" }}>
                      <label className="text-xs" style={{ color: "var(--ink-muted)" }}>Address (required to become a member)</label>
                      <input value={convertAddress} onChange={(e) => setConvertAddress(e.target.value)} className="rounded-md border px-2 py-1.5 text-sm" style={{ borderColor: "var(--line)" }} />
                      {convertError && <p className="text-xs" style={{ color: "var(--danger)" }}>{convertError}</p>}
                      <div className="flex gap-2">
                        <button type="button" onClick={() => convertToMember(r)} className="rounded-md px-3 py-1.5 text-xs font-medium" style={{ background: "var(--accent)", color: "white" }}>
                          Confirm
                        </button>
                        <button type="button" onClick={() => setConvertingId(null)} className="rounded-md px-3 py-1.5 text-xs font-medium" style={{ background: "var(--surface-2)", color: "var(--ink)" }}>
                          Cancel
                        </button>
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
  );
}
