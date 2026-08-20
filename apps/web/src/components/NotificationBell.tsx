import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { NotificationDto } from "@life-mmp/shared";
import { api } from "../lib/api";

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

export function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationDto[]>([]);
  const [unread, setUnread] = useState(0);

  async function refreshCount() {
    try {
      setUnread(await api.get<number>("/notifications/unread-count"));
    } catch {
      // Not fatal -- the badge just stays stale until the next poll.
    }
  }

  useEffect(() => {
    refreshCount();
    const interval = setInterval(refreshCount, 30_000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggle() {
    if (!open) {
      try {
        setItems(await api.get<NotificationDto[]>("/notifications"));
      } catch {
        setItems([]);
      }
    }
    setOpen((o) => !o);
  }

  async function onClickItem(n: NotificationDto) {
    if (!n.readAt) {
      await api.post(`/notifications/${n.id}/read`);
      setItems((prev) => prev.map((i) => (i.id === n.id ? { ...i, readAt: new Date().toISOString() } : i)));
      setUnread((u) => Math.max(0, u - 1));
    }
    setOpen(false);
    if (n.link) navigate(n.link);
  }

  async function markAllRead() {
    await api.post("/notifications/read-all");
    setItems((prev) => prev.map((i) => ({ ...i, readAt: i.readAt ?? new Date().toISOString() })));
    setUnread(0);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggle}
        title="Notifications"
        className="relative rounded-md p-1.5"
        style={{ color: "var(--ink-muted)" }}
      >
        <BellIcon />
        {unread > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 rounded-full text-[10px] font-semibold flex items-center justify-center"
            style={{ width: 16, height: 16, background: "var(--danger)", color: "white" }}
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div
          className="absolute right-0 mt-1 w-80 rounded-md border shadow-lg z-20 max-h-96 overflow-y-auto"
          style={{ borderColor: "var(--line)", background: "var(--surface)" }}
        >
          <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: "var(--line-soft)" }}>
            <span className="text-sm font-medium">Notifications</span>
            {unread > 0 && (
              <button type="button" onClick={markAllRead} className="text-xs underline" style={{ color: "var(--accent-ink)" }}>
                Mark all read
              </button>
            )}
          </div>
          {items.length === 0 && (
            <div className="p-4 text-sm" style={{ color: "var(--ink-muted)" }}>
              Nothing yet.
            </div>
          )}
          {items.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => onClickItem(n)}
              className="block w-full text-left px-3 py-2 text-sm border-t first:border-t-0"
              style={{ borderColor: "var(--line-soft)", background: n.readAt ? "transparent" : "var(--accent-soft)" }}
            >
              <div style={{ color: "var(--ink)" }}>{n.message}</div>
              <div className="text-xs mt-0.5" style={{ color: "var(--ink-muted)" }}>
                {new Date(n.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
