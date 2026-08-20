import { useEffect, useState } from "react";
import { RegistrationStatus, type SelfRegistrationDto } from "@life-mmp/shared";
import { useOrg } from "../context/OrgContext";
import { api, ApiError } from "../lib/api";
import { RegistrationDialog } from "../components/RegistrationDialog";

const STATUS_COLORS: Record<RegistrationStatus, string> = {
  PENDING: "var(--warn)",
  APPROVED: "var(--accent-ink)",
  REJECTED: "var(--ink-muted)",
};

export function RegistrationsPage() {
  const { org } = useOrg();
  const [registrations, setRegistrations] = useState<SelfRegistrationDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [selected, setSelected] = useState<SelfRegistrationDto | null>(null);

  async function load() {
    setRegistrations(await api.get<SelfRegistrationDto[]>("/registrations"));
  }

  useEffect(() => {
    load();
  }, []);

  async function act(id: string, action: "approve" | "reject") {
    setBusyId(id);
    setError(null);
    try {
      await api.post(`/registrations/${id}/${action}`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setBusyId(null);
    }
  }

  const link = org ? `${window.location.origin}/register/${org.slug}` : "";

  function copyLink() {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const pending = registrations.filter((r) => r.status === RegistrationStatus.PENDING);
  const resolved = registrations.filter((r) => r.status !== RegistrationStatus.PENDING);

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold mb-1">Registrations</h1>
      <p className="text-sm mb-4" style={{ color: "var(--ink-muted)" }}>
        Anyone can register themselves through your public link -- nothing becomes a real member until
        an appointed approver confirms it here.
      </p>

      {org && (
        <div className="rounded-xl border p-3 mb-6 flex items-center gap-2" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
          <code className="flex-1 text-xs truncate" style={{ color: "var(--ink-muted)" }}>
            {link}
          </code>
          <button
            type="button"
            onClick={copyLink}
            className="rounded-md px-3 py-1.5 text-xs font-medium shrink-0"
            style={{ background: "var(--accent)", color: "white" }}
          >
            {copied ? "Copied!" : "Copy link"}
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-md px-3 py-2 mb-4 text-sm" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
          {error}
        </div>
      )}

      <h2 className="text-sm font-medium mb-3" style={{ color: "var(--ink-muted)" }}>
        Pending ({pending.length})
      </h2>
      <div className="rounded-xl border overflow-hidden mb-8" style={{ borderColor: "var(--line)" }}>
        {pending.length === 0 && (
          <div className="p-4 text-sm" style={{ color: "var(--ink-muted)" }}>
            Nothing waiting.
          </div>
        )}
        {pending.map((r) => (
          <div key={r.id} className="px-4 py-3 border-t first:border-t-0" style={{ borderColor: "var(--line-soft)" }}>
            <div className="flex items-center justify-between">
              <button type="button" onClick={() => setSelected(r)} className="text-left">
                <div className="text-sm font-medium underline decoration-dotted" style={{ color: "var(--ink)" }}>
                  {r.fullName}
                </div>
                <div className="text-xs" style={{ color: "var(--ink-muted)" }}>
                  {[r.phone, r.email, r.nationality, r.address].filter(Boolean).join(" · ") ||
                    "No contact details given"}
                </div>
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busyId === r.id}
                  onClick={() => act(r.id, "approve")}
                  className="rounded-md px-3 py-1.5 text-xs font-medium disabled:opacity-40"
                  style={{ background: "var(--accent)", color: "white" }}
                >
                  Approve
                </button>
                <button
                  type="button"
                  disabled={busyId === r.id}
                  onClick={() => act(r.id, "reject")}
                  className="rounded-md px-3 py-1.5 text-xs font-medium disabled:opacity-40"
                  style={{ background: "var(--surface-2)", color: "var(--ink)" }}
                >
                  Reject
                </button>
              </div>
            </div>
            {r.notes && (
              <p className="text-xs mt-1" style={{ color: "var(--ink-muted)" }}>
                "{r.notes}"
              </p>
            )}
          </div>
        ))}
      </div>

      <h2 className="text-sm font-medium mb-3" style={{ color: "var(--ink-muted)" }}>
        History
      </h2>
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--line)" }}>
        {resolved.length === 0 && (
          <div className="p-4 text-sm" style={{ color: "var(--ink-muted)" }}>
            Nothing reviewed yet.
          </div>
        )}
        {resolved.map((r) => (
          <div key={r.id} className="px-4 py-3 border-t first:border-t-0 flex items-center justify-between" style={{ borderColor: "var(--line-soft)" }}>
            <div>
              <div className="text-sm">{r.fullName}</div>
              <div className="text-xs" style={{ color: "var(--ink-muted)" }}>
                {r.status === RegistrationStatus.APPROVED ? "Approved" : "Rejected"} by {r.reviewedBy?.fullName ?? "—"}
              </div>
            </div>
            <span className="text-xs font-medium" style={{ color: STATUS_COLORS[r.status] }}>
              {r.status}
            </span>
          </div>
        ))}
      </div>

      {selected && (
        <RegistrationDialog
          registration={selected}
          busy={busyId === selected.id}
          onClose={() => setSelected(null)}
          onApprove={async () => {
            await act(selected.id, "approve");
            setSelected(null);
          }}
          onReject={async () => {
            await act(selected.id, "reject");
            setSelected(null);
          }}
        />
      )}
    </div>
  );
}
