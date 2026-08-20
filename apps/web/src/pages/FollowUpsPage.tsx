import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FollowUpStatus, type FollowUpDto } from "@life-mmp/shared";
import { api } from "../lib/api";

const TABS: { value: FollowUpStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: FollowUpStatus.PENDING, label: "Pending" },
  { value: FollowUpStatus.IN_PROGRESS, label: "In progress" },
  { value: FollowUpStatus.COMPLETED, label: "Completed" },
];

export function FollowUpsPage() {
  const [followUps, setFollowUps] = useState<FollowUpDto[]>([]);
  const [tab, setTab] = useState<FollowUpStatus | "ALL">(FollowUpStatus.PENDING);

  useEffect(() => {
    api
      .get<FollowUpDto[]>(`/follow-ups${tab === "ALL" ? "" : `?status=${tab}`}`)
      .then(setFollowUps)
      .catch(() => setFollowUps([]));
  }, [tab]);

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold mb-1">Follow-up queue</h1>
      <p className="text-sm mb-4" style={{ color: "var(--ink-muted)" }}>
        Every visitor and new convert who needs a next step.
      </p>

      <div className="flex gap-1 mb-4">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className="rounded-md px-3 py-1.5 text-sm font-medium"
            style={
              tab === t.value
                ? { background: "var(--accent)", color: "white" }
                : { background: "var(--surface-2)", color: "var(--ink-muted)" }
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--line)" }}>
        {followUps.length === 0 && (
          <div className="p-4 text-sm" style={{ color: "var(--ink-muted)" }}>
            Nothing here.
          </div>
        )}
        {followUps.map((f) => (
          <Link
            key={f.id}
            to={`/members/${f.memberId}`}
            className="block px-4 py-3 border-t first:border-t-0"
            style={{ borderColor: "var(--line-soft)" }}
          >
            <div className="text-sm font-medium" style={{ color: "var(--ink)" }}>
              {f.member?.fullName ?? "Member"}
            </div>
            <div className="text-xs" style={{ color: "var(--ink-muted)" }}>
              {f.notes}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
