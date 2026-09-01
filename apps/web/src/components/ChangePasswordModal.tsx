import { useState } from "react";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { PasswordInput } from "./PasswordInput";

/** Used both as an optional dropdown action (Avatar menu) and as the
 * mandatory first-login screen (App.tsx, when user.mustChangePassword is
 * true) -- `forced` just hides the cancel/close affordances, the actual
 * form and submit logic are identical either way. */
export function ChangePasswordModal({ forced, onClose }: { forced?: boolean; onClose: () => void }) {
  const { refreshUser } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) {
      setError("The new password and confirmation don't match.");
      return;
    }
    setSaving(true);
    try {
      await api.post("/auth/change-password", { currentPassword, newPassword });
      await refreshUser();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't change your password.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={forced ? undefined : onClose}
    >
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-xl border p-5 grid gap-3"
        style={{ borderColor: "var(--line)", background: "var(--surface)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold" style={{ color: "var(--ink)" }}>
          {forced ? "Set a new password to continue" : "Change your password"}
        </h2>
        {forced && (
          <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
            Your account still has a temporary password. Choose your own before continuing.
          </p>
        )}

        <div>
          <label className="block text-sm mb-1">Current password</label>
          <PasswordInput required value={currentPassword} onChange={setCurrentPassword} />
        </div>
        <div>
          <label className="block text-sm mb-1">New password</label>
          <PasswordInput required minLength={8} value={newPassword} onChange={setNewPassword} />
        </div>
        <div>
          <label className="block text-sm mb-1">Confirm new password</label>
          <PasswordInput required minLength={8} value={confirmPassword} onChange={setConfirmPassword} />
        </div>

        {error && (
          <div className="rounded-md px-3 py-2 text-sm" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
            {error}
          </div>
        )}

        <div className="flex gap-2 justify-end">
          {!forced && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-4 py-2 text-sm font-medium"
              style={{ background: "var(--surface-2)", color: "var(--ink)" }}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={saving}
            className="rounded-md px-4 py-2 text-sm font-medium disabled:opacity-60"
            style={{ background: "var(--accent)", color: "white" }}
          >
            {saving ? "Saving…" : "Set password"}
          </button>
        </div>
      </form>
    </div>
  );
}
