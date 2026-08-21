// Bootstraps the very first Platform Administrator. Run once per environment:
//   npm run seed --workspace apps/api
//
// Not wired into `prisma migrate deploy` on purpose -- seeding a login is an
// operator action, not a schema change.
import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import "dotenv/config";

// RUNTIME_DATABASE_URL (the restricted role), same as the running app --
// bypassing RLS here isn't a superuser privilege, it's the same
// app.is_platform_admin session GUC that runWithTenant (src/prisma/tenant.ts)
// sets for every other platform-admin operation. There is no separate
// "superuser bypasses RLS" path: FORCE ROW LEVEL SECURITY is set on `users`,
// so even the table owner is subject to the same policies.
const prisma = new PrismaClient({
  datasourceUrl: process.env.RUNTIME_DATABASE_URL,
});

async function main() {
  const email = requireEnv("PLATFORM_ADMIN_EMAIL").toLowerCase();
  const password = requireEnv("PLATFORM_ADMIN_PASSWORD");
  const fullName = process.env.PLATFORM_ADMIN_NAME ?? "Platform Administrator";

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_org_id', '', true)`;
    await tx.$executeRaw`SELECT set_config('app.is_platform_admin', 'true', true)`;
    await tx.$executeRaw`SELECT set_config('app.public_checkin', 'false', true)`;
    await tx.$executeRaw`SELECT set_config('app.public_registration', 'false', true)`;

    const existing = await tx.user.findUnique({ where: { email } });
    if (existing) {
      console.log(`Platform Administrator ${email} already exists -- nothing to do.`);
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const admin = await tx.user.create({
      data: {
        email,
        fullName,
        passwordHash,
        role: "PLATFORM_ADMIN",
        organizationId: null,
        branchId: null,
      },
    });

    console.log(`Created Platform Administrator ${admin.email} (${admin.id}).`);
    console.log("Log in with the PLATFORM_ADMIN_EMAIL / PLATFORM_ADMIN_PASSWORD from your .env, then change the password.");
  });
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var ${name}`);
  return value;
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
