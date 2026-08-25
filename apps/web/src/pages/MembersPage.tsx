import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  COUNTRIES,
  Gender,
  HouseholdRole,
  LEADERSHIP_ROLE_LABELS,
  LeadershipRole,
  MaritalStatus,
  MemberStatus,
  type DiscipleshipClassDto,
  type FellowshipDto,
  type HouseholdDto,
  type MemberDto,
} from "@life-mmp/shared";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useOrg } from "../context/OrgContext";
import { useTerminology } from "../hooks/useTerminology";
import { api, ApiError } from "../lib/api";
import { db } from "../lib/db";
import { enqueue } from "../lib/sync";
import { exportMembersToExcel, exportMembersToPdf } from "../lib/export";
import { MemberDialog } from "../components/MemberDialog";
import { MemberSearchSelect } from "../components/MemberSearchSelect";
import { EditIcon, IconButton, TrashIcon } from "../components/icons";

const ALL_COLUMNS = {
  number: "Number",
  phone: "Phone",
  household: "Household",
  fellowship: "Fellowship",
  addedBy: "Added by",
} as const;
type ColumnKey = keyof typeof ALL_COLUMNS;
const DEFAULT_VISIBLE_COLUMNS: Record<ColumnKey, boolean> = {
  number: true,
  phone: true,
  household: true,
  fellowship: true,
  addedBy: true,
};

const STATUS_LABELS: Record<MemberStatus, string> = {
  VISITOR: "Visitor",
  NEW_CONVERT: "New convert",
  MEMBER: "Member",
  INACTIVE: "Inactive",
};

