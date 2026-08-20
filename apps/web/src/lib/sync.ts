import { api, ApiError } from "./api";
import { db, type OutboxEntity, type OutboxEntry } from "./db";

/**
 * The outbox drain worker (Section 10). Every Tier-1 write goes to Dexie
 * first, always -- even online -- so there is exactly one code path to
 * test, not two (Section 7's design principle). This module is what turns
 * a queued outbox entry into a real server write, idempotently: every
 * Tier-1 endpoint upserts by the client-generated id, so replaying an
 * entry that already landed is a safe no-op, not a duplicate.
 */

function endpointFor(entry: OutboxEntry): string {
  switch (entry.entity) {
    case "member":
      return "/members";
    case "followUp":
      return "/follow-ups";
    case "attendanceRecord":
      return `/attendance/sessions/${entry.parentId}/check-in`;
    case "publicCheckIn":
      return `/checkin/${entry.parentId}`;
  }
}

let draining = false;
const listeners = new Set<() => void>();

export function onOutboxChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  listeners.forEach((fn) => fn());
}

export async function enqueue(entry: Omit<OutboxEntry, "status" | "createdAt">) {
  await db.outbox.put({ ...entry, status: "pending", createdAt: new Date().toISOString() });
  notify();
  void drainOutbox();
}

export async function pendingCount(): Promise<number> {
  return db.outbox.where("status").anyOf("pending", "syncing").count();
}

export async function failedEntries(): Promise<OutboxEntry[]> {
  return db.outbox.where("status").equals("failed").toArray();
}

/** Re-queues a failed entry for another attempt -- the retry action behind
 * the "Sync failed" status (Section 10). */
export async function retry(id: string) {
  await db.outbox.update(id, { status: "pending", lastError: undefined });
  notify();
  void drainOutbox();
}

export async function drainOutbox(): Promise<void> {
  if (draining) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) return;
  draining = true;
  try {
    for (;;) {
      const entry = await db.outbox.where("status").equals("pending").first();
      if (!entry) break;

      await db.outbox.update(entry.id, { status: "syncing" });
      notify();
      try {
        await api.post(endpointFor(entry), entry.payload);
        await db.outbox.delete(entry.id);
      } catch (err) {
        if (err instanceof ApiError && err.status < 500) {
          // The server understood and rejected it -- retrying unchanged
          // would fail the same way. Surface it; a person has to look.
          await db.outbox.update(entry.id, { status: "failed", lastError: err.message });
        } else {
          // Offline, or the server itself is down -- worth trying again
          // later. Stop draining so entries keep their relative order.
          await db.outbox.update(entry.id, { status: "pending" });
          notify();
          break;
        }
      }
      notify();
    }
  } finally {
    draining = false;
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => void drainOutbox());
  setInterval(() => void drainOutbox(), 15_000);
}
