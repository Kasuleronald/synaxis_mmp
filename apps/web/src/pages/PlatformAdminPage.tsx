import { useEffect, useState, type FormEvent } from "react";
import { Theme, type OrganizationDto } from "@life-mmp/shared";
import { api, ApiError } from "../lib/api";
import { PasswordInput } from "../components/PasswordInput";
import { OrganizationDialog } from "../components/OrganizationDialog";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function PlatformAdminPage() {
  const [orgs, setOrgs] = useState<OrganizationDto[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [theme, setTheme] = useState<Theme>(Theme.ONYX);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [suspendingId, setSuspendingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<OrganizationDto | null>(null);

  async function loadOrgs() {
    const data = await api.get<OrganizationDto[]>("/organizations");
    setOrgs(data);
  }

  useEffect(() => {
    loadOrgs().catch(() => {});
  }, []);

  async function toggleSuspended(org: OrganizationDto) {
    setSuspendingId(org.id);
    try {
      const updated = await api.patch<OrganizationDto>(`/organizations/${org.id}/suspension`, {
        isSuspended: !org.isSuspended,
      });
      setOrgs((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
    } finally {
      setSuspendingId(null);
    }
  }

  function resetCreateForm() {
    setDisplayName("");
    setSlug("");
    setSlugTouched(false);
    setTheme(Theme.ONYX);
    setAdminEmail("");
    setAdminName("");
    setAdminPassword("");
    setError(null);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post("/organizations", {
        displayName,
        slug,
        theme,
        orgAdmin: { email: adminEmail, fullName: adminName, password: adminPassword },
      });
      setMessage(`${displayName} created. Share the login details with ${adminEmail} directly, not over an open channel.`);
      resetCreateForm();
      setShowCreate(false);
      await loadOrgs();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-semibold">Platform Administration</h1>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="rounded-md px-3 py-1.5 text-sm font-medium"
          style={{ background: "var(--accent)", color: "white" }}
        >
          + Add organization
        </button>
      </div>
      <p className="text-sm mb-6" style={{ color: "var(--ink-muted)" }}>
        Create a new church as a tenant and appoint its first Organization Admin. You'll have no
        further access to their members, giving, or pastoral data (Section 6) — this is the only
        screen a Platform Administrator gets.
      </p>

      {message && (
        <div
          className="rounded-md px-3 py-2 mb-4 text-sm"
          style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}
        >
          {message}
        </div>
      )}

      <h2 className="text-sm font-medium mb-3" style={{ color: "var(--ink-muted)" }}>
        Organizations ({orgs.length})
      </h2>
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--line)" }}>
        {orgs.length === 0 && (
          <div className="p-4 text-sm" style={{ color: "var(--ink-muted)" }}>
            No organizations yet.
          </div>
        )}
        {orgs.map((org) => (
          <div
            key={org.id}
            className="flex items-center justify-between px-4 py-3 border-t first:border-t-0"
            style={{ borderColor: "var(--line-soft)" }}
          >
            <button type="button" onClick={() => setSelected(org)} className="text-left flex-1">
              <div className="text-sm font-medium flex items-center gap-2">
                {org.displayName}
                {org.isSuspended && (
                  <span
                    className="rounded-full px-2 py-0.5 text-xs font-medium"
                    style={{ background: "var(--danger-soft)", color: "var(--danger)" }}
                  >
                    Suspended
                  </span>
                )}
              </div>
              <div className="text-xs" style={{ color: "var(--ink-muted)" }}>
                {org.slug} · {org.theme.toLowerCase()}
              </div>
            </button>
            <button
              type="button"
              disabled={suspendingId === org.id}
              onClick={() => toggleSuspended(org)}
              className="rounded-md px-3 py-1.5 text-xs font-medium disabled:opacity-50 shrink-0"
              style={
                org.isSuspended
                  ? { background: "var(--accent)", color: "white" }
                  : { background: "var(--surface-2)", color: "var(--ink)" }
              }
            >
              {org.isSuspended ? "Reactivate" : "Suspend"}
            </button>
          </div>
        ))}
      </div>

      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => setShowCreate(false)}
        >
          <form
            onSubmit={onSubmit}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-xl border p-5 grid gap-4 sm:grid-cols-2 max-h-[90vh] overflow-y-auto"
            style={{ borderColor: "var(--line)", background: "var(--surface)" }}
          >
            <div className="sm:col-span-2 flex items-center justify-between">
              <h2 className="text-lg font-semibold">New organization</h2>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="text-sm"
                style={{ color: "var(--ink-muted)" }}
              >
                ✕
              </button>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm mb-1">Church / organization name</label>
              <input
                required
                value={displayName}
                onChange={(e) => {
                  setDisplayName(e.target.value);
                  if (!slugTouched) setSlug(slugify(e.target.value));
                }}
                className="w-full rounded-md border px-3 py-2 text-sm"
                style={{ borderColor: "var(--line)" }}
              />
            </div>

            <div>
              <label className="block text-sm mb-1">Slug (subdomain-safe)</label>
              <input
                required
                value={slug}
                onChange={(e) => {
                  setSlug(slugify(e.target.value));
                  setSlugTouched(true);
                }}
                className="w-full rounded-md border px-3 py-2 text-sm"
                style={{ borderColor: "var(--line)" }}
              />
            </div>

            <div>
              <label className="block text-sm mb-1">Default theme</label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as Theme)}
                className="w-full rounded-md border px-3 py-2 text-sm"
                style={{ borderColor: "var(--line)" }}
              >
                {Object.values(Theme).map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0) + t.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2 border-t pt-4" style={{ borderColor: "var(--line-soft)" }}>
              <div className="text-sm font-medium mb-3">First Organization Admin</div>
            </div>

            <div>
              <label className="block text-sm mb-1">Full name</label>
              <input
                required
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm"
                style={{ borderColor: "var(--line)" }}
              />
            </div>

            <div>
              <label className="block text-sm mb-1">Email</label>
              <input
                type="email"
                required
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm"
                style={{ borderColor: "var(--line)" }}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm mb-1">Temporary password</label>
              <PasswordInput
                required
                minLength={8}
                value={adminPassword}
                onChange={setAdminPassword}
                className="w-full rounded-md border px-3 py-2 pr-10 text-sm"
                style={{ borderColor: "var(--line)" }}
              />
            </div>

            {error && (
              <div
                className="sm:col-span-2 rounded-md px-3 py-2 text-sm"
                style={{ background: "var(--danger-soft)", color: "var(--danger)" }}
              >
                {error}
              </div>
            )}

            <div className="sm:col-span-2 flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-md px-4 py-2 text-sm font-medium disabled:opacity-60"
                style={{ background: "var(--accent)", color: "white" }}
              >
                {submitting ? "Creating…" : "Create organization"}
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="rounded-md px-4 py-2 text-sm font-medium"
                style={{ background: "var(--surface-2)", color: "var(--ink)" }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {selected && (
        <OrganizationDialog
          organization={selected}
          onClose={() => setSelected(null)}
          onChange={(updated) => {
            setOrgs((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
            setSelected(updated);
          }}
        />
      )}
    </div>
  );
}
