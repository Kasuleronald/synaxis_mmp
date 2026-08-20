import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../lib/api";
import { Logo } from "../components/Logo";
import { PasswordInput } from "../components/PasswordInput";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "var(--bg)", color: "var(--ink)" }}
    >
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-xl border p-6"
        style={{ borderColor: "var(--line)", background: "var(--surface)" }}
      >
        <Logo className="h-16 w-auto mx-auto mb-3" />
        <h1 className="text-lg font-semibold mb-1 text-center">Synaxis MMP</h1>
        <p className="text-sm mb-6 text-center" style={{ color: "var(--ink-muted)" }}>
          A Ministry Management Platform
        </p>

        <label className="block text-sm mb-1">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-md border px-3 py-2 mb-4 text-sm"
          style={{ borderColor: "var(--line)" }}
        />

        <label className="block text-sm mb-1">Password</label>
        <div className="mb-4">
          <PasswordInput
            required
            value={password}
            onChange={setPassword}
            className="w-full rounded-md border px-3 py-2 pr-10 text-sm"
            style={{ borderColor: "var(--line)" }}
          />
        </div>

        {error && (
          <div
            className="rounded-md px-3 py-2 mb-4 text-sm"
            style={{ background: "var(--danger-soft)", color: "var(--danger)" }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md px-3 py-2 text-sm font-medium disabled:opacity-60"
          style={{ background: "var(--accent)", color: "white" }}
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
