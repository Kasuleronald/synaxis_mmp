import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import type { MemberDto, ServiceUnitAttendanceDto, ServiceUnitDto } from "@life-mmp/shared";
import { api } from "../lib/api";
import { MemberSearchSelect } from "../components/MemberSearchSelect";
import { EditIcon, IconButton, TrashIcon } from "../components/icons";

type UnitWithMembers = ServiceUnitDto & {
  members: { id: string; memberId: string; joinedAt: string; member: { id: string; fullName: string; phone: string | null } }[];
};

export function ServiceUnitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [unit, setUnit] = useState<UnitWithMembers | null>(null);
  const [members, setMembers] = useState<MemberDto[]>([]);
  const [addMemberId, setAddMemberId] = useState("");
  const [attendance, setAttendance] = useState<ServiceUnitAttendanceDto | null>(null);
  const [showAttendance, setShowAttendance] = useState(false);

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editLeaderId, setEditLeaderId] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!id) return;
    const [u, m] = await Promise.all([
      api.get<UnitWithMembers>(`/service-units/${id}`),
      api.get<MemberDto[]>("/members"),
    ]);
    setUnit(u);
    setMembers(m);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function addMember() {
    if (!id || !addMemberId) return;
    await api.post(`/service-units/${id}/members`, { memberId: addMemberId });
    setAddMemberId("");
    await load();
  }

  async function removeMember(memberId: string) {
    if (!id) return;
    await api.delete(`/service-units/${id}/members/${memberId}`);
    await load();
  }

  async function loadAttendance() {
    if (!id) return;
    setAttendance(await api.get<ServiceUnitAttendanceDto>(`/service-units/${id}/attendance`));
    setShowAttendance(true);
  }

  function startEdit() {
    if (!unit) return;
    setEditName(unit.name);
    setEditDescription(unit.description ?? "");
    setEditLeaderId(unit.leaderId ?? "");
    setEditing(true);
  }

  async function saveEdit() {
    if (!id) return;
    setSaving(true);
    try {
      await api.patch(`/service-units/${id}`, {
        name: editName,
        description: editDescription || undefined,
        leaderId: editLeaderId || undefined,
      });
      setEditing(false);
      await load();
    } finally {
      setSaving(false);
    }
  }

  const availableToAdd = members.filter((m) => !unit?.members.some((um) => um.memberId === m.id));

  if (!unit) {
    return <div className="text-sm" style={{ color: "var(--ink-muted)" }}>Loading…</div>;
  }

  return (
    <div className="max-w-2xl">
      {editing ? (
        <section className="rounded-xl border p-4 mb-4 grid gap-3" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
          <div>
            <label className="block text-sm mb-1">Name</label>
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: "var(--line)" }}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Description</label>
            <input
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: "var(--line)" }}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Leader</label>
            <MemberSearchSelect members={members} value={editLeaderId} onChange={setEditLeaderId} emptyLabel="None" />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={saveEdit}
              className="rounded-md px-4 py-2 text-sm font-medium disabled:opacity-60"
              style={{ background: "var(--accent)", color: "white" }}
            >
              {saving ? "Saving…" : "Save"}
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
        </section>
      ) : (
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-xl font-semibold">{unit.name}</h1>
          <IconButton title="Edit service unit" onClick={startEdit}>
            <EditIcon />
          </IconButton>
        </div>
      )}
      {!editing && (
        <p className="text-sm mb-4" style={{ color: "var(--ink-muted)" }}>
          {[unit.leader?.fullName ? `Led by ${unit.leader.fullName}` : null, unit.description].filter(Boolean).join(" · ") || "No details set"}
        </p>
      )}

      <section className="rounded-xl border p-4 mb-4" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
        <h2 className="text-sm font-medium mb-3">Add a member</h2>
        <div className="flex gap-2">
          <div className="flex-1">
            <MemberSearchSelect members={availableToAdd} value={addMemberId} onChange={setAddMemberId} emptyLabel="Choose a member" />
          </div>
          <button
            type="button"
            disabled={!addMemberId}
            onClick={addMember}
            className="rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50 shrink-0"
            style={{ background: "var(--accent)", color: "white" }}
          >
            Add
          </button>
        </div>
      </section>

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium" style={{ color: "var(--ink-muted)" }}>
          Members ({unit.members.length})
        </h2>
        <button
          type="button"
          onClick={loadAttendance}
          className="rounded-md px-3 py-1.5 text-xs font-medium"
          style={{ background: "var(--surface-2)", color: "var(--ink)" }}
        >
          {showAttendance ? "Refresh attendance" : "View attendance & absenteeism"}
        </button>
      </div>

      <div className="rounded-xl border overflow-hidden mb-4" style={{ borderColor: "var(--line)" }}>
        {unit.members.length === 0 && (
          <div className="p-4 text-sm" style={{ color: "var(--ink-muted)" }}>
            No members yet.
          </div>
        )}
        {unit.members.map((m) => (
          <div key={m.id} className="flex items-center justify-between px-4 py-3 border-t first:border-t-0 text-sm" style={{ borderColor: "var(--line-soft)" }}>
            <div>
              <div>{m.member.fullName}</div>
              {m.member.phone && <div className="text-xs" style={{ color: "var(--ink-muted)" }}>{m.member.phone}</div>}
            </div>
            <IconButton title="Remove from unit" onClick={() => removeMember(m.memberId)}>
              <TrashIcon />
            </IconButton>
          </div>
        ))}
      </div>

      {showAttendance && attendance && (
        <section>
          <h2 className="text-sm font-medium mb-3" style={{ color: "var(--ink-muted)" }}>
            Attendance across {attendance.sessionCount} recorded service{attendance.sessionCount === 1 ? "" : "s"}
          </h2>
          <div className="rounded-xl border overflow-x-auto" style={{ borderColor: "var(--line)" }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "var(--surface-2)" }}>
                  <th className="text-left px-3 py-2 font-medium">Member</th>
                  <th className="text-left px-3 py-2 font-medium">Attended</th>
                  <th className="text-left px-3 py-2 font-medium">Absent</th>
                  <th className="text-left px-3 py-2 font-medium">Rate</th>
                </tr>
              </thead>
              <tbody>
                {attendance.members.map((m) => (
                  <tr key={m.memberId} className="border-t" style={{ borderColor: "var(--line-soft)" }}>
                    <td className="px-3 py-2">{m.fullName}</td>
                    <td className="px-3 py-2">{m.attended}</td>
                    <td className="px-3 py-2" style={{ color: m.absent > 0 ? "var(--warn)" : undefined }}>{m.absent}</td>
                    <td className="px-3 py-2">{m.rate !== null ? `${m.rate}%` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