const STATUS_COLORS: Record<MemberStatus, string> = {
  VISITOR: "var(--warn)",
  NEW_CONVERT: "var(--accent)",
  MEMBER: "var(--accent-ink)",
  INACTIVE: "var(--ink-muted)",
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

export function MembersPage() {
  const { user } = useAuth();
  const { org } = useOrg();
  const terms = useTerminology();
  const [members, setMembers] = useState<MemberDto[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<MemberStatus | "">("");
  const [joinedFrom, setJoinedFrom] = useState("");
  const [joinedTo, setJoinedTo] = useState("");
  const [showColumnsMenu, setShowColumnsMenu] = useState(false);
  const columnsMenuRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const [visibleColumns, setVisibleColumns] = useState<Record<ColumnKey, boolean>>(() => {
    if (!user) return DEFAULT_VISIBLE_COLUMNS;
    try {
      const saved = localStorage.getItem(`members-columns:${user.id}`);
      return saved ? { ...DEFAULT_VISIBLE_COLUMNS, ...JSON.parse(saved) } : DEFAULT_VISIBLE_COLUMNS;
    } catch {
      return DEFAULT_VISIBLE_COLUMNS;
    }
  });
  const [showForm, setShowForm] = useState(false);
  const [fullName, setFullName] = useState("");
  const [memberNumber, setMemberNumber] = useState("");
  const [gender, setGender] = useState<Gender | "">("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [nationality, setNationality] = useState("");
  const [status, setStatus] = useState<MemberStatus>(MemberStatus.VISITOR);
  const [birthMonth, setBirthMonth] = useState("");
  const [birthDay, setBirthDay] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [maritalStatus, setMaritalStatus] = useState<MaritalStatus | "">("");
  const [isStudent, setIsStudent] = useState(false);
  const [school, setSchool] = useState("");
  const [leadershipRoles, setLeadershipRoles] = useState<LeadershipRole[]>([]);
  const [spouseLinked, setSpouseLinked] = useState(false);
  const [spouseMemberId, setSpouseMemberId] = useState("");
  const [households, setHouseholds] = useState<HouseholdDto[]>([]);
  const [householdId, setHouseholdId] = useState("");
  const [householdRole, setHouseholdRole] = useState<HouseholdRole | "">("");
  const [showHouseholdForm, setShowHouseholdForm] = useState(false);
  const [newHouseholdName, setNewHouseholdName] = useState("");
  const [fellowships, setFellowships] = useState<FellowshipDto[]>([]);
  const [fellowshipId, setFellowshipId] = useState("");
  const [discipleshipClasses, setDiscipleshipClasses] = useState<DiscipleshipClassDto[]>([]);
  const [discipleshipClassId, setDiscipleshipClassId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [duplicateConfirmed, setDuplicateConfirmed] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [selected, setSelected] = useState<MemberDto | null>(null);
  const [dialogMode, setDialogMode] = useState<"view" | "edit" | "confirmDelete">("view");

  function toggleColumn(key: ColumnKey) {
    setVisibleColumns((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      if (user) localStorage.setItem(`members-columns:${user.id}`, JSON.stringify(next));
      return next;
    });
  }

  function openMember(m: MemberDto, mode: "view" | "edit" | "confirmDelete") {
    setSelected(m);
    setDialogMode(mode);
  }

  const orgDialCode = COUNTRIES.find((c) => c.name === org?.country)?.dialCode ?? "";

  function openForm() {
    if (!phone && orgDialCode) setPhone(`${orgDialCode} `);
    if (!nationality && org?.country) setNationality(org.country);
    setShowForm(true);
  }

  async function load() {
    if (navigator.onLine) {
      try {
        const data = await api.get<MemberDto[]>(`/members${query ? `?q=${encodeURIComponent(query)}` : ""}`);
        setMembers(data);
        await db.members.bulkPut(data);
        return;
      } catch {
        // fall through to local cache
      }
    }
    const local = await db.members.orderBy("fullName").toArray();
    setMembers(
      query ? local.filter((m) => m.fullName.toLowerCase().includes(query.toLowerCase())) : local,
    );
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  useEffect(() => {
    // Best-effort, allocation-adjacent pickers -- fine to come up empty
    // offline, the fields just show "None available" until back online.
    api.get<HouseholdDto[]>("/households").then(setHouseholds).catch(() => {});
    api.get<FellowshipDto[]>("/fellowships").then(setFellowships).catch(() => {});
    api.get<DiscipleshipClassDto[]>("/discipleship/classes").then(setDiscipleshipClasses).catch(() => {});
  }, []);

  useEffect(() => {
    if (!showColumnsMenu && !showExportMenu) return;
    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (columnsMenuRef.current && !columnsMenuRef.current.contains(target)) setShowColumnsMenu(false);
      if (exportMenuRef.current && !exportMenuRef.current.contains(target)) setShowExportMenu(false);
    }
    document.addEventListener("mousedown", onClickOutside, true);
    return () => document.removeEventListener("mousedown", onClickOutside, true);
  }, [showColumnsMenu, showExportMenu]);

  function resetForm() {
    setFullName("");
    setMemberNumber("");
    setGender("");
    setPhone(orgDialCode ? `${orgDialCode} ` : "");
    setEmail("");
    setAddress("");
    setNationality(org?.country ?? "");
    setStatus(MemberStatus.VISITOR);
    setBirthMonth("");
    setBirthDay("");
    setBirthYear("");
    setMaritalStatus("");
    setIsStudent(false);
    setSchool("");
    setLeadershipRoles([]);
    setSpouseLinked(false);
    setSpouseMemberId("");
    setHouseholdId("");
    setHouseholdRole("");
    setShowHouseholdForm(false);
    setNewHouseholdName("");
    setFellowshipId("");
    setDiscipleshipClassId("");
    setDuplicateWarning(null);
    setDuplicateConfirmed(false);
    setFormError(null);
  }

  async function onConfirmDuplicate() {
    setDuplicateConfirmed(true);
    setDuplicateWarning(null);
    await createMember();
  }

  async function onAddHousehold() {
    const created = await api.post<HouseholdDto>("/households", { name: newHouseholdName });
    setHouseholds((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
    setHouseholdId(created.id);
    setNewHouseholdName("");
    setShowHouseholdForm(false);
  }

  function toggleRole(role: LeadershipRole) {
    setLeadershipRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    // Cheap "did we already add this person" guard -- not a blocker like the
    // deletion-approval flow, just a nudge for the common accidental
    // double-entry case. A same-name match is common enough in a
    // congregation (it's not proof of an actual duplicate) that it only
    // warns once, on first submit; confirming proceeds normally.
    if (!duplicateConfirmed) {
      const existing = members.find((m) => m.fullName.trim().toLowerCase() === fullName.trim().toLowerCase());
      if (existing) {
        setDuplicateWarning(existing.fullName);
        return;
      }
    }
    setDuplicateConfirmed(false);
    setDuplicateWarning(null);
    await createMember();
  }

  async function createMember() {
    setFormError(null);
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const member: MemberDto = {
      id,
      organizationId: "", // filled server-side; not needed for local display
      branchId: null,
      createdById: null,
      memberNumber: memberNumber.trim() || null, // otherwise server-allocated; picked up once synced
      householdId: householdId || null,
      householdRole: householdId ? householdRole || null : null,
      fellowshipId: fellowshipId || null,
      orgUnitId: null,
      fullName,
      gender: gender || null,
      nationality: nationality || null,
      birthMonth: birthMonth ? Number(birthMonth) : null,
      birthDay: birthDay ? Number(birthDay) : null,
      birthYear: birthYear ? Number(birthYear) : null,
      maritalStatus: maritalStatus || null,
      isStudent,
      school: isStudent ? school || null : null,
      phone: phone || null,
      email: email || null,
      address: address || null,
      status,
      leadershipRoles,
      notes: null,
      joinedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    const payload = {
      id,
      fullName,
      memberNumber: memberNumber.trim() || undefined,
      gender: gender || undefined,
      phone: phone || undefined,
      email: email || undefined,
      address: address || undefined,
      nationality: nationality || undefined,
      status,
      birthMonth: birthMonth ? Number(birthMonth) : undefined,
      birthDay: birthDay ? Number(birthDay) : undefined,
      birthYear: birthYear ? Number(birthYear) : undefined,
      maritalStatus: maritalStatus || undefined,
      isStudent,
      school: isStudent ? school || undefined : undefined,
      leadershipRoles,
      joinedAt: now,
      spouseMemberId: spouseLinked && spouseMemberId ? spouseMemberId : undefined,
      householdId: householdId || undefined,
      householdRole: householdId ? householdRole || undefined : undefined,
      fellowshipId: fellowshipId || undefined,
    };
    await db.members.put(member);

    // Online, create directly rather than only queuing -- the server
    // response carries the allocated member number, which the optimistic
    // local echo can't know. Still safe to also queue afterward: create is
    // an idempotent upsert-by-id, so a duplicate outbox entry is a no-op.
    let saved = member;
    let createdDirectly = false;
    if (navigator.onLine) {
      try {
        saved = await api.post<MemberDto>("/members", payload);
        createdDirectly = true;
        await db.members.put(saved);
        if (discipleshipClassId) {
          // Enrollment needs the member row to actually exist server-side
          // (a real FK, not a Tier-1 upsert write), so it rides along here
          // rather than through the offline outbox -- best-effort only.
          await api.post(`/discipleship/classes/${discipleshipClassId}/enroll`, { memberId: id }).catch(() => {});
        }
      } catch (err) {
        // A real response from the server (e.g. a duplicate member number)
        // means the request reached it and was rejected -- that's not the
        // "offline, queue it" case, so surface it and stop instead of
        // silently queuing a write that will fail to sync forever.
        if (err instanceof ApiError) {
          await db.members.delete(id);
          setFormError(err.message);
          return;
        }
        // Otherwise a genuine network failure -- fall through to the offline queue below.
      }
    }
    if (!createdDirectly) {
      await enqueue({ id, entity: "member", operation: "create", payload });
    }

    // Not load(): that re-fetches the whole list, which -- offline -- would
    // race the not-yet-synced write and briefly show it missing. `saved` is
    // already the authoritative record when the direct create above ran.
    setMembers((prev) => [saved, ...prev].sort((a, b) => a.fullName.localeCompare(b.fullName)));
    setMessage(createdDirectly ? "Added." : "Saved locally -- will sync once you're back online.");
    resetForm();
    setShowForm(false);
  }

  const filteredMembers = members.filter((m) => {
    if (statusFilter && m.status !== statusFilter) return false;
    if (joinedFrom && (!m.joinedAt || m.joinedAt < joinedFrom)) return false;
    if (joinedTo && (!m.joinedAt || m.joinedAt.slice(0, 10) > joinedTo)) return false;
    return true;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-semibold">{terms.member}</h1>
        <div className="flex items-center gap-2">
          <div className="relative" ref={columnsMenuRef}>
            <button
              type="button"
              onClick={() => setShowColumnsMenu((s) => !s)}
              className="rounded-md px-3 py-1.5 text-sm font-medium"
              style={{ background: "var(--surface-2)", color: "var(--ink)" }}
            >
              Columns
            </button>
            {showColumnsMenu && (
              <div
                className="absolute right-0 mt-1 w-48 rounded-md border shadow-lg z-10 p-2"
                style={{ borderColor: "var(--line)", background: "var(--surface)" }}
              >
                {(Object.entries(ALL_COLUMNS) as [ColumnKey, string][]).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-md" style={{ color: "var(--ink)" }}>
                    <input type="checkbox" checked={visibleColumns[key]} onChange={() => toggleColumn(key)} />
                    {label}
                  </label>
                ))}
              </div>
            )}
          </div>
          <Link
            to="/imports"
            className="rounded-md px-3 py-1.5 text-sm font-medium"
            style={{ background: "var(--surface-2)", color: "var(--ink)" }}
          >
            Import members
          </Link>
          <Link
            to="/registrations"
            className="rounded-md px-3 py-1.5 text-sm font-medium"
            style={{ background: "var(--surface-2)", color: "var(--ink)" }}
          >
            Registrations
          </Link>
          <div className="relative" ref={exportMenuRef}>
            <button
              type="button"
              onClick={() => setShowExportMenu((s) => !s)}
              className="rounded-md px-3 py-1.5 text-sm font-medium"
              style={{ background: "var(--surface-2)", color: "var(--ink)" }}
            >
              Export
            </button>
            {showExportMenu && (
              <div
                className="absolute right-0 mt-1 w-40 rounded-md border shadow-lg z-10"
                style={{ borderColor: "var(--line)", background: "var(--surface)" }}
              >
                <button
                  type="button"
                  onClick={() => {
                    exportMembersToExcel(members, org?.displayName ?? "Synaxis MMP");
                    setShowExportMenu(false);
                  }}
                  className="block w-full text-left px-3 py-2 text-sm"
                  style={{ color: "var(--ink)" }}
                >
                  Excel (.xlsx)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    exportMembersToPdf(members, org?.displayName ?? "Synaxis MMP", org?.logoUrl);
                    setShowExportMenu(false);
                  }}
                  className="block w-full text-left px-3 py-2 text-sm border-t"
                  style={{ color: "var(--ink)", borderColor: "var(--line-soft)" }}
                >
                  PDF
                </button>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => (showForm ? setShowForm(false) : openForm())}
            className="rounded-md px-3 py-1.5 text-sm font-medium"
            style={{ background: "var(--accent)", color: "white" }}
          >
            {showForm ? "Cancel" : `+ New ${terms.member.toLowerCase().replace(/s$/, "")}`}
          </button>
        </div>
      </div>
      <p className="text-sm mb-4" style={{ color: "var(--ink-muted)" }}>
        Visitors and members are the same record at different stages -- a visitor becomes a member by
        changing status, not by moving to a different screen.
      </p>

      {showForm && (
        <form
          onSubmit={onSubmit}
          className="rounded-xl border p-4 mb-4 grid gap-3 sm:grid-cols-2 max-w-2xl"
          style={{ borderColor: "var(--line)", background: "var(--surface)" }}
        >
          <div className="sm:col-span-2">
            <label className="block text-sm mb-1">Full name</label>
            <input
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: "var(--line)" }}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Member number</label>
            <input
              value={memberNumber}
              onChange={(e) => setMemberNumber(e.target.value)}
              placeholder="Auto-assigned if left blank"
              className="w-full rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: "var(--line)" }}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Phone</label>
            <input
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: "var(--line)" }}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: "var(--line)" }}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Gender</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value as Gender | "")}
              className="w-full rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: "var(--line)" }}
            >
              <option value="">Not set</option>
              {Object.entries(GENDER_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
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
            <label className="block text-sm mb-1">Address</label>
            <input
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Where they stay -- village, area, or street"
              className="w-full rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: "var(--line)" }}
            />
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
            <label className="block text-sm mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as MemberStatus)}
              className="w-full rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: "var(--line)" }}
            >
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm">Household</label>
              <button
                type="button"
                onClick={() => setShowHouseholdForm((s) => !s)}
                className="text-xs underline"
                style={{ color: "var(--accent-ink)" }}
              >
                {showHouseholdForm ? "Cancel" : "+ New household"}
              </button>
            </div>
            {showHouseholdForm ? (
              <div className="flex gap-2">
                <input
                  value={newHouseholdName}
                  onChange={(e) => setNewHouseholdName(e.target.value)}
                  placeholder="The Balayo Family"
                  className="flex-1 rounded-md border px-3 py-2 text-sm"
                  style={{ borderColor: "var(--line)" }}
                />
                <button
                  type="button"
                  disabled={!newHouseholdName.trim()}
                  onClick={onAddHousehold}
                  className="rounded-md px-3 py-2 text-sm font-medium disabled:opacity-50"
                  style={{ background: "var(--accent)", color: "white" }}
                >
                  Add
                </button>
              </div>
            ) : (
              <select
                value={householdId}
                onChange={(e) => setHouseholdId(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm"
                style={{ borderColor: "var(--line)" }}
              >
                <option value="">None</option>
                {households.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          {householdId && (
            <div>
              <label className="block text-sm mb-1">Role in household</label>
              <select
                value={householdRole}
                onChange={(e) => setHouseholdRole(e.target.value as HouseholdRole | "")}
                className="w-full rounded-md border px-3 py-2 text-sm"
                style={{ borderColor: "var(--line)" }}
              >
                <option value="">Not set</option>
                {Object.entries(HOUSEHOLD_ROLE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm mb-1">Fellowship</label>
            <select
              value={fellowshipId}
              onChange={(e) => setFellowshipId(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: "var(--line)" }}
            >
              <option value="">None</option>
              {fellowships.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Discipleship class</label>
            <select
              value={discipleshipClassId}
              onChange={(e) => setDiscipleshipClassId(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: "var(--line)" }}
            >
              <option value="">None</option>
              {discipleshipClasses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.program?.name ? `${c.program.name} -- ${c.name}` : c.name}
                </option>
              ))}
            </select>
          </div>

          {maritalStatus === MaritalStatus.MARRIED && (
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
                <MemberSearchSelect
                  members={members}
                  value={spouseMemberId}
                  onChange={setSpouseMemberId}
                  placeholder="Search for the spouse…"
                  emptyLabel="Choose spouse"
                />
              )}
            </div>
          )}

          <div className="sm:col-span-2">
            <label className="flex items-center gap-2 text-sm mb-1">
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

          {formError && (
            <div
              className="sm:col-span-2 rounded-md px-3 py-2 text-sm"
              style={{ background: "var(--danger-soft)", color: "var(--danger)" }}
            >
              {formError}
            </div>
          )}

          {duplicateWarning && (
            <div
              className="sm:col-span-2 rounded-md px-3 py-2 text-sm"
              style={{ background: "var(--warn-soft)", color: "var(--warn)" }}
            >
              <p className="mb-2">
                Already added? A member named "{duplicateWarning}" already exists -- go back and check, or
                continue if this is a different person.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onConfirmDuplicate}
                  className="rounded-md px-3 py-1.5 text-xs font-medium"
                  style={{ background: "var(--accent)", color: "white" }}
                >
                  Continue anyway
                </button>
                <button
                  type="button"
                  onClick={() => setDuplicateWarning(null)}
                  className="rounded-md px-3 py-1.5 text-xs font-medium"
                  style={{ background: "var(--surface-2)", color: "var(--ink)" }}
                >
                  Go back
                </button>
              </div>
            </div>
          )}

          <div className="sm:col-span-2">
            <button
              type="submit"
              className="rounded-md px-4 py-2 text-sm font-medium"
              style={{ background: "var(--accent)", color: "white" }}
            >
              Save
            </button>
          </div>
        </form>
      )}

      {message && (
        <div
          className="rounded-md px-3 py-2 mb-4 text-sm max-w-2xl"
          style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}
        >
          {message}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or phone…"
          className="w-full max-w-sm rounded-md border px-3 py-2 text-sm"
          style={{ borderColor: "var(--line)" }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as MemberStatus | "")}
          className="rounded-md border px-3 py-2 text-sm"
          style={{ borderColor: "var(--line)" }}
        >
          <option value="">All statuses</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <span className="text-sm" style={{ color: "var(--ink-muted)" }}>
          Joined
        </span>
        <input
          type="date"
          value={joinedFrom}
          onChange={(e) => setJoinedFrom(e.target.value)}
          className="rounded-md border px-3 py-2 text-sm"
          style={{ borderColor: "var(--line)" }}
        />
        <span className="text-sm" style={{ color: "var(--ink-muted)" }}>
          to
        </span>
        <input
          type="date"
          value={joinedTo}
          onChange={(e) => setJoinedTo(e.target.value)}
          className="rounded-md border px-3 py-2 text-sm"
          style={{ borderColor: "var(--line)" }}
        />
      </div>

      <div className="rounded-xl border overflow-x-auto" style={{ borderColor: "var(--line)" }}>
        {filteredMembers.length === 0 ? (
          <div className="p-4 text-sm" style={{ color: "var(--ink-muted)" }}>
            No one here yet.
          </div>
        ) : (
          <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--line)" }}>
                <th className="text-left font-medium px-4 py-2">Name</th>
                <th className="text-left font-medium px-4 py-2">Status</th>
                {visibleColumns.number && <th className="text-left font-medium px-4 py-2">Number</th>}
                {visibleColumns.phone && <th className="text-left font-medium px-4 py-2">Phone</th>}
                {visibleColumns.household && <th className="text-left font-medium px-4 py-2">{terms.household}</th>}
                {visibleColumns.fellowship && <th className="text-left font-medium px-4 py-2">{terms.fellowship}</th>}
                {visibleColumns.addedBy && <th className="text-left font-medium px-4 py-2">Added by</th>}
                <th className="text-right font-medium px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((m) => (
                <tr key={m.id} className="border-t" style={{ borderColor: "var(--line-soft)" }}>
                  <td className="px-4 py-2.5">
                    <button type="button" onClick={() => openMember(m, "view")} className="text-left font-medium underline decoration-dotted" style={{ color: "var(--ink)" }}>
                      {m.fullName}
                    </button>
                    {m.leadershipRoles.length > 0 && (
                      <div className="text-xs" style={{ color: "var(--ink-muted)" }}>
                        {m.leadershipRoles.map((r) => LEADERSHIP_ROLE_LABELS[r]).join(", ")}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs font-medium" style={{ color: STATUS_COLORS[m.status] }}>
                      {STATUS_LABELS[m.status]}
                    </span>
                  </td>
                  {visibleColumns.number && (
                    <td className="px-4 py-2.5" style={{ color: m.memberNumber ? "var(--ink)" : "var(--ink-muted)" }}>
                      {m.memberNumber ? `#${m.memberNumber}` : "Unnumbered"}
                    </td>
                  )}
                  {visibleColumns.phone && (
                    <td className="px-4 py-2.5" style={{ color: m.phone ? "var(--ink)" : "var(--ink-muted)" }}>
                      {m.phone || "—"}
                    </td>
                  )}
                  {visibleColumns.household && (
                    <td className="px-4 py-2.5" style={{ color: m.household ? "var(--ink)" : "var(--ink-muted)" }}>
                      {m.household?.name ?? "—"}
                    </td>
                  )}
                  {visibleColumns.fellowship && (
                    <td className="px-4 py-2.5" style={{ color: m.fellowship ? "var(--ink)" : "var(--ink-muted)" }}>
                      {m.fellowship?.name ?? "—"}
                    </td>
                  )}
                  {visibleColumns.addedBy && (
                    <td className="px-4 py-2.5" style={{ color: m.createdBy ? "var(--ink)" : "var(--ink-muted)" }}>
                      {m.createdBy?.fullName ?? "—"}
                    </td>
                  )}
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <IconButton title="Edit" onClick={() => openMember(m, "edit")}>
                        <EditIcon />
                      </IconButton>
                      <IconButton title="Request deletion" onClick={() => openMember(m, "confirmDelete")}>
                        <TrashIcon />
                      </IconButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selected && (
        <MemberDialog
          member={selected}
          members={members}
          households={households}
          fellowships={fellowships}
          initialMode={dialogMode}
          onClose={() => setSelected(null)}
          onChange={(updated) => {
            setMembers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
            setSelected(updated);
          }}
        />
      )}
    </div>
  );
}
