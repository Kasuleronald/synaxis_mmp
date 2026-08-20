import { useEffect, useState } from "react";
import { DeletionRequestStatus, type DeletionRequestDto } from "@life-mmp/shared";
import { useAuth } from "../context/AuthContext";
import { api, ApiError } from "../lib/api";

const STATUS_COLORS: Record<DeletionRequestStatus, string> = {
  PENDING: "var(--warn)",
  APPROVED: "var(--danger)",
  REJECTED: "var(--ink-muted)",
};

export function DeletionRequestsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<DeletionRequestDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setRequests(await api.get<DeletionRequestDto[]>("/deletion-requests"));
  }

  useEffect(() => {
    load();
  }, []);

  async function act(id: string, action: "approve" | "reject") {
    setBusyId(id);
    setError(null);
    try {
      await api.post(`/deletion-requests/${id}/${action}`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setBusyId(null);
    }
  }

  const pending = requests.filter((r) => r.status === DeletionRequestStatus.PENDING);
  const resolved = requests.filter((r) => r.status !== DeletionRequestStatus.PENDING);

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold mb-1">Deletion requests</h1>
      <p className="text-sm mb-6" style={{ color: "var(--ink-muted)" }}>
        Nothing is removed until an appointed approver confirms it here -- and never by whoever asked
        for it.
      </p>

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
        {pending.map((r) => {
          const isOwnRequest = r.requestedById === user?.id;
          return (
            <div key={r.id} className="px-4 py-3 border-t first:border-t-0" style={{ borderColor: "var(--line-soft)" }}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">
                    {r.entityLabel} <span style={{ color: "var(--ink-muted)" }}>({r.entityType})</span>
                  </div>
                  <div className="text-xs" style={{ color: "var(--ink-muted)" }}>
                    Requested by {r.requestedBy?.fullName ?? "someone"}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={busyId === r.id || isOwnRequest}
                    onClick={() => act(r.id, "approve")}
                    title={isOwnRequest ? "You can't approve your own request" : undefined}
                    className="rounded-md px-3 py-1.5 text-xs font-medium disabled:opacity-40"
                    style={{ background: "var(--danger)", color: "white" }}
                  >
                    Approve delete
                  </button>
                  <button
                    type="button"
                    disabled={busyId === r.id || isOwnRequest}
                    onClick={() => act(r.id, "reject")}
                    className="rounded-md px-3 py-1.5 text-xs font-medium disabled:opacity-40"
                    style={{ background: "var(--surface-2)", color: "var(--ink)" }}
                  >
                    Reject
                  </button>
                </div>
              </div>
              {isOwnRequest && (
                <p className="text-xs mt-1" style={{ color: "var(--ink-muted)" }}>
                  You filed this request -- another approver needs to review it.
                </p>
              )}
            </div>
          );
        })}
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
              <div className="text-sm">{r.entityLabel}</div>
              <div className="text-xs" style={{ color: "var(--ink-muted)" }}>
                {r.status === DeletionRequestStatus.APPROVED ? "Deleted" : "Rejected"} by {r.reviewedBy?.fullName ?? "—"}
              </div>
            </div>
            <span className="text-xs font-medium" style={{ color: STATUS_COLORS[r.status] }}>
              {r.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
