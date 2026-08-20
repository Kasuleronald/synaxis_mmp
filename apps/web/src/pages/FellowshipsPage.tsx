import { useEffect, useState, type FormEvent } from "react";
import { LeadershipRole, type FellowshipDto, type MemberDto } from "@life-mmp/shared";
import { api, ApiError } from "../lib/api";
import { ConfirmCreatePreview } from "../components/ConfirmCreatePreview";
import { EditIcon, IconButton, TrashIcon } from "../components/icons";
import { useTerminology } from "../hooks/useTerminology";

type FellowshipWithCount = FellowshipDto & { _count: { members: number } };

export function FellowshipsPage() {
  const terms = useTerminology();
  const [fellowships, setFellowships] = useState<FellowshipWithCount[]>([]);
  const [members, setMembers] = useState<MemberDto[]>([]);
  const [name, setName] = useState("");
  const [leaderId, setLeaderId] = useState("");
  const [meetingDay, setMeetingDay] = useState("");
  const [meetingTime, setMeetingTime] = useState("");
  const [meetingLocation, setMeetingLocation] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editLeaderId, setEditLeaderId] = useState("");
  const [editMeetingDay, setEditMeetingDay] = useState("");
  const [editMeetingTime, setEditMeetingTime] = useState("");
  const [editMeetingLocation, setEditMeetingLocation] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteMessage, setDeleteMessage] = useState<Record<string, string>>({});

  const eligibleLeaders = members.filter((m) => m.leadershipRoles.includes(LeadershipRole.FELLOWSHIP_LEADER));

  async function load() {
    const [f, m] = await Promise.all([
      api.get<FellowshipWithCount[]>("/fellowships"),
      api.get<MemberDto[]>("/members"),
    ]);
    setFellowships(f);
    setMembers(m);
  }

  useEffect(() => {
    load();
  }, []);

  function resetForm() {
    setName("");
    setLeaderId("");
    setMeetingDay("");
    setMeetingTime("");
    setMeetingLocation("");
  }

  async function onConfirmCreate() {
    setSaving(true);
    try {
      await api.post("/fellowships", {
        name,
        leaderId: leaderId || undefined,
        meetingDay: meetingDay || undefined,
        meetingTime: meetingTime || undefined,
        meetingLocation: meetingLocation || undefined,
      });
      resetForm();
      setConfirming(false);
      await load();
    } finally {
      setSaving(false);
    }
  }

  function startEdit(f: FellowshipWithCount) {
    setEditingId(f.id);
    setEditName(f.name);
    setEditLeaderId(f.leaderId ?? "");
    setEditMeetingDay(f.meetingDay ?? "");
    setEditMeetingTime(f.meetingTime ?? "");
    setEditMeetingLocation(f.meetingLocation ?? "");
  }

  async function saveEdit(id: string) {
    await api.patch(`/fellowships/${id}`, {
      name: editName,
      leaderId: editLeaderId || undefined,
      meetingDay: editMeetingDay || undefined,
      meetingTime: editMeetingTime || undefined,
      meetingLocation: editMeetingLocation || undefined,
    });
    setEditingId(null);
    await load();
  }

  async function requestDelete(f: FellowshipWithCount) {
    try {
      await api.post("/deletion-requests", { entityType: "fellowship", entityId: f.id, entityLabel: f.name });
      setDeleteMessage((prev) => ({ ...prev, [f.id]: "Deletion requested -- awaiting an approver." }));
    } catch (err) {
      setDeleteMessage((prev) => ({
        ...prev,
        [f.id]: err instanceof ApiError ? err.message : "Couldn't file the deletion request.",
      }));
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold mb-1">{terms.fellowship}</h1>
      <p className="text-sm mb-4" style={{ color: "var(--ink-muted)" }}>
        Cell groups -- a member joins one from their own profile.
      </p>

      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          setConfirming(true);
        }}
        className="rounded-xl border p-4 mb-4 grid gap-3 sm:grid-cols-2"
        style={{ borderColor: "var(--line)", background: "var(--surface)" }}
      >
        <div className="sm:col-span-2">
          <label className="block text-sm mb-1">Name</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Cell Group 4"
            className="w-full rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: "var(--line)" }}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm mb-1">Leader</label>
          <select
            value={leaderId}
            onChange={(e) => setLeaderId(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: "var(--line)" }}
          >
            <option value="">None yet</option>
            {eligibleLeaders.map((m) => (
              <option key={m.id} value={m.id}>
                {m.fullName}
              </option>
            ))}
          </select>
          {eligibleLeaders.length === 0 && (
            <p className="text-xs mt-1" style={{ color: "var(--ink-muted)" }}>
              No members are tagged "Fellowship leader" yet -- add that leadership role from a member's
              profile first.
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm mb-1">Meeting day</label>
          <input
            value={meetingDay}
            onChange={(e) => setMeetingDay(e.target.value)}
            placeholder="Wednesdays"
            className="w-full rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: "var(--line)" }}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Meeting time</label>
          <input
            type="time"
            value={meetingTime}
            onChange={(e) => setMeetingTime(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: "var(--line)" }}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm mb-1">Location</label>
          <input
            value={meetingLocation}
            onChange={(e) => setMeetingLocation(e.target.value)}
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
            Create fellowship
          </button>
        </div>
      </form>

      {confirming && (
        <ConfirmCreatePreview
          title="Create this fellowship?"
          confirming={saving}
          onCancel={() => setConfirming(false)}
          onConfirm={onConfirmCreate}
          rows={[
            { label: "Name", value: name },
            { label: "Leader", value: eligibleLeaders.find((m) => m.id === leaderId)?.fullName ?? "" },
            { label: "Meeting day", value: meetingDay },
            { label: "Meeting time", value: meetingTime },
            { label: "Location", value: meetingLocation },
          ]}
        />
      )}

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--line)" }}>
        {fellowships.length === 0 && (
          <div className="p-4 text-sm" style={{ color: "var(--ink-muted)" }}>
            No fellowships yet.
          </div>
        )}
        {fellowships.map((f) => {
          const isEditing = editingId === f.id;
          const isDeleting = deletingId === f.id;
          return (
            <div key={f.id} className="border-t first:border-t-0" style={{ borderColor: "var(--line-soft)" }}>
              {isEditing ? (
                <div className="px-4 py-3 grid gap-2 sm:grid-cols-2">
                  <input value={editName} onChange={(e) => setEditName(e.target.value)} className="rounded-md border px-2 py-1 text-sm sm:col-span-2" style={{ borderColor: "var(--line)" }} />
                  <select value={editLeaderId} onChange={(e) => setEditLeaderId(e.target.value)} className="rounded-md border px-2 py-1 text-sm sm:col-span-2" style={{ borderColor: "var(--line)" }}>
                    <option value="">None</option>
                    {eligibleLeaders.map((m) => (
                      <option key={m.id} value={m.id}>{m.fullName}</option>
                    ))}
                  </select>
                  <input value={editMeetingDay} onChange={(e) => setEditMeetingDay(e.target.value)} placeholder="Meeting day" className="rounded-md border px-2 py-1 text-sm" style={{ borderColor: "var(--line)" }} />
                  <input type="time" value={editMeetingTime} onChange={(e) => setEditMeetingTime(e.target.value)} className="rounded-md border px-2 py-1 text-sm" style={{ borderColor: "var(--line)" }} />
                  <input value={editMeetingLocation} onChange={(e) => setEditMeetingLocation(e.target.value)} placeholder="Location" className="rounded-md border px-2 py-1 text-sm sm:col-span-2" style={{ borderColor: "var(--line)" }} />
                  <div className="sm:col-span-2 flex gap-2">
                    <button type="button" onClick={() => saveEdit(f.id)} className="text-xs font-medium" style={{ color: "var(--accent-ink)" }}>Save</button>
                    <button type="button" onClick={() => setEditingId(null)} className="text-xs" style={{ color: "var(--ink-muted)" }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between px-4 py-3">
                  <div>
                    <div className="text-sm font-medium">{f.name}</div>
                    <div className="text-xs" style={{ color: "var(--ink-muted)" }}>
                      {[f.leader?.fullName, [f.meetingDay, f.meetingTime].filter(Boolean).join(" "), f.meetingLocation]
                        .filter(Boolean)
                        .join(" · ") || "No meeting details set"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium" style={{ color: "var(--accent-ink)" }}>
                      {f._count.members} members
                    </span>
                    <IconButton title="Edit" onClick={() => startEdit(f)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton title="Request deletion" onClick={() => setDeletingId(f.id)}>
                      <TrashIcon />
                    </IconButton>
                  </div>
                </div>
              )}
              {isDeleting && (
                <div className="mx-4 mb-3 rounded-md p-3 text-sm" style={{ background: "var(--warn-soft)", color: "var(--warn)" }}>
                  {deleteMessage[f.id] ? (
                    <p>{deleteMessage[f.id]}</p>
                  ) : (
                    <>
                      <p className="mb-2">
                        This won't delete "{f.name}" right away -- it files a request an appointed approver
                        has to confirm first.
                      </p>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => requestDelete(f)} className="rounded-md px-3 py-1.5 text-xs font-medium" style={{ background: "var(--danger)", color: "white" }}>
                          Request deletion
                        </button>
                        <button type="button" onClick={() => setDeletingId(null)} className="rounded-md px-3 py-1.5 text-xs font-medium" style={{ background: "var(--surface-2)", color: "var(--ink)" }}>
                          Cancel
                        </button>
                      </div>
                    </>
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
