# Synaxis MMP — progress notes

This file tracks what's been built so far, written for you to skim when you're back. It's updated as work continues — check the "Last updated" line at the top.

**Last updated:** 2026-08-20, ~21:00 (pushed to GitHub, made the app production-ready for Webuzo -- see `DEPLOY.md`)

## Running it locally

Both servers need to be running. If they've stopped (e.g. machine restart):

```
cd apps/api && node scripts/dev-db.mjs      # starts embedded Postgres, stays running
cd apps/api && npm run build && node dist/main.js   # API on :3000
cd apps/web && npm run dev                  # web on :5173
```

**Important gotcha:** `scripts/dev-db.mjs` hosts the actual Postgres process — if you kill it, the database goes down (data persists on disk in `apps/api/.pgdata`, so restarting the script recovers it safely; this was hit and fixed once during this session, see Incidents below).

**Login credentials:**
- Platform Admin: `admin@lifemmp.local` / `LifeMmp!2026` (displays as "Kasule Ronald")
- Your org admin login: `balayobrianevans45@gmail.com` (password as you set it)

## Deploying

Code lives at `github.com/Kasuleronald/synaxis_mmp`. Full step-by-step for
getting it running on your Webuzo VPS at `synaxis.scholarsas.com` is in
**`DEPLOY.md`** — covers the Postgres setup (including the restricted RLS
role, not optional), `.env`, the build/migrate steps, wiring up Webuzo's
Node.js Selector, and turning on SSL (login won't work without it — session
cookies require HTTPS once `NODE_ENV=production`).

The app itself is now shaped for this: one Node process serves both the
built React app and the API (`/api/*`) on one port, so Webuzo only needs a
single Node.js app configured, not two.

## What's implemented

### Money & reporting (Sprint 5)
- **Giving**: categories + manual entry (cash/bank/mobile money/cheque), provider-agnostic ledger design so a future MTN MoMo/Airtel driver plugs in without a data model change.
- **Dashboard KPIs**: "This week's giving" tile wired to real data.
- **In-app notifications**: bell icon with unread badge, wired into deletion-approval and self-registration flows.

### Members
- Gender, address, nationality, birthday (month/day/year, year optional), marital status, student/school, leadership roles (Pastor/Directorate/Department/Fellowship/Branch leader — multi-select).
- **Auto-allocated member numbers** (`#0001`, `#0002`...), race-safe via an atomic counter on the org.
- **Spouse linking**: marking someone married and linking an existing member auto-creates/joins a household with correct HEAD/SPOUSE roles.
- Household/Fellowship/Discipleship-class pickers right in the add-member form.
- "Added by" tracking (who created each record).
- Full **table redesign**: Columns customization (persisted per-user), status/joined-date filters, inline edit/delete icons, Export/Import/Registrations toolbar links.
- Phone fields prefill the org's country dial code everywhere (add, edit, registration form) instead of losing it.

### Households / Fellowships / Departments
- All three now have **edit and delete-request icons** — deletion routes through the same maker-checker approval as members (nothing is removed until a second appointed approver confirms).
- A confirm-with-preview step before creating anything, showing exactly what will be saved.
- Households: pick a head from the member list; address auto-fills from the head's own profile (editable).
- Fellowships: pick a leader restricted to members tagged "Fellowship leader"; added a meeting-time field.

### Self-registration
- Public link (`/register/:slug`, copyable from the Registrations page) where visitors fill the same fields as the admin's Add Member form, minus admin-only assignments (status/household/fellowship/class/leadership).
- Submissions notify appointed registration approvers (bell); nothing becomes a real member until approved.
- Admin can click a pending registrant's name to view full details before deciding — approve/reject from there or from the row.
- Phone field prefills the org's dial code with a greyed example so people don't double up the leading 0.

### Custom terminology
- Settings → Terminology: rename "Fellowship"/"Household"/"Department"/"Member" to whatever your church actually calls them (e.g. "Cell Group"). Updates the sidebar and page titles everywhere those nouns appear.

