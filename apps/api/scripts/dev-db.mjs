// Docker-free local Postgres for machines without Docker Desktop installed.
// docker-compose.yml + db/init/01-app-role.sql remain the documented path;
// this does the same two things (create the restricted life_mmp_app role,
// run migrations) against a portable Postgres binary instead.
//
// Usage: node scripts/dev-db.mjs [--seed]
import EmbeddedPostgres from "embedded-postgres";
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiDir = path.resolve(__dirname, "..");

const pg = new EmbeddedPostgres({
  databaseDir: path.join(apiDir, ".pgdata"),
  user: "life_mmp",
  password: "life_mmp_dev",
  port: 5432,
  persistent: true,
});

const dataDir = path.join(apiDir, ".pgdata");

async function main() {
  // initialise() runs initdb unconditionally and errors out if the target
  // directory isn't empty -- PG_VERSION is Postgres's own marker for "this
  // is already a valid cluster", so that's what actually makes this
  // "first run only" rather than the comment alone.
  if (!existsSync(path.join(dataDir, "PG_VERSION"))) {
    console.log("Initialising local Postgres cluster (first run only)...");
    await pg.initialise();
  }

  console.log("Starting Postgres on :5432...");
  await pg.start();

  await pg.createDatabase("life_mmp").catch(() => {
    // already exists -- fine
  });

  const client = pg.getPgClient();
  await client.connect();
  await client.query(`SELECT 1`); // sanity check
  const roleExists = await client.query(`SELECT 1 FROM pg_roles WHERE rolname = 'life_mmp_app'`);
  if (roleExists.rowCount === 0) {
    console.log("Creating restricted app role life_mmp_app...");
    await client.query(
      `CREATE ROLE life_mmp_app LOGIN PASSWORD 'life_mmp_app_dev' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS`,
    );
    await client.query(`GRANT CONNECT ON DATABASE life_mmp TO life_mmp_app`);
  }
  await client.end();

  console.log("Running Prisma migrations...");
  execSync("npx prisma migrate deploy", {
    cwd: apiDir,
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: "postgresql://life_mmp:life_mmp_dev@localhost:5432/life_mmp?schema=public",
    },
  });

  if (process.argv.includes("--seed")) {
    console.log("Seeding Platform Administrator...");
    execSync("npx ts-node --transpile-only prisma/seed.ts", {
      cwd: apiDir,
      stdio: "inherit",
      env: process.env,
    });
  }

  console.log("Postgres is up and stays running in this process (Ctrl+C stops it).");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
