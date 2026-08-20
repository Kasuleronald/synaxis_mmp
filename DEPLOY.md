# Deploying to Webuzo (synaxis.scholarsas.com)

This is a step-by-step guide for taking this repo from GitHub to a running
app on your Webuzo panel. Written so you (not Claude) can run it directly.

**Repo:** https://github.com/Kasuleronald/synaxis_mmp
**Target:** `synaxis.scholarsas.com` → `/home/scholars/public_html/synaxis`

## How the app is shaped for production

One Node.js process serves everything on one port:
- `/api/*` → the NestJS API
- everything else → the built React app (`apps/web/dist`), with `index.html`
  served as a fallback for client-side routes (`/members`, `/giving`, etc.)

This means Webuzo only needs **one** Node.js app configured, not two.

**Critical:** session cookies are marked `Secure` when `NODE_ENV=production`,
which means login will silently fail (cookie never gets stored) until the
subdomain has a real SSL certificate active. Issue that first, or right
after — don't be surprised if login doesn't work before HTTPS is live.

## Why this whole doc is shaped the way it is: no shell, ever

Webuzo's panel here has no terminal, no SSH, and no SQL console — confirmed
directly, dashboard-icon by dashboard-icon. That rules out running
`npm install`, `npx prisma migrate deploy`, `npm run build`, or the seed
script by hand, which is how a deploy like this would normally go. Three
things solve that, together:

1. **The build happens on GitHub, not on the server.** A GitHub Actions
   workflow (`.github/workflows/build-deploy.yml`) runs on every push to
   `master`: installs dependencies, generates the Prisma client (targeting
   both this server's OS and your local one — see `binaryTargets` in
   `schema.prisma`), and compiles all three workspaces on a real Linux
   runner matching the server's OS. It then force-pushes the result —
   including `node_modules` and every `dist/` folder, which stay gitignored
   on `master` — to a separate **`deploy`** branch.
2. **Webuzo's Git Version Control tracks `deploy`, not `master`** (set this
   up below), so "Update From Remote" + "Deploy HEAD Commit" pull code
   that's already fully built. No install/build step runs on the server at
   all.
3. **Migrations and seeding happen automatically when the app itself
   starts** (`apps/api/src/main.ts`, guarded by `NODE_ENV=production`) —
   both `prisma migrate deploy` and the seed script are idempotent, so
   running them again on every restart is harmless and just costs a couple
   of seconds.

The only manual step that's left, ever, is clicking **Restart** on the
Node.js app after a deploy that changed dependencies, schema, or code.

## 1. Deploy the repo via Webuzo's Git Version Control

Webuzo's Git feature works in two steps, not one plain `git clone`:

1. **Create the repo entry** pointing at
   `https://github.com/Kasuleronald/synaxis_mmp`, with the **branch set to
   `deploy`** (not `master`) — Webuzo clones it into its own internal path
   (`/home/scholars/git/synaxis_mmp`), separate from the live site.
2. **Deploy** — a `.deploy.json` at the repo root (already committed) tells
   Webuzo's "Deploy HEAD Commit" button what to copy from that internal
   clone into `/home/scholars/public_html/synaxis` (the subdomain's actual
   document root):
   ```json
   {
     "DEPLOYPATH": "/home/scholars/public_html/synaxis/",
     "task": ["apps", "packages", "node_modules", "package.json", "package-lock.json"]
   }
   ```

Each time you want to pick up new commits: push to `master` on GitHub (this
triggers the Actions build → updates `deploy`), wait for the Action to
finish (check the repo's **Actions** tab — green check when done), then in
Webuzo click **"Update From Remote"** followed by **"Deploy HEAD Commit"**.
If the deploy changed dependencies or schema, restart the Node.js app
afterward (migrations/seeding re-run automatically on that restart).

## 2. Create the Postgres database (done)

Created via Webuzo's PostgreSQL Manager:
- Database: `scholars_synaxis_mmp`
- Primary/owner user: `scholars_kasule` — this is your `DATABASE_URL`
  connection, used only for running migrations.

### The restricted runtime role (done)

Webuzo has no SQL console for Postgres, so this was done through the
panel's plain "Add Database User" + "Add User To Database" forms instead of
raw SQL — which works fine here, since a role created that way is
non-superuser and non-bypass-RLS by Postgres's own defaults (those
attributes only exist if something explicitly grants them, which a plain
"add user" form never does). That's really the only thing that actually
matters for row-level security to hold; which tables the panel's UI
happened to grant it access to doesn't affect RLS enforcement either way.

Webuzo enforces an account-name prefix on whatever you type, so asking for
`life_mmp_app` came out as:
- Restricted runtime user: **`scholars_life_mmp_app`**, attached to
  `scholars_synaxis_mmp`.

