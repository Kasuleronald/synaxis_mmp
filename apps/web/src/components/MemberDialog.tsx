import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  COUNTRIES,
  Gender,
  HouseholdRole,
  LEADERSHIP_ROLE_LABELS,
  LeadershipRole,
  MaritalStatus,
  MemberStatus,
  type FellowshipDto,
  type HouseholdDto,
  type MemberDto,
} from "@life-mmp/shared";
import { useOrg } from "../context/OrgContext";
import { api, ApiError } from "../lib/api";
import { db } from "../lib/db";

// Legacy records (and anything typed without a leading "+") lose their
// country code on edit unless we re-attach it -- COUNTRIES-derived, same
// prefill rule the "Add person" form already uses.
function withDialCode(phone: string, dialCode: string): string {
  const trimmed = phone.trim();
  if (!trimmed) return dialCode ? `${dialCode} ` : "";
  if (trimmed.startsWith("+") || !dialCode) return trimmed;
  return `${dialCode} ${trimmed}`;
}

const STATUS_LABELS: Record<MemberStatus, string> = {
  VISITOR: "Visitor",
  NEW_CONVERT: "New convert",
  MEMBER: "Member",
  INACTIVE: "Inactive",
};

const MARITAL_LABELS: Record<MaritalStatus, string> = {
  SINGLE: "Single",
  MARRIED: "Married",
  DIVORCED: "Divorced",
  WIDOWED: "Widowed",
};

const GENDER_LABELS: Record<Gender, string> = {
  MALE: "Male",
  FEMALE: "Female",
};

