// Bootstraps the very first Platform Administrator. Run once per environment:
//   npm run seed --workspace apps/api
//
// Not wired into `prisma migrate deploy` on purpose -- seeding a login is an
// operator action, not a schema change.
import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";
import "dotenv/config";

// Uses the superuser connection, not RUNTIME_DATABASE_URL -- the restricted
// role is subject to row-level security, and this insert has no tenant
// context (organizationId is null) to satisfy it.
const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
});

async function main() {
  const email = requireEnv("PLATFORM_ADMIN_EMAIL").toLowerCase();
  const password = requireEnv("PLATFORM_ADMIN_PASSWORD");
  const fullName = process.env.PLATFORM_ADMIN_NAME ?? "Platform Administrator";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Platform Administrator ${email} already exists -- nothing to do.`);
    return;
  }

  const passwordHash = await argon2.hash(password);
  const admin = await prisma.user.create({
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
