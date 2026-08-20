# Deploying to Webuzo (synaxis.scholarsas.com)

This is a step-by-step guide for taking this repo from GitHub to a running
app on your Webuzo VPS. Written so you (not Claude) can run it directly in
the Webuzo panel/terminal.

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

## 1. Clone the repo onto the server

In Webuzo's Git Version Control feature (or via SSH if you have it), clone
into the subdomain's document root:

```
git clone https://github.com/Kasuleronald/synaxis_mmp.git /home/scholars/public_html/synaxis
```

(Use the SSH URL `git@github.com:Kasuleronald/synaxis_mmp.git` instead if
you've added a deploy key — either works, this is a public clone URL, no
credentials needed to *read* the repo.)

## 2. Create the Postgres database

Using Webuzo's PostgreSQL Manager, create a database (e.g. `synaxis_mmp`)
and a primary user with full rights on it — this becomes your
`DATABASE_URL`. Note the host/port Webuzo gives you (often `localhost:5432`
if Postgres runs on the same VPS).

### Create the restricted runtime role

This is the important part, not optional: the app's row-level security
(every church's data walled off from every other church) only actually
holds if the app connects as a role that **cannot bypass RLS**. Connect via
Webuzo's SQL tool (or `psql` if you have terminal access) as the primary
user and run:

```sql
CREATE ROLE life_mmp_app LOGIN PASSWORD 'pick-a-real-password-here'
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
GRANT CONNECT ON DATABASE synaxis_mmp TO life_mmp_app;
```

Every migration in this repo already contains `GRANT ... TO life_mmp_app`
statements for its own tables (that's a hardcoded role name, so keep it as
`life_mmp_app` exactly) — once you run the migrations in step 4, this role
will have exactly the table-level permissions it needs, no more.

## 3. Set up environment variables

`.env` is gitignored on purpose (it's not in the repo you cloned) — create
it directly on the server at `apps/api/.env`:

```
# Superuser/owner connection -- used only by `prisma migrate`/`prisma generate`.
DATABASE_URL="postgresql://<primary-user>:<primary-password>@localhost:5432/synaxis_mmp?schema=public"

# Restricted connection the running app actually uses (step 2 above).
RUNTIME_DATABASE_URL="postgresql://life_mmp_app:<the-password-you-set>@localhost:5432/synaxis_mmp?schema=public"

SESSION_SECRET="<a-long-random-string-you-generate>"
PORT=3000
WEB_ORIGIN="https://synaxis.scholarsas.com"
NODE_ENV=production

# Leave blank if you don't have one yet -- only used for Import Center's
# AI-assisted extraction on messy PDFs/spreadsheets, never for normal use.
GEMINI_API_KEY=""
GEMINI_MODEL=""

# Bootstrap Platform Administrator -- only read once, by `npm run seed` (step 6).
PLATFORM_ADMIN_EMAIL="admin@lifemmp.local"
PLATFORM_ADMIN_PASSWORD="<pick-a-real-password>"
PLATFORM_ADMIN_NAME="Kasule Ronald"
```

Generate a real `SESSION_SECRET` with, e.g., `openssl rand -base64 48` --
don't leave it as a placeholder.

## 4. Install, migrate, build

From `/home/scholars/public_html/synaxis` (the repo root -- this is an npm
workspace, so `npm install` has to run here, not inside `apps/api`):

```
npm install
npx prisma migrate deploy --schema apps/api/prisma/schema.prisma
npx prisma generate --schema apps/api/prisma/schema.prisma
npm run build
```

`npm run build` builds `packages/shared`, then `apps/api`, then
`apps/web` in that order (see the root `package.json`) -- this produces
`apps/api/dist/main.js` (the entry point) and `apps/web/dist/` (the static
SPA the API serves in production).

If Webuzo's Node.js Selector only gives you an "npm install" button with no
way to run the other three commands, you'll need terminal/SSH access once
to run them manually. After that, only a fresh `npm install`/rebuild is
needed when you actually change dependencies or code.

## 5. Seed the Platform Administrator

One-time, after step 4:

```
npm run seed --workspace apps/api
```

This creates the login from `PLATFORM_ADMIN_EMAIL`/`PASSWORD`/`NAME` in
your `.env`. Safe to re-run -- it no-ops if that email already exists.

## 6. Configure the Node.js app in Webuzo

In Webuzo's Node.js Selector (Application Manager):
- **Application root:** `public_html/synaxis`
- **Application URL:** `synaxis.scholarsas.com`
- **Application startup file:** `apps/api/dist/main.js`
- **Node.js version:** 20.x (what this was built/tested against)
- **Environment variables:** if the panel has its own env-var UI, you can
  set them there instead of (or in addition to) the `.env` file -- either
  works, since the app reads `process.env` either way.

Start (or restart) the app from the panel.

## 7. Turn on SSL

Issue a certificate for `synaxis.scholarsas.com` (Webuzo's AutoSSL /
Let's Encrypt integration, usually one click) **before** trying to log in
for real -- see the "Critical" note above. Once SSL is active, switch the
subdomain from HTTP to HTTPS if Webuzo has a separate toggle for that, and
double check `WEB_ORIGIN` in `.env` is the `https://` URL.

## 8. Verify

- `https://synaxis.scholarsas.com/api/health` → `{"ok":true,"service":"life-mmp-api"}`
- `https://synaxis.scholarsas.com/` → the login page
- Log in with the Platform Admin credentials from step 5, confirm the
  Platform Administration screen loads, then create your church
  organization from there the same way you did locally.

## Ongoing deploys (after this first one)

1. `git pull` in the app directory (or use Webuzo's Git deploy button).
2. `npm install` (only if `package-lock.json` changed).
3. `npx prisma migrate deploy --schema apps/api/prisma/schema.prisma` (only
   if there are new migrations -- check `apps/api/prisma/migrations/` for
   anything newer than your last deploy).
4. `npm run build`.
5. Restart the Node.js app from Webuzo's panel.

## What's still local-only right now

- Your real member data (`members.xlsx`) never left your machine -- it's
  gitignored, deliberately not part of this deploy. You'll re-import it
  through the Import Center once the live site is up, the same way you did
  locally.
- The embedded-postgres dev database (`apps/api/.pgdata`, `scripts/dev-db.mjs`)
  is a local-only convenience and plays no role here -- production uses
  Webuzo's real Postgres instance from step 2.
