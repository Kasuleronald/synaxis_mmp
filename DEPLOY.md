# Deploying to Webuzo (synaxis.scholarsas.com)

This is a step-by-step guide for taking this repo from GitHub to a running
app on your Webuzo server. Written so you (not Claude) can run it directly
over SSH.

**Repo:** https://github.com/Kasuleronald/synaxis_mmp
**Target:** `synaxis.scholarsas.com` → `/home/scholars/public_html/synaxis`
**SSH:** `ssh -i <your-key> scholars@nexus.crystalcloudhost.com`

## How the app is shaped for production

One Node.js process serves everything on one port:
- `/api/*` → the NestJS API
- everything else → the built React app (`apps/web/dist`), with `index.html`
  served as a fallback for client-side routes (`/members`, `/giving`, etc.)

This means Webuzo only needs **one** Node.js app configured, not two.

## Three environment quirks that cost real time to find — know these up front

1. **`registry.npmjs.org` is unreachable from this server** (times out on
   both IPv4 and IPv6 — looks like a firewall/security-policy block on
   Cloudflare's IP ranges specifically, not a real network problem).
   `npm install`/`npm ci` need `--registry=https://registry.npmmirror.com`
   (Alibaba's public mirror, confirmed reachable) every time. `binaries.
   prisma.sh` (Prisma's engine download host) is reachable directly, no
   mirror needed there.
2. **The disk quota is a tight 1 GiB for the entire hosting account** —
   files, databases, email, everything. A plain `npm install` for this repo
   lands around 900MB-950MB by itself, so there's very little headroom.
   Watch `quota -s` during install if you ever add heavier dependencies.
   Also: Prisma's `binaryTargets` in `schema.prisma` is just `["native"]` —
   confirmed this server needs `rhel-openssl-1.0.x` specifically (older
   than you'd guess for CloudLinux 8), so generating directly on the server
   (not guessing extra targets) avoids shipping wrong, wasted engine
   binaries.
3. **Webuzo's Node.js Selector does not inject its assigned port as an env
   var.** Whatever port it shows you (this app's is `30001`) has to be set
   literally as `PORT=30001` in `apps/api/.env` — the app won't pick it up
   automatically, and if something else is already bound to whatever `.env`
   says instead, the app fails to start with `EADDRINUSE`.

## Getting a real shell (if you don't have one yet)

Webuzo's own web UI (Git Version Control, File Manager, Node.js Selector)
turned out to be unreliable for a repo this size — its git-pull mechanism
choked on a large `node_modules`, and there's no way to run `npm install`/
`prisma migrate`/`npm run build` through those panels at all. **Ask your
hosting provider to enable SSH access** if you don't have it — it's the
only way this actually works smoothly. Once enabled:

1. Webuzo → **Security → SSH Access** → generate a key pair (RSA 2048,
   blank passphrase is fine for a deploy key). Click **Authorize** next to
   the public key — generating alone doesn't add it to `authorized_keys`.
2. Download the private key, keep it somewhere safe locally, `chmod 600` it.
3. Connect: `ssh -i <key-path> scholars@nexus.crystalcloudhost.com`.

## 1. Clone the repo

```
cd /home/scholars/public_html/synaxis   # should not already exist/be empty
git clone https://github.com/Kasuleronald/synaxis_mmp.git .
```

(If Webuzo's Git Version Control panel already created a repo entry here
and it's stuck/broken, delete the whole `synaxis_mmp` folder via File
Manager first, then clone fresh via SSH instead of using that panel again.)

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
"add user" form never does). **This matters beyond migrations too:**
`users` has `FORCE ROW LEVEL SECURITY` set, so *neither* `scholars_kasule`
nor `scholars_life_mmp_app` can bypass RLS just by being the table owner or
a "superuser-ish" role — the only bypass is the same `app.is_platform_admin`
session GUC the app itself sets via `runWithTenant` (`src/prisma/tenant.ts`).
The seed script (`apps/api/prisma/seed.ts`) does exactly this, connecting as
the restricted `RUNTIME_DATABASE_URL` role like the running app does.

Webuzo enforces an account-name prefix on whatever you type, so asking for
`life_mmp_app` came out as:
- Restricted runtime user: **`scholars_life_mmp_app`**, attached to
  `scholars_synaxis_mmp`.

Every migration's `GRANT ... TO ...` statements, `db/init/01-app-role.sql`,
and local dev's `scripts/dev-db.mjs` all already target this exact name —
if you ever recreate this user, it has to be called precisely
`scholars_life_mmp_app` or migrations will fail with "role does not exist".

## 3. Environment variables

`.env` is gitignored on purpose (it's not in the repo) — create it directly
on the server at `apps/api/.env` (`chmod 600` it):

```
DATABASE_URL="postgresql://scholars_kasule:<scholars_kasule-password>@localhost:5432/scholars_synaxis_mmp?schema=public"
RUNTIME_DATABASE_URL="postgresql://scholars_life_mmp_app:<scholars_life_mmp_app-password>@localhost:5432/scholars_synaxis_mmp?schema=public"

SESSION_SECRET="<a-long-random-string>"
PORT=30001
WEB_ORIGIN="https://synaxis.scholarsas.com"
NODE_ENV=production

GEMINI_API_KEY=""
GEMINI_MODEL=""

PLATFORM_ADMIN_EMAIL="<your-choice>"
PLATFORM_ADMIN_PASSWORD="<a-real-password>"
PLATFORM_ADMIN_NAME="Kasule Ronald"
```

**`PORT` must exactly match whatever Webuzo's Node.js Selector shows for
this app** (see quirk #3 above) — check the app's edit page if you're not
sure, don't assume it's still `30001`.

If you create this file with Windows line endings (CRLF), run
`sed -i 's/\r$//' apps/api/.env` once — Node/dotenv tolerate it fine, but
anything that reads it via a plain shell `source` won't.

## 4. Install, generate, build

```
cd /home/scholars/public_html/synaxis
npm install --registry=https://registry.npmmirror.com
npx prisma generate --schema apps/api/prisma/schema.prisma
npm run build
```

Watch `quota -s` during `npm install` if you're worried about space (see
quirk #2). `npm run build` compiles `packages/shared`, then `apps/api`,
then `apps/web` (see root `package.json`) — produces `apps/api/dist/main.js`
and `apps/web/dist/`.

## 5. Migrations and seeding: automatic, not a manual step

`apps/api/src/main.ts` runs `prisma migrate deploy` and the seed script
itself on every boot when `NODE_ENV=production`, before Nest starts. Both
are idempotent (migrate no-ops with nothing pending; seed no-ops if the
admin email already exists), so this is safe on every restart and needs no
separate manual command, ever.

## 6. Configure the Node.js app in Webuzo

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
active, which drives the Secure session cookie and the `ServeStaticModule`
SPA-serving logic — don't leave it on Development. Note the assigned Port
shown here and make sure `.env`'s `PORT` matches it exactly (quirk #3).

Start/restart from the panel's Start/Stop column whenever you need
migrations/seeding/code changes to take effect. If the app was already
running on the same port from a manual SSH test, kill that process first
or you'll hit `EADDRINUSE` (`ps aux | grep main.js`, then `kill -9 <pid>`).

## 7. SSL

Webuzo → **SSL → Automatic SSL** (or **Certificates → Install** if one
already exists for the subdomain) issues/activates a Let's Encrypt cert.
**Required before login works** — see the next section.

## 8. The trust-proxy fix — also required for login to work

Webuzo's reverse proxy (LiteSpeed) terminates TLS and forwards to the Node
process over **plain HTTP internally**. Without `app.set("trust proxy", 1)`
(already in `main.ts`), Express sees every request as insecure regardless
of what the browser actually connected over, so the `secure: true` session
cookie is silently never sent at all — not just missing the flag, no
`Set-Cookie` header whatsoever, even though the session gets created and
persisted to Postgres correctly. This one cost real time to track down
because everything else *looks* fine (login returns 200 with the right
user JSON) — the only visible symptom is every subsequent request coming
back "Not signed in" / 401, with no cookie in the request headers. If you
ever see that pattern again on a different reverse-proxy setup, this is the
first thing to check.

## 9. Verify

- `https://synaxis.scholarsas.com/api/health` → `{"ok":true,"service":"life-mmp-api"}`
- `https://synaxis.scholarsas.com/` → the login page
- Log in with the Platform Admin credentials from `.env`, confirm the
  Platform Administration screen loads, and that **Create Organization**
  actually succeeds (this is what exposed the trust-proxy bug — a plain
  page load can look fine while every API call underneath is failing).

## Ongoing deploys

```
ssh -i <key> scholars@nexus.crystalcloudhost.com
cd /home/scholars/public_html/synaxis
git pull origin master
npm install --registry=https://registry.npmmirror.com   # only if package-lock.json changed
npx prisma generate --schema apps/api/prisma/schema.prisma   # only if schema.prisma changed
npm run build
```

Then restart the Node.js app from Webuzo's panel (migrations/seeding
re-run automatically as part of boot).

## What's still local-only right now

- Your real member data (`members.xlsx`) never left your machine — it's
  gitignored, deliberately not part of this deploy. You'll import it
  through the Import Center once you're ready, the same way you did
  locally. Production has never had this data — nothing was lost by
  deploying without it.
- The embedded-postgres dev database (`apps/api/.pgdata`, `scripts/dev-db.mjs`)
  is a local-only convenience and plays no role here — production uses
  Webuzo's real Postgres instance from step 2.
