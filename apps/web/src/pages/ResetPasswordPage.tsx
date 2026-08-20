import { useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import { Logo } from "../components/Logo";
import { PasswordInput } from "../components/PasswordInput";

/** Public route -- reached from a link a Platform Admin generated and
 * relayed directly (no email sending exists yet). */
export function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    if (!token) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.post("/auth/reset-password", { token, newPassword: password });
      setDone(true);
      setTimeout(() => navigate("/login", { replace: true }), 2000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--bg)", color: "var(--ink)" }}>
      <div className="w-full max-w-sm rounded-xl border p-6" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
        <Logo className="h-16 w-auto mx-auto mb-3" />
        <h1 className="text-lg font-semibold mb-1 text-center">Set a new password</h1>

        {done ? (
          <p className="text-sm text-center" style={{ color: "var(--accent-ink)" }}>
            Password updated. Redirecting you to sign in…
          </p>
        ) : (
          <form onSubmit={onSubmit}>
            <label className="block text-sm mb-1">New password</label>
            <div className="mb-4">
              <PasswordInput
                required
                minLength={8}
                value={password}
                onChange={setPassword}
                className="w-full rounded-md border px-3 py-2 pr-10 text-sm"
                style={{ borderColor: "var(--line)" }}
              />
            </div>

            <label className="block text-sm mb-1">Confirm password</label>
            <div className="mb-4">
              <PasswordInput
                required
                minLength={8}
                value={confirm}
                onChange={setConfirm}
                className="w-full rounded-md border px-3 py-2 pr-10 text-sm"
                style={{ borderColor: "var(--line)" }}
              />
            </div>

            {error && (
              <div className="rounded-md px-3 py-2 mb-4 text-sm" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md px-3 py-2 text-sm font-medium disabled:opacity-60"
              style={{ background: "var(--accent)", color: "white" }}
            >
              {submitting ? "Saving…" : "Set password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