const HOUSEHOLD_ROLE_LABELS: Record<HouseholdRole, string> = {
  HEAD: "Head",
  SPOUSE: "Spouse",
  CHILD: "Child",
  DEPENDENT: "Dependent",
  OTHER: "Other",
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function EditIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function IconButton({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="rounded-md p-1.5"
      style={{ color: "var(--ink-muted)" }}
    >
      {children}
    </button>
  );
}

export function MemberDialog({ member: initial, members, households, fellowships, initialMode, onClose, onChange }: {
  member: MemberDto;
  members?: MemberDto[];
  households?: HouseholdDto[];
  fellowships?: FellowshipDto[];
  initialMode?: "view" | "edit" | "confirmDelete";
  onClose: () => void;
  onChange: (updated: MemberDto) => void;
}) {
  const { org } = useOrg();
  const orgDialCode = COUNTRIES.find((c) => c.name === org?.country)?.dialCode ?? "";

  const [member, setMember] = useState(initial);
  const [mode, setMode] = useState<"view" | "edit" | "confirmDelete">(initialMode ?? "view");

  const [fullName, setFullName] = useState(initial.fullName);
  const [memberNumber, setMemberNumber] = useState(initial.memberNumber ?? "");
  const [gender, setGender] = useState<Gender | "">(initial.gender ?? "");
  const [phone, setPhone] = useState(() => withDialCode(initial.phone ?? "", orgDialCode));
  const [email, setEmail] = useState(initial.email ?? "");
  const [address, setAddress] = useState(initial.address ?? "");
  const [nationality, setNationality] = useState(initial.nationality ?? "");
  const [birthMonth, setBirthMonth] = useState(initial.birthMonth?.toString() ?? "");
  const [birthDay, setBirthDay] = useState(initial.birthDay?.toString() ?? "");
  const [birthYear, setBirthYear] = useState(initial.birthYear?.toString() ?? "");
  const [maritalStatus, setMaritalStatus] = useState<MaritalStatus | "">(initial.maritalStatus ?? "");
  const [isStudent, setIsStudent] = useState(initial.isStudent ?? false);
  const [school, setSchool] = useState(initial.school ?? "");
  const [status, setStatus] = useState<MemberStatus>(initial.status);
  const [leadershipRoles, setLeadershipRoles] = useState<LeadershipRole[]>(initial.leadershipRoles ?? []);
  const [spouseLinked, setSpouseLinked] = useState(false);
  const [spouseMemberId, setSpouseMemberId] = useState("");
  const [householdId, setHouseholdId] = useState(initial.householdId ?? "");
  const [householdRole, setHouseholdRole] = useState<HouseholdRole | "">(initial.householdRole ?? "");
  const [fellowshipId, setFellowshipId] = useState(initial.fellowshipId ?? "");

  function toggleRole(role: LeadershipRole) {
    setLeadershipRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));
  }

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);

  useEffect(() => {
    // Escape closes the dialog, matching normal modal behavior.
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function onSave() {
    // This dialog's Save is a plain button, not a form submit -- the
    // `required` attributes on the inputs above don't get enforced by the
    // browser on their own, so the check has to happen here instead.
    if (!fullName.trim() || !phone.trim() || !address.trim()) {
      setError("Full name, phone, and address are required.");
      return;
    }
    setSaving(true);
    setError(null);
    const patch = {
      fullName,
      memberNumber: memberNumber.trim() || undefined,
      gender: gender || undefined,
      phone: phone || undefined,
      email: email || undefined,
      address: address || undefined,
      nationality: nationality || undefined,
      birthMonth: birthMonth ? Number(birthMonth) : undefined,
      birthDay: birthDay ? Number(birthDay) : undefined,
      birthYear: birthYear ? Number(birthYear) : undefined,
      maritalStatus: maritalStatus || undefined,
      isStudent,
      school: isStudent ? school || undefined : undefined,
      status,
      leadershipRoles,
      spouseMemberId: spouseLinked && spouseMemberId ? spouseMemberId : undefined,
      householdId: householdId || undefined,
      householdRole: householdId ? householdRole || undefined : undefined,
      fellowshipId: fellowshipId || undefined,
    };
    try {
      const updated = await api.patch<MemberDto>(`/members/${member.id}`, patch);
      setMember(updated);
      await db.members.put(updated);
      onChange(updated);
      setMode("view");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save changes.");
    } finally {
      setSaving(false);
    }
  }

  async function onRequestDelete() {
    setSaving(true);
    setError(null);
    try {
      await api.post("/deletion-requests", {
        entityType: "member",
        entityId: member.id,
        entityLabel: member.fullName,
      });
      setDeleteMessage("Deletion requested -- an appointed approver needs to confirm before this record is removed.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't file the deletion request.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl border max-h-[90vh] overflow-y-auto"
        style={{ borderColor: "var(--line)", background: "var(--surface)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--line-soft)" }}>
          <h2 className="text-lg font-semibold" style={{ color: "var(--ink)" }}>
            {mode === "edit" ? "Edit member" : member.fullName}
            {mode === "view" && member.memberNumber && (
              <span className="ml-1.5 text-sm font-normal" style={{ color: "var(--ink-muted)" }}>
                #{member.memberNumber}
              </span>
            )}
          </h2>
          <div className="flex items-center gap-1">
            {mode === "view" && (
              <>
                <IconButton onClick={() => setMode("edit")} title="Edit">
                  <EditIcon />
                </IconButton>
                <IconButton onClick={() => setMode("confirmDelete")} title="Request deletion">
                  <TrashIcon />
                </IconButton>
              </>
            )}
            <IconButton onClick={onClose} title="Close">
              <CloseIcon />
            </IconButton>
          </div>
        </div>

        <div className="p-5">
          {mode === "confirmDelete" && (
            <div className="mb-4 rounded-md p-3 text-sm" style={{ background: "var(--warn-soft)", color: "var(--warn)" }}>
              {deleteMessage ? (
                <p>{deleteMessage}</p>
              ) : (
                <>
                  <p className="mb-3">
                    This won't delete {member.fullName} right away -- it files a request that an
                    appointed approver has to confirm first.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={onRequestDelete}
                      className="rounded-md px-3 py-1.5 text-xs font-medium disabled:opacity-60"
                      style={{ background: "var(--danger)", color: "white" }}
                    >
                      {saving ? "Requesting…" : "Request deletion"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode("view")}
                      className="rounded-md px-3 py-1.5 text-xs font-medium"
                      style={{ background: "var(--surface-2)", color: "var(--ink)" }}
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-md p-3 text-sm" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
              {error}
            </div>
          )}

          {mode === "view" && (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <Field label="Gender" value={member.gender ? GENDER_LABELS[member.gender] : null} />
              <Field label="Phone" value={member.phone} />
              <Field label="Email" value={member.email} />
              <Field label="Address" value={member.address} />
              <Field label="Nationality" value={member.nationality} />
              <Field
                label="Birthday"
                value={
                  member.birthMonth
                    ? `${MONTHS[member.birthMonth - 1]} ${member.birthDay ?? ""}${member.birthYear ? `, ${member.birthYear}` : ""}`
                    : null
                }
              />
              <Field label="Marital status" value={member.maritalStatus ? MARITAL_LABELS[member.maritalStatus] : null} />
              <Field label="Student" value={member.isStudent ? member.school || "Yes" : null} />
              <Field label="Status" value={STATUS_LABELS[member.status]} />
              <Field
                label="Leadership"
                value={
                  member.leadershipRoles.length > 0
                    ? member.leadershipRoles.map((r) => LEADERSHIP_ROLE_LABELS[r]).join(", ")
                    : null
                }
              />
              <Field
                label="Household"
                value={
                  member.householdId
                    ? [households?.find((h) => h.id === member.householdId)?.name, member.householdRole ? HOUSEHOLD_ROLE_LABELS[member.householdRole] : null]
                        .filter(Boolean)
                        .join(" -- ")
                    : null
                }
              />
              <Field label="Fellowship" value={fellowships?.find((f) => f.id === member.fellowshipId)?.name} />
            </dl>
          )}

          {mode === "edit" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-sm mb-1">Full name</label>
                <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm" style={{ borderColor: "var(--line)" }} />
              </div>
              <div>
                <label className="block text-sm mb-1">Member number</label>
                <input value={memberNumber} onChange={(e) => setMemberNumber(e.target.value)} placeholder="Auto-assigned if left blank" className="w-full rounded-md border px-3 py-2 text-sm" style={{ borderColor: "var(--line)" }} />
              </div>
              <div>
                <label className="block text-sm mb-1">Phone</label>
                <input required value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm" style={{ borderColor: "var(--line)" }} />
              </div>
              <div>
                <label className="block text-sm mb-1">Email</label>
                <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm" style={{ borderColor: "var(--line)" }} />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm mb-1">Address</label>
                <input required value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Where they stay -- village, area, or street" className="w-full rounded-md border px-3 py-2 text-sm" style={{ borderColor: "var(--line)" }} />
              </div>
              <div>
                <label className="block text-sm mb-1">Gender</label>
                <select value={gender} onChange={(e) => setGender(e.target.value as Gender | "")} className="w-full rounded-md border px-3 py-2 text-sm" style={{ borderColor: "var(--line)" }}>
                  <option value="">Not set</option>
                  {Object.entries(GENDER_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1">Nationality</label>
                <select value={nationality} onChange={(e) => setNationality(e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm" style={{ borderColor: "var(--line)" }}>
                  <option value="">Not set</option>
                  {COUNTRIES.map((c) => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1">Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value as MemberStatus)} className="w-full rounded-md border px-3 py-2 text-sm" style={{ borderColor: "var(--line)" }}>
                  {Object.entries(STATUS_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm mb-1">Birthday</label>
                <div className="flex gap-2">
                  <select value={birthMonth} onChange={(e) => setBirthMonth(e.target.value)} className="rounded-md border px-3 py-2 text-sm flex-1" style={{ borderColor: "var(--line)" }}>
                    <option value="">Month</option>
                    {MONTHS.map((m, i) => (
                      <option key={m} value={i + 1}>{m}</option>
                    ))}
                  </select>
                  <input type="number" min={1} max={31} value={birthDay} onChange={(e) => setBirthDay(e.target.value)} placeholder="Day" className="rounded-md border px-3 py-2 text-sm w-20" style={{ borderColor: "var(--line)" }} />
                  <input type="number" min={1900} value={birthYear} onChange={(e) => setBirthYear(e.target.value)} placeholder="Year (optional)" className="rounded-md border px-3 py-2 text-sm w-32" style={{ borderColor: "var(--line)" }} />
                </div>
              </div>
              <div>
                <label className="block text-sm mb-1">Marital status</label>
                <select value={maritalStatus} onChange={(e) => setMaritalStatus(e.target.value as MaritalStatus | "")} className="w-full rounded-md border px-3 py-2 text-sm" style={{ borderColor: "var(--line)" }}>
                  <option value="">Not set</option>
                  {Object.entries(MARITAL_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              {households && households.length > 0 && (
                <div>
                  <label className="block text-sm mb-1">Household</label>
                  <select value={householdId} onChange={(e) => setHouseholdId(e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm" style={{ borderColor: "var(--line)" }}>
                    <option value="">None</option>
                    {households.map((h) => (
                      <option key={h.id} value={h.id}>{h.name}</option>
                    ))}
                  </select>
                </div>
              )}
              {householdId && (
                <div>
                  <label className="block text-sm mb-1">Role in household</label>
                  <select value={householdRole} onChange={(e) => setHouseholdRole(e.target.value as HouseholdRole | "")} className="w-full rounded-md border px-3 py-2 text-sm" style={{ borderColor: "var(--line)" }}>
                    <option value="">Not set</option>
                    {Object.entries(HOUSEHOLD_ROLE_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>
              )}
              {fellowships && fellowships.length > 0 && (
                <div>
                  <label className="block text-sm mb-1">Fellowship</label>
                  <select value={fellowshipId} onChange={(e) => setFellowshipId(e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm" style={{ borderColor: "var(--line)" }}>
                    <option value="">None</option>
                    {fellowships.map((f) => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>
              )}
              {maritalStatus === MaritalStatus.MARRIED && members && members.length > 0 && (
                <div className="sm:col-span-2">
                  <label className="flex items-center gap-2 text-sm mb-1">
                    <input
                      type="checkbox"
                      checked={spouseLinked}
                      onChange={(e) => {
                        setSpouseLinked(e.target.checked);
                        if (!e.target.checked) setSpouseMemberId("");
                      }}
                    />
                    Spouse is already a church member -- link them
                  </label>
                  {spouseLinked && (
                    <select value={spouseMemberId} onChange={(e) => setSpouseMemberId(e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm" style={{ borderColor: "var(--line)" }}>
                      <option value="">Choose spouse</option>
                      {members.filter((m) => m.id !== member.id).map((m) => (
                        <option key={m.id} value={m.id}>{m.fullName}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}
              <div>
                <label className="flex items-center gap-2 text-sm mb-1 mt-6">
                  <input type="checkbox" checked={isStudent} onChange={(e) => setIsStudent(e.target.checked)} />
                  Student
                </label>
                {isStudent && (
                  <input value={school} onChange={(e) => setSchool(e.target.value)} placeholder="School name" className="w-full rounded-md border px-3 py-2 text-sm" style={{ borderColor: "var(--line)" }} />
                )}
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm mb-1">Leadership (select any that apply)</label>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {Object.entries(LEADERSHIP_ROLE_LABELS).map(([value, label]) => (
                    <label key={value} className="flex items-center gap-1.5 text-sm">
                      <input
                        type="checkbox"
                        checked={leadershipRoles.includes(value as LeadershipRole)}
                        onChange={() => toggleRole(value as LeadershipRole)}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="sm:col-span-2 flex gap-2">
                <button type="button" disabled={saving} onClick={onSave} className="rounded-md px-4 py-2 text-sm font-medium disabled:opacity-60" style={{ background: "var(--accent)", color: "white" }}>
                  {saving ? "Saving…" : "Save"}
                </button>
                <button type="button" onClick={() => setMode("view")} className="rounded-md px-4 py-2 text-sm font-medium" style={{ background: "var(--surface-2)", color: "var(--ink)" }}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {mode === "view" && (
            <div className="mt-5 pt-4 border-t text-sm" style={{ borderColor: "var(--line-soft)" }}>
              <Link to={`/members/${member.id}`} style={{ color: "var(--accent-ink)" }}>
                View full profile &amp; follow-up history →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide mb-0.5" style={{ color: "var(--ink-muted)" }}>
        {label}
      </dt>
      <dd style={{ color: value ? "var(--ink)" : "var(--ink-muted)" }}>{value || "Not set"}</dd>
    </div>
  );
}
