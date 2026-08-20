import Dexie, { type EntityTable } from "dexie";
import type {
  BranchDto,
  FollowUpDto,
  MemberDto,
  OrganizationDto,
  SessionUser,
} from "@life-mmp/shared";

/**
 * The local-first client shell (Section 10). The UI reads/writes this
 * database directly, online or not. Sprint 2 adds the real Tier-1 offline
 * entities -- members, follow-ups, attendance -- as both a local cache
 * (read path) and an outbox queue (write path); see lib/sync.ts for the
 * drain worker that reconciles the outbox with the server.
 */

export type OutboxStatus = "pending" | "syncing" | "synced" | "failed";

export type OutboxEntity = "member" | "followUp" | "attendanceRecord" | "publicCheckIn";

export interface OutboxEntry {
  id: string; // uuid, generated client-side -- doubles as idempotency key
  entity: OutboxEntity;
  operation: "create" | "update";
  payload: unknown;
  // Only set for attendanceRecord: which session it belongs to, since that
  // endpoint is nested under /attendance/sessions/:sessionId/check-in.
  parentId?: string;
  status: OutboxStatus;
  createdAt: string;
  lastError?: string;
}

class LifeMmpDb extends Dexie {
  session!: EntityTable<{ key: string; user: SessionUser }, "key">;
  organizations!: EntityTable<OrganizationDto, "id">;
  branches!: EntityTable<BranchDto, "id">;
  members!: EntityTable<MemberDto, "id">;
  followUps!: EntityTable<FollowUpDto, "id">;
  outbox!: EntityTable<OutboxEntry, "id">;

  constructor() {
    super("life-mmp");
    this.version(1).stores({
      session: "key",
      organizations: "id",
      branches: "id, organizationId",
      outbox: "id, status, entity, createdAt",
    });
    this.version(2).stores({
      members: "id, fullName, status, householdId",
      followUps: "id, memberId, status",
    });
  }
}

export const db = new LifeMmpDb();

export async function cacheSession(user: SessionUser | null) {
  if (user) {
    await db.session.put({ key: "current", user });
  } else {
    await db.session.delete("current");
  }
}

export async function getCachedSession(): Promise<SessionUser | null> {
  const row = await db.session.get("current");
  return row?.user ?? null;
}
