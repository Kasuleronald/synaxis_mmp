import { useEffect, useState } from "react";
import { failedEntries, onOutboxChange, pendingCount, retry } from "../lib/sync";

type Status = "synced" | "syncing" | "offline" | "failed";

export function SyncStatus() {
  const [status, setStatus] = useState<Status>("synced");
  const [pending, setPending] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [open, setOpen] = useState(false);

  async function refresh() {
    const [pendingN, failed, online] = await Promise.all([
      pendingCount(),
      failedEntries(),
      Promise.resolve(navigator.onLine),
    ]);
    setPending(pendingN);
    setFailedCount(failed.length);
    if (!online) setStatus("offline");
    else if (failed.length > 0) setStatus("failed");
    else if (pendingN > 0) setStatus("syncing");
    else setStatus("synced");
  }

  useEffect(() => {
    refresh();
    const unsub = onOutboxChange(refresh);
    window.addEventListener("online", refresh);
    window.addEventListener("offline", refresh);
    return () => {
      unsub();
      window.removeEventListener("online", refresh);
      window.removeEventListener("offline", refresh);
    };
  }, []);

  if (status === "synced" && pending === 0) return null;

  const meta: Record<Status, { label: string; color: string }> = {
    synced: { label: "Synced", color: "#1baf7a" },
    syncing: { label: `Syncing (${pending})`, color: "#eda100" },
    offline: { label: `Offline${pending ? ` – ${pending} queued` : ""}`, color: "#898781" },
    failed: { label: `Sync failed (${failedCount})`, color: "#e34948" },
  };
  const m = meta[status];

  async function retryAll() {
    const failed = await failedEntries();
    await Promise.all(failed.map((f) => retry(f.id)));
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs"
        style={{ borderColor: "var(--line)", background: "var(--surface)", color: "var(--ink)" }}
      >
        <span className="inline-block rounded-full" style={{ width: 8, height: 8, background: m.color }} />
        {m.label}
      </button>
      {open && status === "failed" && (
        <div
          className="absolute right-0 mt-1 w-56 rounded-md border p-3 text-xs shadow-lg z-10"
          style={{ borderColor: "var(--line)", background: "var(--surface)" }}
        >
          <p className="mb-2" style={{ color: "var(--ink-muted)" }}>
            {failedCount} item{failedCount === 1 ? "" : "s"} couldn't sync. The server rejected them --
            check the data, then retry.
          </p>
          <button
            type="button"
            onClick={retryAll}
            className="rounded-md px-3 py-1.5 text-xs font-medium w-full"
            style={{ background: "var(--accent)", color: "white" }}
          >
            Retry all
          </button>
        </div>
      )}
    </div>
  );
}