Every migration's `GRANT ... TO ...` statements, `db/init/01-app-role.sql`,
and local dev's `scripts/dev-db.mjs` all already target this exact name —
if you ever recreate this user, it has to be called precisely
`scholars_life_mmp_app` or migrations will fail with "role does not exist".

## 3. Environment variables (done)

`.env` is gitignored on purpose (it's not in the repo) — it lives directly
on the server at `apps/api/.env`, already saved. Template, for reference:

```
# Superuser/owner connection -- used only by `prisma migrate`/`prisma generate`.
DATABASE_URL="postgresql://scholars_kasule:<scholars_kasule-password>@localhost:5432/scholars_synaxis_mmp?schema=public"

# Restricted connection the running app actually uses.
RUNTIME_DATABASE_URL="postgresql://scholars_life_mmp_app:<scholars_life_mmp_app-password>@localhost:5432/scholars_synaxis_mmp?schema=public"

SESSION_SECRET="<a-long-random-string>"
PORT=3000
WEB_ORIGIN="https://synaxis.scholarsas.com"
NODE_ENV=production

GEMINI_API_KEY=""
GEMINI_MODEL=""

PLATFORM_ADMIN_EMAIL="admin@lifemmp.local"
PLATFORM_ADMIN_PASSWORD="<a-real-password>"
PLATFORM_ADMIN_NAME="Kasule Ronald"
```

Note on `PORT`: Webuzo's Node.js Selector assigns its own port (the app
shows `30001`) and sets that as an environment variable before starting the
process. Since that's already set in `process.env` by the time `.env` is
read, the app correctly uses Webuzo's `30001` regardless of what `PORT` says
in `.env` — you don't need to change it.

`.env` loads from `apps/api/.env` regardless of the server's working
directory (`app.module.ts` passes an explicit `envFilePath`), so it doesn't
matter that Webuzo starts the app from the repo root rather than from
inside `apps/api`.

## 4. Configure the Node.js app in Webuzo (done)

Webuzo's Node.js Selector (Applications → node → "Self Managed"):

| Field | Value |
|---|---|
| Application Name | `synaxis-mmp` |
| Deployment Domain | `synaxis.scholarsas.com` |
| Base Application URL | `/` |
| Application Path | `public_html/synaxis` |
| Application type | Node.js 22 |
| Application startup file | `apps/api/dist/main.js` |
| Deployment Environment | **Production** |
| Start Command | `node apps/api/dist/main.js` |
| Stop Command | `pkill -f "apps/api/dist/main.js"` |

Deployment Environment = Production is what makes `NODE_ENV=production`
active, which in turn drives the Secure session cookie and the
`ServeStaticModule` SPA-serving logic — don't leave it on Development.

Start/restart the app from the panel's Start/Stop column whenever you need
migrations/seeding/code changes to take effect.

## 5. Turn on SSL

Issue a certificate for `synaxis.scholarsas.com` (Webuzo's AutoSSL /
Let's Encrypt integration, usually one click) **before** trying to log in
for real — see the "Critical" note above. Once SSL is active, switch the
subdomain from HTTP to HTTPS if Webuzo has a separate toggle for that, and
double check `WEB_ORIGIN` in `.env` is the `https://` URL.

## 6. Verify

- `https://synaxis.scholarsas.com/api/health` → `{"ok":true,"service":"life-mmp-api"}`
- `https://synaxis.scholarsas.com/` → the login page
- Log in with the Platform Admin credentials from `.env`, confirm the
  Platform Administration screen loads, then create your church
  organization from there the same way you did locally.
- If something's wrong, Webuzo's Server Utilities → Error Log (or the
  Node.js app's own log, if the panel exposes one) is the only way to see
  what happened, since there's no terminal to run anything interactively.

## Ongoing deploys (after this first one)

1. Push to `master` on GitHub as normal.
2. Wait for the **Build deploy branch** GitHub Action to finish (repo's
   **Actions** tab) — it updates the `deploy` branch automatically.
3. In Webuzo's Git Version Control: **Update From Remote**, then **Deploy
   HEAD Commit**.
4. Restart the Node.js app from Webuzo's panel — this re-runs migrations
   and seeding automatically as part of boot, and picks up any code or
   dependency changes.

## What's still local-only right now

- Your real member data (`members.xlsx`) never left your machine — it's
  gitignored, deliberately not part of this deploy. You'll re-import it
  through the Import Center once the live site is up, the same way you did
  locally.
- The embedded-postgres dev database (`apps/api/.pgdata`, `scripts/dev-db.mjs`)
  is a local-only convenience and plays no role here — production uses
  Webuzo's real Postgres instance from step 2.
