import { useEffect, useState, type FormEvent } from "react";
import { ORG_ASSIGNABLE_ROLES, Role, type BranchDto, type UserDto } from "@life-mmp/shared";
import { api, ApiError } from "../lib/api";

export function OrgAdminPage() {
  const [branches, setBranches] = useState<BranchDto[]>([]);
  const [users, setUsers] = useState<UserDto[]>([]);
  const [branchName, setBranchName] = useState("");
  const [branchError, setBranchError] = useState<string | null>(null);

  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState<Role>(Role.FELLOWSHIP_LEADER);
  const [userBranchId, setUserBranchId] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [userError, setUserError] = useState<string | null>(null);
  const [userMessage, setUserMessage] = useState<string | null>(null);

  async function loadAll() {
    const [b, u] = await Promise.all([api.get<BranchDto[]>("/branches"), api.get<UserDto[]>("/users")]);
    setBranches(b);
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
    <div className="max-w-4xl grid gap-8 lg:grid-cols-2">
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
          {branches.map((b) => (
            <div
              key={b.id}
              className="px-4 py-3 border-t first:border-t-0 text-sm"
              style={{ borderColor: "var(--line-soft)" }}
            >
              {b.name} {b.isMain && <span style={{ color: "var(--ink-muted)" }}>· main</span>}
            </div>
          ))}
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
              className="px-4 py-3 border-t first:border-t-0 text-sm flex items-center justify-between"
              style={{ borderColor: "var(--line-soft)" }}
            >
              <span>{u.fullName}</span>
              <div className="flex items-center gap-3">
                <span style={{ color: "var(--ink-muted)" }}>{u.role.replace(/_/g, " ").toLowerCase()}</span>
                {u.role !== Role.ORG_ADMIN && (
                  <>
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
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
