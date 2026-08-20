import { Prisma } from "@prisma/client";
import { PrismaService } from "./prisma.service";

export interface TenantContext {
  organizationId: string | null;
  isPlatformAdmin: boolean;
  /**
   * Narrow, single-purpose bypass for the public QR check-in flow (Section
   * 2/10): resolving an AttendanceSession by its unguessable qrToken before
   * any org context is known, mirroring how AuthService resolves a user by
   * email before login. Only the attendance_sessions RLS policy reads this
   * GUC, and only for a lookup by that exact unique token -- never a listing,
   * never any other ministry-data table. Once the session's organizationId
   * is known, every subsequent query in the flow uses a normal tenant
   * context, not this one.
   */
  publicCheckin?: boolean;
  /**
   * Same shape of bypass as publicCheckin, for the public self-registration
   * form (Members page "Registrations" flow): resolving an Organization by
   * its slug before any org context is known. Only the organizations RLS
   * policy reads this GUC, and only widens a lookup by that exact unique
   * slug -- never a listing of other orgs' data.
   */
  publicRegistration?: boolean;
}

/**
 * Every database operation in the app runs through this. It opens an
 * interactive transaction, sets the RLS session GUCs the migrations'
 * policies read (app.current_org_id, app.is_platform_admin,
 * app.public_checkin), and only then runs the caller's queries -- so
 * Postgres itself, not just application code, is what enforces tenant
 * isolation (Section 13).
 *
 * `set_config(..., true)` is the parameterized equivalent of `SET LOCAL`:
 * scoped to this transaction only, and safe against injection because the
 * value travels as a bound parameter, not interpolated SQL.
 */
export async function runWithTenant<T>(
  prisma: PrismaService,
  ctx: TenantContext,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_org_id', ${ctx.organizationId ?? ""}, true)`;
    await tx.$executeRaw`SELECT set_config('app.is_platform_admin', ${ctx.isPlatformAdmin ? "true" : "false"}, true)`;
    await tx.$executeRaw`SELECT set_config('app.public_checkin', ${ctx.publicCheckin ? "true" : "false"}, true)`;
    await tx.$executeRaw`SELECT set_config('app.public_registration', ${ctx.publicRegistration ? "true" : "false"}, true)`;
    return fn(tx);
  });
}
