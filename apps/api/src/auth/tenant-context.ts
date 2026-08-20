import { Role, SessionUser } from "@life-mmp/shared";
import { TenantContext } from "../prisma/tenant";

export function tenantContextFor(user: SessionUser): TenantContext {
  return {
    organizationId: user.organizationId,
    isPlatformAdmin: user.role === Role.PLATFORM_ADMIN,
  };
}
