import { useState } from "react";
import { Theme, type OrganizationDto } from "@life-mmp/shared";
import { api, ApiError } from "../lib/api";
import { EditIcon, IconButton } from "./icons";

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
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

export function OrganizationDialog({
  organization,
  onClose,
  onChange,
}: {
  organization: OrganizationDto;
  onClose: () => void;
  onChange: (updated: OrganizationDto) => void;
}) {
  const [org, setOrg] = useState(organization);
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [displayName, setDisplayName] = useState(org.displayName);
  const [theme, setTheme] = useState<Theme>(org.theme);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSentTo, setResetSentTo] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  async function onSave() {
    setSaving(true);
    setError(null);
    try {
      const updated = await api.patch<OrganizationDto>(`/organizations/${org.id}`, { displayName, theme });
      setOrg(updated);
      onChange(updated);
      setMode("view");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save changes.");
    } finally {
      setSaving(false);
    }
  }

  async function onSendResetLink() {
    setResetting(true);
    setError(null);
    try {
      const res = await api.post<{ email: string }>(`/organizations/${org.id}/admin/reset-link`);
      setResetSentTo(res.email);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't send the reset email.");
    } finally {
      setResetting(false);
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
            {mode === "edit" ? "Edit organization" : org.displayName}
          </h2>
          <div className="flex items-center gap-1">
            {mode === "view" && (
              <IconButton onClick={() => setMode("edit")} title="Edit">
                <EditIcon />
              </IconButton>
            )}
            <IconButton onClick={onClose} title="Close">
              <CloseIcon />
            </IconButton>
          </div>
        </div>

        <div className="p-5">
          {error && (
            <div className="mb-4 rounded-md p-3 text-sm" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
              {error}
            </div>
          )}

          {mode === "view" && (
            <>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm mb-5">
                <Field label="Slug" value={org.slug} />
                <Field label="Theme" value={org.theme.charAt(0) + org.theme.slice(1).toLowerCase()} />
                <Field label="Country" value={org.country} />
                <Field label="City" value={org.city} />
                <Field label="Contact email" value={org.contactEmail} />
                <Field label="Contact phone" value={org.contactPhone} />
                <Field label="Status" value={org.isSuspended ? "Suspended" : "Active"} />
              </dl>

              <div className="pt-4 border-t" style={{ borderColor: "var(--line-soft)" }}>
                <p className="text-xs mb-2" style={{ color: "var(--ink-muted)" }}>
                  Sends a password reset link straight to this org's admin -- it goes only to
                  their own email, valid for 24 hours; you won't see the link yourself.
                </p>
                {resetSentTo ? (
                  <div className="rounded-md border p-3 text-xs" style={{ borderColor: "var(--line)", color: "var(--ink-muted)" }}>
                    Reset email sent to {resetSentTo}.
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={resetting}
                    onClick={onSendResetLink}
                    className="rounded-md px-3 py-1.5 text-xs font-medium disabled:opacity-60"
                    style={{ background: "var(--surface-2)", color: "var(--ink)" }}
                  >
                    {resetting ? "Sending…" : "Send password reset email"}
                  </button>
                )}
              </div>
            </>
          )}

          {mode === "edit" && (
            <div className="grid gap-3">
              <div>
                <label className="block text-sm mb-1">Church name</label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  style={{ borderColor: "var(--line)" }}
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Theme</label>
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
              <p className="text-xs" style={{ color: "var(--ink-muted)" }}>
                Slug can't be changed here -- it's baked into the org's registration link.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={onSave}
                  className="rounded-md px-4 py-2 text-sm font-medium disabled:opacity-60"
                  style={{ background: "var(--accent)", color: "white" }}
                >
                  {saving ? "Saving…" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => setMode("view")}
                  className="rounded-md px-4 py-2 text-sm font-medium"
                  style={{ background: "var(--surface-2)", color: "var(--ink)" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