### Platform Admin / security
- **Fixed a real gap**: Platform Admin could previously reach tenant pages (Members, Settings, etc.) via direct URL — RLS blocked writes but nothing stopped navigation or reads of the page shell. Added a route guard and stripped tenant nav from their sidebar entirely.
- **Org suspension**: Platform Admin can suspend/reactivate a church; a suspended org's users get a clear error at login ("Your organisation is suspended, contact your administrator").
- **Platform Admin page redesign**: create-organization form is now a modal (was always visible before), organization list rows open a view/edit dialog.
- **Password reset**: no email sending exists yet, so Platform Admin generates a reset link from an org's dialog and relays it manually (phone/WhatsApp/in person) — the link itself is a real working `/reset-password/:token` page.
- **Password visibility toggle** (eye icon) on login and the reset-password page.

### Fixed Asset Register (Operations → Fixed Assets)
- A real register for land, buildings, equipment, vehicles: acquisition cost, an optional annual depreciation rate (%), acquisition date, and condition at acquisition. **Current value is computed on every read** (straight-line depreciation from cost/rate/date), never stored, so it's never stale.
- **"Ask for state"**: the Sen Pastor/Admin can ask about any asset; the branch (or all Org Admins, if the asset isn't tied to one branch) gets notified and responds with a description and photos (reusing the same image-optimization path as Church Assets below).
- **Editing an asset requires approval**: a change (name, cost, category, condition, etc.) doesn't apply immediately — it's proposed as an edit request, and a different appointed approver (or Org Admin — never the person who proposed it) has to confirm before it takes effect. Same maker-checker pattern as member/household/fellowship deletion, just applied to edits on this one register.
- Both "Add asset" and "Request an edit" show a confirm-with-preview dialog before anything is saved/proposed; pressing Enter while filling either form no longer submits it early.

### Finance (expanded)
The old single "Giving" page is now a full Finance section:
- **Funds** — designated pools (Building Fund, Missions Fund) separate from Category (what kind of income) and orthogonal to it — a gift can be both "Tithe" and earmarked to a fund.
- **Pledges** — a member's commitment to give a total over time; fulfilled amount is *calculated* from their actual recorded giving, never entered by hand.
- **Giving batches** — group a collection (a Sunday service) and reconcile the declared total against what was actually recorded against it; variance shown live.
- **Financial Settings** — Categories are now hierarchical (add subcategories, rename, remove — matching the tree UI you showed) and a "Payees and Vendors" tab for your church's own payees.
- **Accounting** — a simple chronological register of everything in Giving, filterable by date, with a running total. This is deliberately **not** full double-entry bookkeeping (no chart of accounts, no journal entries) — export from here into real accounting software if you need that; flagging so this isn't mistaken for more than it is.

### Fellowship (cell) leader reports (Ministry → Fellowship reports)
- A leader logs their meeting: attendance headcount (plus, optionally, exactly which of the fellowship's own members were there), giving collected, and expenses — with a note on what the expenses were for.
- **The giving side never touches the ledger on submission.** It sits pending until an Org Admin or Finance Officer reviews it, confirms a giving category (and optionally a fund/method), and approves — only then does a real Giving record get created. Expenses are recorded for visibility only (no expense ledger exists to post into).
- A leader can't approve their own report even if they also happen to hold an approving role.
- Feeds the new "Fellowship leaders" report (below) — submission volume, average attendance, and how much of a leader's reported giving actually held up under review.

### Reports (broad, cross-system)
A real Reports section replacing the old "Analytics" placeholder, six tabs:
- **Members & attendance** — new members per month with a running cumulative total, attendance check-ins per month, and demographic breakdowns (status, gender, marital status, age group).
- **Giving** — monthly giving trend, totals by category, totals by fund.
- **Statements** — pick a member for their full running giving statement (date, category, amount, running balance), or pick a fund for the same against everything given toward it. This is the "running statements" view.
- **Pledges** — fulfillment bars (fulfilled vs. pledged) for every pledge on file.
- **Fixed assets** — current value by category, condition breakdown across every branch.
- **Fellowship leaders** — per leader: reports submitted, approved/rejected counts, average attendance, giving actually approved.

No charting library was added — bars are plain styled divs, dependency-free and consistent with the rest of the UI.

### Communications (Announcements)
- Org Admin can compose a message and broadcast it in-app to everyone with a login, or narrow it to one role (e.g. all Fellowship Leaders) or one branch.
- **Important scope note**: this reaches *logged-in staff Users only* — Pastors, Department Heads, Fellowship Leaders, Finance Officers, Volunteers with accounts. It cannot reach the congregation (Members) directly, since no SMS/WhatsApp/email provider is connected — same limitation as self-registration notifications, see below.
- A sent-log shows every past broadcast: message, audience, recipient count, sender, date.

### Profile photos
- Any logged-in org member can click their circular avatar (top-right of the header, shows initials until a photo is set) to change or remove their own photo. Uploads go through the same client-side optimize-before-upload path as Church Assets (resized to a smaller 512px max here, since it's just an avatar). Platform Admin doesn't get one, since that account isn't tied to an organization the way the photo storage is scoped.

### Dashboard rewrite
- **"This week's giving" moved into the main tile row** — but only for Org Admins and Finance Officers; other roles simply don't see it, rather than seeing a tile they can't act on.
- Two new tiles: **birthdays in the next 30 days** and **new members added in the last 30 days**, both visible to everyone, with detail lists underneath (names + dates, next to Upcoming events).
- **Two pie charts** (Gender, Marital status) in the lower-right — plain CSS conic-gradients, no charting library added, consistent with the Reports section's dependency-free bars.
- **Automatic birthday reminder**: a background check (every 12h, no new dependency — a plain interval timer with a same-day dedupe guard rather than pulling in a cron library for one job) notifies every Org Admin when a member's birthday is exactly 5 days away.

### Ideas ported in from "My Church MVP" (your earlier project)
You asked me to review your older `My Church MVP` project and bring over what's worth reusing. Here's what came over, one by one:

- **Partners** (Finance → Partners) — external givers (people, organizations, sister churches) who give financially without being a Member here, tracked separately with their own giving/pledge history. Giving records and Pledges can now point to either a Member or a Partner (never both).
- **Fund requisitions → accountability** (Finance → Requisitions) — a genuinely different shape than a plain expense entry: a leader asks for funds for a stated reason, finance approves or rejects, and only afterward does the leader file a separate accountability report (what it was actually spent on, with receipt photos) that finance reviews again. Neither the requester nor a leader can approve their own submission at either stage.
- **Testimonies** (Communications → Testimonies) — anyone with a login posts a categorized testimony (Salvation, Healing, Financial breakthrough, Employment, Restoration, Spiritual growth, Academic, Other); everyone reads the feed; only an Org Admin can remove one (no editing).
- **Post-event debriefs** (Events page) — once an event's start time has passed, whoever manages it can file venue/actual attendance/ministers/strengths/challenges/recommendations; this notifies Org Admins and Department Heads, not just the event's creator.
- **Pledge lifecycle** (Finance → Pledges) — a pledge now carries a status (Active/Fulfilled/Archived). A background check (same interval-timer approach as birthday reminders, no new dependency) automatically marks a pledge Fulfilled once the derived total meets it, or Archived 30 days past its end date if it never did. An archived pledge can be reactivated with a new end date.
- **Fund progress bars & deadlines** (Finance → Funds) — a Fund with a target amount now shows a live progress bar (raised vs. target, computed from actual giving) and can carry an optional deadline, covering the old project's "Fundraising Projects" idea without a second parallel model.
- **Additive "can lead a cell" grant** (Org Admin → Staff) — mirrors how `isDeletionApprover`/`isRegistrationApprover` already worked: an Org Admin can hand fellowship-report-submission rights to a User whose base role isn't Fellowship Leader (say, a Department Head who also runs a cell group) without changing their role.
- **Command palette (Ctrl/Cmd+K)** — jump straight to any Member, Fellowship, Discipleship class, or Event by typing part of its name, from anywhere in the app.
- **Second-currency display toggle** (Settings) — optionally show finance screens in a second currency alongside your main one, using a rate you set. Display-only and explicitly **not historical-rate-aware** (a gift recorded a year ago redisplays at today's rate) — the old project made the same accepted tradeoff, documented here rather than silently copied.
- **Branded PDF exports** — every PDF export (starting with the Members export) now shows your church's logo top-left next to the church name, and a footer reading "Extracted from Synaxis - Ministry Management Platform" on every page. `addBrandedHeader`/`addBrandedFooter` in `lib/export.ts` are the reusable pieces for any future export.
- **Cross-fellowship report search** (Fellowship reports page, finance/admin only) — every report now gets a human-typeable reference number (e.g. `20082026-1`, date + same-day sequence) so a paper receipt can be matched back to the system record, and a "Find a report" search box looks it up across every fellowship by ref, date range, fellowship, or review status.
- **Duplicate-collision guard on Member creation** — adding a member whose name matches an existing one shows a non-blocking nudge ("Already added? A member named 'X' already exists — go back, or continue if this is a different person") rather than either silently allowing it or blocking it outright. This is deliberately lighter than the maker-checker deletion-approval flow — it's a nudge against accidental double-entry, not a workflow.
- **Sliding session timeout** — sessions now extend on activity (`rolling: true`) instead of expiring exactly 7 days after login regardless of use, so an actively-working user is never logged out mid-task.

**Two things from that project were checked and found already solid here, so nothing needed to change:**
- Its "non-owner DB role so RLS actually binds" pattern — Synaxis MMP already runs as a dedicated `life_mmp_app` role (`NOSUPERUSER NOBYPASSRLS`), separate from the migration-owner role, with `FORCE ROW LEVEL SECURITY` on every ministry table on top of that.
- Its "side-table to resolve org before login" pattern — Synaxis MMP solves the same problem differently: the platform-admin RLS bypass GUC is used for the one exact-email-match lookup at login time, which already lets an org-agnostic login work without a parallel table.

**Deliberately not carried over** (the old project's own docs flagged these as accepted shortcuts, not best practices — see the security review that surfaced them): global cross-org email uniqueness for login, money stored as plain integers with no decimal/minor-unit handling, and a half-finished local-first-to-real-backend migration architecture. None of these are patterns worth having in a system meant to scale to many churches.

**Not ported over** (already existed here under a different name): multi-branch/campus support — Synaxis MMP already has `Branch` as a first-class entity with per-branch scoping across Members, Giving, Fixed Assets, and more, so there was nothing to add.

### Sidebar nav polish
- Every nav group now has a small icon on the left (People, Ministry, Discipleship, Finance, Operations, Communications, Reports, Setup); the expand/collapse chevron moved to the right edge of the sidebar, matching how the icon-left/chevron-right layout was requested.

### Church Assets
- New "Assets" area (sidebar → Operations) for photos, flyers, documents.
- Images are **automatically resized and recompressed in the browser** (max 1920px, JPEG ~82% quality) before upload — no server-side image library needed, keeps the library fast.
- Stored as bytes directly in Postgres (same pattern the church logo already used) since there's no object storage (S3/OCI) configured yet — see "Known limitations" below.

### Sidebar / UI polish
- Bottom-darkening gradient (theme-independent), inset separator lines between nav groups.
- **Mobile**: proper off-canvas drawer with hamburger toggle (was just hidden with no way to open before).
- Fixed a layout bug where the whole page — sidebar included — scrolled together instead of only the main content area.

### Branding
- Renamed "Life MMP" → "Synaxis MMP" across all visible UI (browser tab, login, sidebar, exports). Left untouched: the npm package name (`@life-mmp/shared`), the project folder name, and the original blueprint doc — those are structural/historical, not user-facing.

## Known limitations / things that need you

- **Hosting**: the plan settled on Webuzo (not Oracle Cloud) for `synaxis.scholarsas.com` — see `DEPLOY.md` for the full step-by-step. The repo is now on GitHub (`github.com/Kasuleronald/synaxis_mmp`) and the app is production-ready (built React app + API served from one Node process, `/api` prefix consistent in both dev and prod) — the remaining steps (Postgres setup, `.env`, SSL) need your hands on the actual Webuzo panel, which I don't have access to.
- **No email sending yet**: password reset and self-registration notifications rely on in-app links/bell, not actual emails. Would need an email provider (SendGrid, SES, etc.) and credentials from you. This is the same reason Communications/Announcements can only reach staff with a login, not the wider congregation.
- **Accounting is a simple register, not double-entry bookkeeping** — a deliberate scope choice (see Finance section above), not an oversight.
- **Assets stored in Postgres, not object storage**: fine for now, but should move to real file storage (S3-compatible or OCI Object Storage) before this scales to many large files — flagging so it doesn't get forgotten.
- **Gemini AI extraction**: your API key is live and working, but by design it only kicks in for PDFs or spreadsheets with messy/unrecognized headers — clean spreadsheets (like your `members.xlsx`) are handled by the deterministic column-matcher and never touch the AI. You confirmed this is the behavior you want.

## Incidents during this session (all resolved, no data lost)

1. **Killed the dev database by accident** while clearing out a stray `nest start --watch` process that had been holding a Prisma file lock. The embedded Postgres runs *inside* `scripts/dev-db.mjs` — killing that process stops the database. Recovered cleanly (Postgres does automatic crash recovery on restart); fixed a latent bug in the script itself (`initialise()` was being called unconditionally, which fails on a second run) so this won't happen again.
2. **A `.env` mismatch**: at one point `apps/api/.env` had aspirational `admin@synaxismmp.local` credentials that were never actually applied to the database (the seed script only runs once). Reverted `.env` to match what's actually live: `admin@lifemmp.local` / `LifeMmp!2026`.

Verified real data throughout — your actual members (Kasule Ronald, Grace Adong, Joshua Kalyebi), the household you set up, and Mugarura Benjamin's pending self-registration are all untouched. Only data I created for testing was cleaned up after each verification pass.

## Sprint 6 — security/isolation testing (done)

Ran a real cross-tenant isolation test: Platform Admin created a second throwaway org, that org's admin created a member, a giving category + record, a household, a fellowship, and a public self-registration. Then checked, as your real org (Evans's login):

- None of the second org's records appeared in any list (members, giving categories, households, fellowships, registrations, notifications).
- Directly requesting the other org's member by ID returned nothing, not even a permission-denied leak.
- Platform Admin's own `/members` call also came back empty — confirming the "no default access to tenant data" bypass really is scoped to identity tables only (organizations/branches/users), never ministry data, exactly as the blueprint requires.

All checks passed. The throwaway org was suspended then fully deleted (cascade) afterward — nothing left behind. Verified your real data (3 members, the Mugarura household, Mugarura Benjamin's still-pending registration, all 3 real user accounts) is untouched.

## Final smoke test

Loaded all 17 pages from the original session (Dashboard, Members, Households, Follow-up, Import Center, Registrations, Events, Fellowships, Departments, Discipleship Programs/Classes, Giving, Attendance, Assets, Deletion requests, Org Admin, Settings) as your real login — no console errors, no blank pages.

**Re-run after this round of work** across all 25 pages, including everything new (Fellowship reports, Funds, Pledges, Batches, Accounting, Financial Settings, Fixed Assets, Announcements, Reports): all 25 rendered cleanly, zero console errors, zero blank pages.

Every new feature (Fixed Asset edit-requests, Funds/Vendors/Pledges/Batches CRUD, Fellowship report submission + finance approval, Announcement broadcast) was also exercised end-to-end with real API calls before being marked done — created, verified the expected result (including the self-approval block, the computed running balances, and the depreciation/reconciliation math), then cleaned up via targeted deletes so none of it lingers as fake data in your real org. Your actual records (3 members, the Mugarura household, the real Fixed Asset you added, the real Tithe/Offertory giving categories) were left untouched throughout — confirmed by re-checking counts before and after each cleanup.

## Still queued / worth considering next

- General bug sweep of older pages (Attendance, Discipleship, Import Center) — still not touched or re-verified beyond the smoke test.
- Funds, Vendors, Partners, and Giving Categories currently only support deactivate (soft-delete), not the maker-checker deletion-request flow the People-side entities use — worth deciding if financial taxonomy needs that same approval gate.
- Pledges have no edit UI yet (create + list + reactivate-when-archived only) — worth adding if a pledge amount or fund needs correcting after the fact.
- Communications can only reach people with a login (staff/leaders) — reaching the congregation directly still needs an SMS/WhatsApp/email provider and credentials from you.
- The Reports section's "Statements" and "Fellowship leaders" views are read-only aggregates — there's no export-to-PDF/CSV yet if you need to hand a printed statement to someone (the branded PDF pattern from Members export could extend here).
- The "Registrations" self-registration flow still only captures the fields matching Add Member minus admin-only fields — worth a look to confirm nothing else should be on that public form.
- The "unified export picker" idea (CSV/Excel/PDF everywhere, driven by visible columns) only exists on the Members page so far — worth rolling out to other list screens if you find yourself wanting it elsewhere.
- Fund requisitions currently support one department OR one fellowship as context, not both, and there's no dedicated "my requisitions" filter view yet beyond the shared list.
