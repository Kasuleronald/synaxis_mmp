import { useEffect, useState, type FormEvent, type KeyboardEvent } from "react";
import { Role, type AnnouncementDto, type BranchDto } from "@life-mmp/shared";
import { useAuth } from "../context/AuthContext";
import { api, ApiError } from "../lib/api";
import { ConfirmCreatePreview } from "../components/ConfirmCreatePreview";

function blockEnterSubmit(e: KeyboardEvent<HTMLFormElement>) {
  if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "TEXTAREA") {
    e.preventDefault();
  }
}

const ROLE_OPTIONS = [
  Role.ORG_ADMIN,
  Role.FINANCE_OFFICER,
  Role.DEPARTMENT_HEAD,
  Role.FELLOWSHIP_LEADER,
  Role.VOLUNTEER,
];

export function AnnouncementsPage() {
  const { user } = useAuth();
  const canSend = user?.role === Role.ORG_ADMIN;
  const [announcements, setAnnouncements] = useState<AnnouncementDto[]>([]);
  const [branches, setBranches] = useState<BranchDto[]>([]);
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");
  const [audienceMode, setAudienceMode] = useState<"all" | "role" | "branch">("all");
  const [targetRole, setTargetRole] = useState<Role>(Role.FELLOWSHIP_LEADER);
  const [targetBranchId, setTargetBranchId] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const [a, b] = await Promise.all([
      api.get<AnnouncementDto[]>("/announcements"),
      api.get<BranchDto[]>("/branches"),
    ]);
    setAnnouncements(a);
    setBranches(b);
  }

  useEffect(() => {
    load();
  }, []);

  function audienceDescription() {
    if (audienceMode === "role") return `Everyone with the ${targetRole.replace(/_/g, " ").toLowerCase()} role`;
    if (audienceMode === "branch") return `Everyone at ${branches.find((b) => b.id === targetBranchId)?.name ?? "one branch"}`;
    return "Everyone with a login to this system";
  }

  async function onConfirmSend() {
    setSaving(true);
    setError(null);
    try {
      await api.post("/announcements", {
        message,
        link: link || undefined,
        targetRole: audienceMode === "role" ? targetRole : undefined,
        targetBranchId: audienceMode === "branch" ? targetBranchId : undefined,
      });
      setMessage("");
      setLink("");
      setConfirming(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't send this announcement.");
      setConfirming(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold mb-1">Announcements</h1>
      <p className="text-sm mb-4" style={{ color: "var(--ink-muted)" }}>
        Push an in-app message to your staff and leaders at once. This reaches everyone with a login
        to this system -- it can't reach the wider congregation directly, since no SMS, WhatsApp, or
        email provider is connected yet.
      </p>

      {error && (
        <div className="rounded-md px-3 py-2 mb-4 text-sm" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
          {error}
        </div>
      )}

      {canSend && (
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          setConfirming(true);
        }}
        onKeyDown={blockEnterSubmit}
        className="rounded-xl border p-4 mb-6 grid gap-3"
        style={{ borderColor: "var(--line)", background: "var(--surface)" }}
      >
        <div>
          <label className="block text-sm mb-1">Message</label>
          <textarea
            required
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            className="w-full rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: "var(--line)" }}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Link (optional)</label>
          <input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="/events"
            className="w-full rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: "var(--line)" }}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Audience</label>
          <div className="flex gap-3 mb-2 text-sm">
            <label className="flex items-center gap-1.5">
              <input type="radio" checked={audienceMode === "all"} onChange={() => setAudienceMode("all")} />
              Everyone
            </label>
            <label className="flex items-center gap-1.5">
              <input type="radio" checked={audienceMode === "role"} onChange={() => setAudienceMode("role")} />
              By role
            </label>
            <label className="flex items-center gap-1.5">
              <input type="radio" checked={audienceMode === "branch"} onChange={() => setAudienceMode("branch")} />
              By branch
            </label>
          </div>
          {audienceMode === "role" && (
            <select
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value as Role)}
              className="w-full rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: "var(--line)" }}
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r.replace(/_/g, " ").toLowerCase()}
                </option>
              ))}
            </select>
          )}
          {audienceMode === "branch" && (
            <select
              value={targetBranchId}
              onChange={(e) => setTargetBranchId(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: "var(--line)" }}
            >
              <option value="">Choose a branch</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <div>
          <button
            type="submit"
            disabled={!message.trim() || (audienceMode === "branch" && !targetBranchId)}
            className="rounded-md px-4 py-2 text-sm font-medium disabled:opacity-60"
            style={{ background: "var(--accent)", color: "white" }}
          >
            Send announcement
          </button>
        </div>
      </form>
      )}

      {confirming && (
        <ConfirmCreatePreview
          title="Send this announcement?"
          confirming={saving}
          onCancel={() => setConfirming(false)}
          onConfirm={onConfirmSend}
          rows={[
            { label: "Message", value: message },
            { label: "Audience", value: audienceDescription() },
            { label: "Link", value: link },
          ]}
        />
      )}

      <h2 className="text-sm font-medium mb-3" style={{ color: "var(--ink-muted)" }}>
        Sent
      </h2>
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--line)" }}>
        {announcements.length === 0 && (
          <div className="p-4 text-sm" style={{ color: "var(--ink-muted)" }}>
            Nothing sent yet.
          </div>
        )}
        {announcements.map((a) => (
          <div key={a.id} className="px-4 py-3 border-t first:border-t-0" style={{ borderColor: "var(--line-soft)" }}>
            <div className="text-sm">{a.message}</div>
            <div className="text-xs mt-0.5" style={{ color: "var(--ink-muted)" }}>
              {a.audienceLabel} · {a.recipientCount} recipient{a.recipientCount === 1 ? "" : "s"} · by{" "}
              {a.sender?.fullName ?? "—"} ·{" "}
              {new Date(a.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
