import { Role, SessionUser } from "@life-mmp/shared";
import { TenantContext } from "../prisma/tenant";

export function tenantContextFor(user: SessionUser): TenantContext {
  return {
    organizationId: user.organizationId,
    isPlatformAdmin: user.role === Role.PLATFORM_ADMIN,
  };
}

const ALL_BRANCHES_ROLES: Role[] = [Role.ORG_ADMIN, Role.FINANCE_OFFICER];

/** Which single branch a user's lists/reports should be scoped to --
 * `undefined` means "no restriction, see every branch" (Org Admin, Finance
 * Officer, matching their existing org-wide access elsewhere). Everyone else
 * (Aug 2026: "Branches should see data for that branch alone") only ever
 * sees their own assigned branch -- returned as the literal `null` when
 * they don't have one, which callers must filter on exactly (`branchId:
 * null`), not treat as "no filter": a branch-scoped user with no branch
 * assigned should see only the org's own not-yet-branched records, never
 * every branch's data by default. */
export function branchScopeFor(user: SessionUser): string | null | undefined {
  if (ALL_BRANCHES_ROLES.includes(user.role)) return undefined;
  return user.branchId;
}
