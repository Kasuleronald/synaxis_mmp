import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import {
  COUNTRIES,
  FollowUpStatus,
  MaritalStatus,
  MemberStatus,
  Role,
  type FollowUpDto,
  type MemberDto,
  type MemberProfileReportDto,
} from "@life-mmp/shared";
import { api } from "../lib/api";
import { db } from "../lib/db";
import { enqueue } from "../lib/sync";
import { useAuth } from "../context/AuthContext";
import { useOrg } from "../context/OrgContext";
import { exportMemberProfileToExcel, exportMemberProfileToPdf } from "../lib/export";
import { logExport } from "../lib/auditExport";

const PROFILE_REPORT_ROLES: Role[] = [Role.ORG_ADMIN, Role.FINANCE_OFFICER, Role.DEPARTMENT_HEAD, Role.FELLOWSHIP_LEADER];

function monthsAgo(n: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.toISOString().slice(0, 10);
}

const STATUS_LABELS: Record<MemberStatus, string> = {
  VISITOR: "Visitor",
  NEW_CONVERT: "New convert",
  MEMBER: "Member",
  INACTIVE: "Inactive",
};

const FOLLOWUP_LABELS: Record<FollowUpStatus, string> = {
  PENDING: "Pending",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
};

const MARITAL_LABELS: Record<MaritalStatus, string> = {
  SINGLE: "Single",
  MARRIED: "Married",
  DIVORCED: "Divorced",
  WIDOWED: "Widowed",
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function MemberDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { org } = useOrg();
  const [member, setMember] = useState<MemberDto | null>(null);
  const [followUps, setFollowUps] = useState<FollowUpDto[]>([]);
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const [profileFrom, setProfileFrom] = useState(() => monthsAgo(3));
  const [profileTo, setProfileTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [downloadingProfile, setDownloadingProfile] = useState(false);

  const [nationality, setNationality] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthDay, setBirthDay] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [maritalStatus, setMaritalStatus] = useState<MaritalStatus | "">("");
  const [isStudent, setIsStudent] = useState(false);
  const [school, setSchool] = useState("");
  const [detailsMessage, setDetailsMessage] = useState<string | null>(null);

  async function load() {
    if (!id) return;
    let data: MemberDto | null = null;
    if (navigator.onLine) {
      try {
        const fetched = await api.get<MemberDto & { followUps: FollowUpDto[] }>(`/members/${id}`);
        setFollowUps(fetched.followUps ?? []);
        await db.members.put(fetched);
        data = fetched;
      } catch {
        // fall through
      }
    }
    if (!data) {
      data = (await db.members.get(id)) ?? null;
      const cachedFollowUps = await db.followUps.where("memberId").equals(id).toArray();
      setFollowUps(cachedFollowUps);
    }
    if (data) {
      setMember(data);
      setNationality(data.nationality ?? "");
      setBirthMonth(data.birthMonth?.toString() ?? "");
      setBirthDay(data.birthDay?.toString() ?? "");
      setBirthYear(data.birthYear?.toString() ?? "");
      setMaritalStatus(data.maritalStatus ?? "");
      setIsStudent(data.isStudent ?? false);
      setSchool(data.school ?? "");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function onStatusChange(newStatus: MemberStatus) {
    if (!member) return;
    const updated = { ...member, status: newStatus };
    setMember(updated);
    await db.members.put(updated);
    try {
      await api.patch(`/members/${member.id}`, { status: newStatus });
    } catch {
      // Status changes aren't Tier-1 (they need a resolved, non-visitor
      // record already synced) -- if this fails offline, the next full
      // sync of the member list will reconcile it.
    }
  }

  async function onSaveDetails(e: FormEvent) {
    e.preventDefault();
    if (!member) return;
    const patch = {
      nationality: nationality || undefined,
      birthMonth: birthMonth ? Number(birthMonth) : undefined,
      birthDay: birthDay ? Number(birthDay) : undefined,
      birthYear: birthYear ? Number(birthYear) : undefined,
      maritalStatus: maritalStatus || undefined,
      isStudent,
      school: isStudent ? school || undefined : undefined,
    };
    const updated = {
      ...member,
      nationality: patch.nationality ?? null,
      birthMonth: patch.birthMonth ?? null,
      birthDay: patch.birthDay ?? null,
      birthYear: patch.birthYear ?? null,
      maritalStatus: (maritalStatus || null) as MaritalStatus | null,
      isStudent,
      school: patch.school ?? null,
    };
    setMember(updated);
    await db.members.put(updated);
    try {
      await api.patch(`/members/${member.id}`, patch);
      setDetailsMessage("Saved.");
    } catch {
      setDetailsMessage("Couldn't save -- try again once you're back online.");
    }
  }

  async function onAddFollowUp(e: FormEvent) {
    e.preventDefault();
    if (!member) return;
    const followUpId = crypto.randomUUID();
    const entry: FollowUpDto = {
      id: followUpId,
      organizationId: member.organizationId,
      memberId: member.id,
      assignedToId: null,
      status: FollowUpStatus.PENDING,
      notes,
      outcome: null,
      createdAt: new Date().toISOString(),
      completedAt: null,
    };
    await db.followUps.put(entry);
    setFollowUps((f) => [entry, ...f]);
    await enqueue({
      id: followUpId,
      entity: "followUp",
      operation: "create",
      payload: { id: followUpId, memberId: member.id, notes },
    });
    setMessage(navigator.onLine ? "Follow-up logged." : "Saved locally -- will sync once you're back online.");
    setNotes("");
  }

  async function downloadProfile(format: "excel" | "pdf") {
    if (!member) return;
    setDownloadingProfile(true);
    try {
      const qs = `?from=${profileFrom}&to=${profileTo}`;
      const profile = await api.get<MemberProfileReportDto>(`/reports/member-profile/${member.id}${qs}`);
      if (format === "excel") exportMemberProfileToExcel(profile);
      else exportMemberProfileToPdf(profile, org?.displayName ?? "Synaxis MMP", org?.logoUrl);
      logExport(`${member.fullName} profile (${format === "excel" ? "Excel" : "PDF"})`);
    } finally {
      setDownloadingProfile(false);
    }
  }

  async function onCompleteFollowUp(followUpId: string, outcome: string) {
    setFollowUps((prev) =>
      prev.map((f) => (f.id === followUpId ? { ...f, status: FollowUpStatus.COMPLETED, outcome } : f)),
    );
    try {
      await api.patch(`/follow-ups/${followUpId}`, { status: FollowUpStatus.COMPLETED, outcome });
    } catch {
      // best-effort; not Tier-1
    }
  }

  if (!member) {
    return <div className="text-sm" style={{ color: "var(--ink-muted)" }}>Loading…</div>;
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold mb-1">{member.fullName}</h1>
      <div className="flex items-center gap-3 mb-6 text-sm" style={{ color: "var(--ink-muted)" }}>
        {member.phone && <span>{member.phone}</span>}
        {member.email && <span>{member.email}</span>}
        <select
          value={member.status}
          onChange={(e) => onStatusChange(e.target.value as MemberStatus)}
          className="rounded-md border px-2 py-1 text-xs"
          style={{ borderColor: "var(--line)" }}
        >
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {user && PROFILE_REPORT_ROLES.includes(user.role) && (
        <section
          className="rounded-xl border p-4 mb-6"
          style={{ borderColor: "var(--line)", background: "var(--surface)" }}
        >
          <h2 className="text-sm font-medium mb-3">Download profile</h2>
          <p className="text-xs mb-3" style={{ color: "var(--ink-muted)" }}>
            Attendance (present/absent) and giving for a chosen period, in one document.
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <label className="block text-xs mb-1" style={{ color: "var(--ink-muted)" }}>
                From
              </label>
              <input
                type="date"
                value={profileFrom}
                onChange={(e) => setProfileFrom(e.target.value)}
                className="rounded-md border px-2 py-1.5 text-sm"
                style={{ borderColor: "var(--line)" }}
              />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: "var(--ink-muted)" }}>
                To
              </label>
              <input
                type="date"
                value={profileTo}
                onChange={(e) => setProfileTo(e.target.value)}
                className="rounded-md border px-2 py-1.5 text-sm"
                style={{ borderColor: "var(--line)" }}
              />
            </div>
            <button
              type="button"
              disabled={downloadingProfile}
              onClick={() => downloadProfile("excel")}
              className="rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-50"
              style={{ background: "var(--surface-2)", color: "var(--ink)" }}
            >
              Excel (.xlsx)
            </button>
            <button
              type="button"
              disabled={downloadingProfile}
              onClick={() => downloadProfile("pdf")}
              className="rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-50"
              style={{ background: "var(--surface-2)", color: "var(--ink)" }}
            >
              PDF
            </button>
          </div>
        </section>
      )}

      <section
        className="rounded-xl border p-4 mb-6"
        style={{ borderColor: "var(--line)", background: "var(--surface)" }}
      >
        <h2 className="text-sm font-medium mb-3">Details</h2>
        <form onSubmit={onSaveDetails} className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-sm mb-1">Nationality</label>
            <select
              value={nationality}
              onChange={(e) => setNationality(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: "var(--line)" }}
            >
              <option value="">Not set</option>
              {COUNTRIES.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm mb-1">Birthday</label>
            <div className="flex gap-2">
              <select
                value={birthMonth}
                onChange={(e) => setBirthMonth(e.target.value)}
                className="rounded-md border px-3 py-2 text-sm flex-1"
                style={{ borderColor: "var(--line)" }}
              >
                <option value="">Month</option>
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                max={31}
                value={birthDay}
                onChange={(e) => setBirthDay(e.target.value)}
                placeholder="Day"
                className="rounded-md border px-3 py-2 text-sm w-20"
                style={{ borderColor: "var(--line)" }}
              />
              <input
                type="number"
                min={1900}
                value={birthYear}
                onChange={(e) => setBirthYear(e.target.value)}
                placeholder="Year (optional)"
                className="rounded-md border px-3 py-2 text-sm w-32"
                style={{ borderColor: "var(--line)" }}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm mb-1">Marital status</label>
            <select
              value={maritalStatus}
              onChange={(e) => setMaritalStatus(e.target.value as MaritalStatus | "")}
              className="w-full rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: "var(--line)" }}
            >
              <option value="">Not set</option>
              {Object.entries(MARITAL_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm mb-1 mt-6">
              <input type="checkbox" checked={isStudent} onChange={(e) => setIsStudent(e.target.checked)} />
              Student
            </label>
            {isStudent && (
              <input
                value={school}
                onChange={(e) => setSchool(e.target.value)}
                placeholder="School name"
                className="w-full rounded-md border px-3 py-2 text-sm"
                style={{ borderColor: "var(--line)" }}
              />
            )}
          </div>

          <div className="sm:col-span-2">
            <button
              type="submit"
              className="rounded-md px-4 py-2 text-sm font-medium"
              style={{ background: "var(--surface-2)", color: "var(--ink)" }}
            >
              Save details
            </button>
            {detailsMessage && (
              <span className="text-xs ml-3" style={{ color: "var(--accent-ink)" }}>
                {detailsMessage}
              </span>
            )}
          </div>
        </form>
      </section>

      <section
        className="rounded-xl border p-4 mb-6"
        style={{ borderColor: "var(--line)", background: "var(--surface)" }}
      >
        <h2 className="text-sm font-medium mb-3">Log a follow-up</h2>
        <form onSubmit={onAddFollowUp} className="flex gap-2">
          <input
            required
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Called, invited to Sunday service…"
            className="flex-1 rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: "var(--line)" }}
          />
          <button
            type="submit"
            className="rounded-md px-4 py-2 text-sm font-medium shrink-0"
            style={{ background: "var(--accent)", color: "white" }}
          >
            Log
          </button>
        </form>
        {message && (
          <p className="text-xs mt-2" style={{ color: "var(--accent-ink)" }}>
            {message}
          </p>
        )}
      </section>

      <h2 className="text-sm font-medium mb-3" style={{ color: "var(--ink-muted)" }}>
        Follow-up history
      </h2>
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--line)" }}>
        {followUps.length === 0 && (
          <div className="p-4 text-sm" style={{ color: "var(--ink-muted)" }}>
            No follow-ups logged yet.
          </div>
        )}
        {followUps.map((f) => (
          <div key={f.id} className="px-4 py-3 border-t first:border-t-0" style={{ borderColor: "var(--line-soft)" }}>
            <div className="flex items-center justify-between">
              <span className="text-sm">{f.notes}</span>
              <span className="text-xs" style={{ color: "var(--ink-muted)" }}>
                {FOLLOWUP_LABELS[f.status]}
              </span>
            </div>
            {f.status !== FollowUpStatus.COMPLETED && (
              <button
                type="button"
                onClick={() => onCompleteFollowUp(f.id, "Reached, following up")}
                className="text-xs underline mt-1"
                style={{ color: "var(--accent-ink)" }}
              >
                Mark completed
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
