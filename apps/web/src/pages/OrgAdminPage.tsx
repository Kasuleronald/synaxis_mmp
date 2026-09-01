import { useEffect, useState, type FormEvent } from "react";
import { ORG_ASSIGNABLE_ROLES, LeadershipRole, Role, type AuditLogEntryDto, type BranchDto, type MemberDto, type UserDto } from "@life-mmp/shared";
import { api, ApiError } from "../lib/api";
import { EditIcon, IconButton, TrashIcon } from "../components/icons";
import { useTerminology } from "../hooks/useTerminology";

function humanizeAction(action: string): string {
  return action.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function AuditLogSection() {
  const [rows, setRows] = useState<AuditLogEntryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    api
      .get<AuditLogEntryDto[]>("/audit-log")
      .then(setRows)
      .finally(() => setLoading(false));
  }, []);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? rows.filter(
        (r) =>
          r.actorName.toLowerCase().includes(q) ||
          humanizeAction(r.action).toLowerCase().includes(q) ||
          (r.entityLabel ?? "").toLowerCase().includes(q),
      )
    : rows;

  return (
    <section>
      <h1 className="text-xl font-semibold mb-1">Audit log</h1>
      <p className="text-sm mb-4" style={{ color: "var(--ink-muted)" }}>
        Logins, deletions, approvals, and most create/update actions across your organization, most
        recent first.
      </p>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by person, action, or record…"
        className="w-full max-w-sm rounded-md border px-3 py-2 text-sm mb-4"
        style={{ borderColor: "var(--line)" }}
      />
      <div className="rounded-xl border overflow-x-auto" style={{ borderColor: "var(--line)" }}>
        {loading ? (
          <div className="p-4 text-sm" style={{ color: "var(--ink-muted)" }}>
            Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-4 text-sm" style={{ color: "var(--ink-muted)" }}>
            Nothing recorded yet.
          </div>
        ) : (
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="text-left border-b" style={{ borderColor: "var(--line)", color: "var(--ink-muted)" }}>
                <th className="py-2 px-4 font-medium">When</th>
                <th className="py-2 px-4 font-medium">Who</th>
                <th className="py-2 px-4 font-medium">Action</th>
                <th className="py-2 px-4 font-medium">Record</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t" style={{ borderColor: "var(--line-soft)" }}>
                  <td className="py-2 px-4" style={{ color: "var(--ink-muted)" }}>
                    {new Date(r.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                  </td>
                  <td className="py-2 px-4 font-medium">{r.actorName}</td>
                  <td className="py-2 px-4">{humanizeAction(r.action)}</td>
                  <td className="py-2 px-4" style={{ color: "var(--ink-muted)" }}>
                    {r.entityLabel ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

export function OrgAdminPage() {
  const terms = useTerminology();
  const [branches, setBranches] = useState<BranchDto[]>([]);
  const [members, setMembers] = useState<MemberDto[]>([]);
  const [users, setUsers] = useState<UserDto[]>([]);
  const [branchName, setBranchName] = useState("");
  const [branchError, setBranchError] = useState<string | null>(null);

  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  const [editBranchName, setEditBranchName] = useState("");
  const [editBranchLeaderId, setEditBranchLeaderId] = useState("");
  const [branchSavingId, setBranchSavingId] = useState<string | null>(null);
  const [branchEditError, setBranchEditError] = useState<string | null>(null);
  const [deletingBranchId, setDeletingBranchId] = useState<string | null>(null);
  const [branchDeleteMessage, setBranchDeleteMessage] = useState<Record<string, string>>({});

  const eligibleBranchLeaders = members.filter((m) => m.leadershipRoles.includes(LeadershipRole.BRANCH_LEADER));

  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUserName, setEditUserName] = useState("");
  const [editUserRole, setEditUserRole] = useState<Role>(Role.FELLOWSHIP_LEADER);
  const [editUserBranchId, setEditUserBranchId] = useState("");
  const [userEditError, setUserEditError] = useState<string | null>(null);
  const [userSavingId, setUserSavingId] = useState<string | null>(null);

  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState<Role>(Role.FELLOWSHIP_LEADER);
  const [userBranchId, setUserBranchId] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [userError, setUserError] = useState<string | null>(null);
  const [userMessage, setUserMessage] = useState<string | null>(null);

  async function loadAll() {
    const [b, m, u] = await Promise.all([
      api.get<BranchDto[]>("/branches"),
      api.get<MemberDto[]>("/members"),
      api.get<UserDto[]>("/users"),
    ]);
    setBranches(b);
    setMembers(m);
    setUsers(u);
  }

  useEffect(() => {
    loadAll().catch(() => {});
  }, []);

  async function onCreateBranch(e: FormEvent) {
    e.preventDefault();
    setBranchError(null);
    try {
      await api.post("/branches", { name: branchName, isMain: branches.length === 0 });
      setBranchName("");
      await loadAll();
    } catch (err) {
      setBranchError(err instanceof ApiError ? err.message : "Something went wrong.");
    }
  }

  function startEditBranch(b: BranchDto) {
    setEditingBranchId(b.id);
    setEditBranchName(b.name);
    setEditBranchLeaderId(b.leaderId ?? "");
    setBranchEditError(null);
  }

  async function saveBranchEdit(id: string) {
    setBranchEditError(null);
    try {
      await api.patch(`/branches/${id}`, {
        name: editBranchName,
        leaderId: editBranchLeaderId || undefined,
      });
      setEditingBranchId(null);
      await loadAll();
    } catch (err) {
      setBranchEditError(err instanceof ApiError ? err.message : "Something went wrong.");
    }
  }

  async function makeMain(b: BranchDto) {
    setBranchSavingId(b.id);
    try {
      await api.patch(`/branches/${b.id}`, { isMain: true });
      await loadAll();
    } finally {
      setBranchSavingId(null);
    }
  }

  async function requestDeleteBranch(b: BranchDto) {
    try {
      await api.post("/deletion-requests", { entityType: "branch", entityId: b.id, entityLabel: b.name });
      setBranchDeleteMessage((prev) => ({ ...prev, [b.id]: "Deletion requested -- awaiting an approver." }));
    } catch (err) {
      setBranchDeleteMessage((prev) => ({
        ...prev,
        [b.id]: err instanceof ApiError ? err.message : "Couldn't file the deletion request.",
      }));
    }
  }

  function startEditUser(u: UserDto) {
    setEditingUserId(u.id);
    setEditUserName(u.fullName);
    setEditUserRole(u.role);
    setEditUserBranchId(u.branchId ?? "");
    setUserEditError(null);
  }

  async function saveUserEdit(id: string) {
    setUserSavingId(id);
    setUserEditError(null);
    try {
      const updated = await api.patch<UserDto>(`/users/${id}`, {
        fullName: editUserName,
        role: editUserRole,
        branchId: editUserBranchId || null,
      });
      setUsers((prev) => prev.map((x) => (x.id === id ? updated : x)));
      setEditingUserId(null);
    } catch (err) {
      setUserEditError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setUserSavingId(null);
    }
  }

  async function onToggleApprover(u: UserDto) {
    const updated = await api.patch<UserDto>(`/users/${u.id}`, { isDeletionApprover: !u.isDeletionApprover });
    setUsers((prev) => prev.map((x) => (x.id === u.id ? updated : x)));
  }

  async function onToggleRegistrationApprover(u: UserDto) {
    const updated = await api.patch<UserDto>(`/users/${u.id}`, {
      isRegistrationApprover: !u.isRegistrationApprover,
    });
    setUsers((prev) => prev.map((x) => (x.id === u.id ? updated : x)));
  }

  async function onToggleFellowshipLeaderGrant(u: UserDto) {
    const updated = await api.patch<UserDto>(`/users/${u.id}`, {
      isFellowshipLeader: !u.isFellowshipLeader,
    });
    setUsers((prev) => prev.map((x) => (x.id === u.id ? updated : x)));
  }

  async function onTogglePastorGrant(u: UserDto) {
    const updated = await api.patch<UserDto>(`/users/${u.id}`, { isPastor: !u.isPastor });
    setUsers((prev) => prev.map((x) => (x.id === u.id ? updated : x)));
  }

  async function onToggleFellowshipsDepartmentHeadGrant(u: UserDto) {
    const updated = await api.patch<UserDto>(`/users/${u.id}`, {
      isFellowshipsDepartmentHead: !u.isFellowshipsDepartmentHead,
    });
    setUsers((prev) => prev.map((x) => (x.id === u.id ? updated : x)));
  }

  async function onToggleDevotionalEditorGrant(u: UserDto) {
    const updated = await api.patch<UserDto>(`/users/${u.id}`, { isDevotionalEditor: !u.isDevotionalEditor });
    setUsers((prev) => prev.map((x) => (x.id === u.id ? updated : x)));
  }

  async function onInviteUser(e: FormEvent) {
    e.preventDefault();
    setUserError(null);
    setUserMessage(null);
    try {
      await api.post("/users", {
        email: userEmail,
        fullName: userName,
        role: userRole,
        branchId: userBranchId || undefined,
        temporaryPassword: userPassword,
      });
      setUserMessage(`${userName} added. Share their temporary password directly, not over an open channel.`);
      setUserEmail("");
      setUserName("");
      setUserPassword("");
      await loadAll();
    } catch (err) {
      setUserError(err instanceof ApiError ? err.message : "Something went wrong.");
    }
  }

  return (
    <div className="grid gap-8">
      <section>
        <h1 className="text-xl font-semibold mb-1">Branches</h1>
        <p className="text-sm mb-4" style={{ color: "var(--ink-muted)" }}>
          What the blueprint calls campuses. One organization, many branches.
        </p>

        <form
          onSubmit={onCreateBranch}
          className="rounded-xl border p-4 mb-4 flex gap-2"
          style={{ borderColor: "var(--line)", background: "var(--surface)" }}
        >
          <input
            required
            placeholder="Branch name"
            value={branchName}
            onChange={(e) => setBranchName(e.target.value)}
            className="flex-1 rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: "var(--line)" }}
          />
          <button
            type="submit"
            className="rounded-md px-4 py-2 text-sm font-medium"
            style={{ background: "var(--accent)", color: "white" }}
          >
            Add
          </button>
        </form>
        {branchError && (
          <div
            className="rounded-md px-3 py-2 mb-4 text-sm"
            style={{ background: "var(--danger-soft)", color: "var(--danger)" }}
          >
            {branchError}
          </div>
        )}

        <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--line)" }}>
          {branches.length === 0 && (
            <div className="p-4 text-sm" style={{ color: "var(--ink-muted)" }}>
              No branches yet.
            </div>
          )}
          {branches.map((b) => {
            const isEditing = editingBranchId === b.id;
            return (
              <div key={b.id} className="border-t first:border-t-0" style={{ borderColor: "var(--line-soft)" }}>
                {isEditing ? (
                  <div className="px-4 py-3 grid gap-2">
                    <input
                      value={editBranchName}
                      onChange={(e) => setEditBranchName(e.target.value)}
                      className="rounded-md border px-2 py-1 text-sm"
                      style={{ borderColor: "var(--line)" }}
                    />
                    <select
                      value={editBranchLeaderId}
                      onChange={(e) => setEditBranchLeaderId(e.target.value)}
                      className="rounded-md border px-2 py-1 text-sm"
                      style={{ borderColor: "var(--line)" }}
                    >
                      <option value="">No leader assigned</option>
                      {eligibleBranchLeaders.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.fullName}
                        </option>
                      ))}
                    </select>
                    {eligibleBranchLeaders.length === 0 && (
                      <p className="text-xs" style={{ color: "var(--ink-muted)" }}>
                        No members are tagged "Branch leader" yet -- add that leadership role from a
                        member's profile first.
                      </p>
                    )}
                    {branchEditError && (
                      <div className="rounded-md px-2 py-1.5 text-xs" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
                        {branchEditError}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button type="button" onClick={() => saveBranchEdit(b.id)} className="text-xs font-medium" style={{ color: "var(--accent-ink)" }}>
                        Save
                      </button>
                      <button type="button" onClick={() => setEditingBranchId(null)} className="text-xs" style={{ color: "var(--ink-muted)" }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="px-4 py-3 flex items-center justify-between text-sm">
                    <div>
                      <span>{b.name}</span>{" "}
                      {b.isMain && <span style={{ color: "var(--ink-muted)" }}>· main</span>}
                      {b.leader && (
                        <div className="text-xs" style={{ color: "var(--ink-muted)" }}>
                          Led by {b.leader.fullName}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {!b.isMain && (
                        <button
                          type="button"
                          disabled={branchSavingId === b.id}
                          onClick={() => makeMain(b)}
                          className="rounded-full px-2.5 py-1 text-xs font-medium disabled:opacity-60"
                          style={{ background: "var(--surface-2)", color: "var(--ink-muted)" }}
                        >
                          Make main
                        </button>
                      )}
                      <IconButton title="Edit" onClick={() => startEditBranch(b)}>
                        <EditIcon />
                      </IconButton>
                      {!b.isMain && (
                        <IconButton title="Request deletion" onClick={() => setDeletingBranchId(b.id)}>
                          <TrashIcon />
                        </IconButton>
                      )}
                    </div>
                  </div>
                )}
                {deletingBranchId === b.id && (
                  <div className="mx-4 mb-3 rounded-md p-3 text-sm" style={{ background: "var(--warn-soft)", color: "var(--warn)" }}>
                    {branchDeleteMessage[b.id] ? (
                      <p>{branchDeleteMessage[b.id]}</p>
                    ) : (
                      <>
                        <p className="mb-2">
                          This won't delete "{b.name}" right away -- it files a request an appointed
                          approver has to confirm first.
                        </p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => requestDeleteBranch(b)}
                            className="rounded-md px-3 py-1.5 text-xs font-medium"
                            style={{ background: "var(--danger)", color: "white" }}
                          >
                            Request deletion
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingBranchId(null)}
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
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h1 className="text-xl font-semibold mb-1">Staff &amp; roles</h1>
        <p className="text-sm mb-4" style={{ color: "var(--ink-muted)" }}>
          Finance officers, directorate heads, fellowship leaders, volunteers — assign the role
          that matches what they're actually responsible for. Toggle "Deletions" for whoever should
          confirm deletion requests, and "Registrations" for whoever should confirm incoming
          self-registrations, before either is actually final.
        </p>

        <form
          onSubmit={onInviteUser}
          className="rounded-xl border p-4 mb-4 grid gap-3"
          style={{ borderColor: "var(--line)", background: "var(--surface)" }}
        >
          <input
            required
            placeholder="Full name"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            className="rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: "var(--line)" }}
          />
          <input
            required
            type="email"
            placeholder="Email"
            value={userEmail}
            onChange={(e) => setUserEmail(e.target.value)}
            className="rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: "var(--line)" }}
          />
          <div className="grid grid-cols-2 gap-3">
            <select
              value={userRole}
              onChange={(e) => setUserRole(e.target.value as Role)}
              className="rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: "var(--line)" }}
            >
              {ORG_ASSIGNABLE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r.replace(/_/g, " ").toLowerCase()}
                </option>
              ))}
            </select>
            <select
              value={userBranchId}
              onChange={(e) => setUserBranchId(e.target.value)}
              className="rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: "var(--line)" }}
            >
              <option value="">No branch</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <input
            required
            minLength={8}
            placeholder="Temporary password"
            value={userPassword}
            onChange={(e) => setUserPassword(e.target.value)}
            className="rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: "var(--line)" }}
          />
          <button
            type="submit"
            className="rounded-md px-4 py-2 text-sm font-medium"
            style={{ background: "var(--accent)", color: "white" }}
          >
            Invite
          </button>
          {userError && (
            <div className="rounded-md px-3 py-2 text-sm" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
              {userError}
            </div>
          )}
          {userMessage && (
            <div className="rounded-md px-3 py-2 text-sm" style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}>
              {userMessage}
            </div>
          )}
        </form>

        <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--line)" }}>
          {users.length === 0 && (
            <div className="p-4 text-sm" style={{ color: "var(--ink-muted)" }}>
              No staff yet.
            </div>
          )}
          {users.map((u) => (
            <div
              key={u.id}
              className="px-4 py-3 border-t first:border-t-0 text-sm"
              style={{ borderColor: "var(--line-soft)" }}
            >
              {editingUserId === u.id ? (
                <div className="grid gap-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={editUserName}
                      onChange={(e) => setEditUserName(e.target.value)}
                      className="rounded-md border px-2 py-1.5 text-sm"
                      style={{ borderColor: "var(--line)" }}
                    />
                    <select
                      value={editUserRole}
                      onChange={(e) => setEditUserRole(e.target.value as Role)}
                      className="rounded-md border px-2 py-1.5 text-sm"
                      style={{ borderColor: "var(--line)" }}
                    >
                      {ORG_ASSIGNABLE_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r.replace(/_/g, " ").toLowerCase()}
                        </option>
                      ))}
                    </select>
                    <select
                      value={editUserBranchId}
                      onChange={(e) => setEditUserBranchId(e.target.value)}
                      className="rounded-md border px-2 py-1.5 text-sm col-span-2"
                      style={{ borderColor: "var(--line)" }}
                    >
                      <option value="">No branch</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {userEditError && (
                    <div className="rounded-md px-2 py-1.5 text-xs" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
                      {userEditError}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={userSavingId === u.id}
                      onClick={() => saveUserEdit(u.id)}
                      className="text-xs font-medium disabled:opacity-60"
                      style={{ color: "var(--accent-ink)" }}
                    >
                      {userSavingId === u.id ? "Saving…" : "Save"}
                    </button>
                    <button type="button" onClick={() => setEditingUserId(null)} className="text-xs" style={{ color: "var(--ink-muted)" }}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <span className="font-medium">{u.fullName}</span>
                    <div className="text-xs" style={{ color: "var(--ink-muted)" }}>
                      {u.role.replace(/_/g, " ").toLowerCase()}
                      {" · "}
                      {branches.find((b) => b.id === u.branchId)?.name ?? "No branch"}
                    </div>
                  </div>
                  <IconButton title="Edit" onClick={() => startEditUser(u)}>
                    <EditIcon />
                  </IconButton>
                </div>
              )}
              {u.role !== Role.ORG_ADMIN && editingUserId !== u.id && (
                <div className="flex items-center gap-2 flex-wrap mt-2">
                    <button
                      type="button"
                      onClick={() => onToggleApprover(u)}
                      className="rounded-full px-2.5 py-1 text-xs font-medium"
                      style={
                        u.isDeletionApprover
                          ? { background: "var(--accent-soft)", color: "var(--accent-ink)" }
                          : { background: "var(--surface-2)", color: "var(--ink-muted)" }
                      }
                    >
                      {u.isDeletionApprover ? "Deletions ✓" : "Make deletion approver"}
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleRegistrationApprover(u)}
                      className="rounded-full px-2.5 py-1 text-xs font-medium"
                      style={
                        u.isRegistrationApprover
                          ? { background: "var(--accent-soft)", color: "var(--accent-ink)" }
                          : { background: "var(--surface-2)", color: "var(--ink-muted)" }
                      }
                    >
                      {u.isRegistrationApprover ? "Registrations ✓" : "Make registration approver"}
                    </button>
                    {u.role !== Role.FELLOWSHIP_LEADER && (
                      <button
                        type="button"
                        onClick={() => onToggleFellowshipLeaderGrant(u)}
                        title="Lets them submit fellowship (cell) reports without changing their role"
                        className="rounded-full px-2.5 py-1 text-xs font-medium"
                        style={
                          u.isFellowshipLeader
                            ? { background: "var(--accent-soft)", color: "var(--accent-ink)" }
                            : { background: "var(--surface-2)", color: "var(--ink-muted)" }
                        }
                      >
                        {u.isFellowshipLeader ? "Can lead a cell ✓" : "Grant cell leadership"}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onTogglePastorGrant(u)}
                      title="Receives every fellowship report submitted, alongside the Org Admin and the Fellowships department head"
                      className="rounded-full px-2.5 py-1 text-xs font-medium"
                      style={
                        u.isPastor
                          ? { background: "var(--accent-soft)", color: "var(--accent-ink)" }
                          : { background: "var(--surface-2)", color: "var(--ink-muted)" }
                      }
                    >
                      {u.isPastor ? "Pastor ✓" : "Make Pastor"}
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleFellowshipsDepartmentHeadGrant(u)}
                      title="The one person all fellowship/cell leaders report to -- receives every fellowship report submitted"
                      className="rounded-full px-2.5 py-1 text-xs font-medium"
                      style={
                        u.isFellowshipsDepartmentHead
                          ? { background: "var(--accent-soft)", color: "var(--accent-ink)" }
                          : { background: "var(--surface-2)", color: "var(--ink-muted)" }
                      }
                    >
                      {u.isFellowshipsDepartmentHead ? "Fellowships dept. head ✓" : "Make Fellowships dept. head"}
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleDevotionalEditorGrant(u)}
                      title={`Lets them write/edit the ${terms.devotional}`}
                      className="rounded-full px-2.5 py-1 text-xs font-medium"
                      style={
                        u.isDevotionalEditor
                          ? { background: "var(--accent-soft)", color: "var(--accent-ink)" }
                          : { background: "var(--surface-2)", color: "var(--ink-muted)" }
                      }
                    >
                      {u.isDevotionalEditor ? `${terms.devotional} editor ✓` : `Make ${terms.devotional.toLowerCase()} editor`}
                    </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <AuditLogSection />
    </div>
  );
}
