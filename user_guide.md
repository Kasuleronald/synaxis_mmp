# Synaxis MMP — User Guide

*A living document, kept in sync with the app as features change. Covers everything an Org Admin and every other church-side role sees — Platform Administrator isn't covered here, since that role only ever gets the one "create/suspend a church" screen. Once this settles, we'll turn it into a polished PDF with screenshots.*

## Getting started

Everyone signs in at the same login page with the email and password their Org Admin set up for them (or, for a brand-new church, the Platform Administrator). There's no separate login per role — you land on the right dashboard automatically.

Change your own password any time from the profile menu (top right) — "Change password" asks for your current one plus a new one. A brand-new account (a staff invite, or a new church's first Org Admin) is given a temporary password by whoever created it, but the very first login forces you to set your own before anything else in the app opens up. If you forget your password entirely, ask your Org Admin (or, if you are the Org Admin, ask the Platform Administrator) to send you a reset link — it goes straight to your own email, never shown to the person who triggered it.

**Roles**, broadly: Org Admin (sees everything), Finance Officer (finance + reports), Department Head, Fellowship Leader, Volunteer, and Member. On top of a role, an Org Admin can hand out extra permissions to specific people regardless of their role — approving deletions, approving self-registrations, leading a cell, being a Pastor for report purposes, heading the Fellowships department, or editing the Daily Devotional. These are all set from **Setup → Organization Admin → Staff & roles**.

---

## People

### Members
The list of everyone connected to your church. A visitor and a full member are the same record at different stages — someone becomes a member by changing their **status**, not by moving to a different screen. Add a member with name, phone, and address required at minimum; everything else (gender, birthday, marital/working status, nationality, leadership roles, household, fellowship) is optional. Search by name or phone, filter by status or joined date, click any column header to sort by it, customize which columns show on screen (gender, email, address, nationality, birthday, marital/working status, student, joined date — off by default, turn on what you need from the Columns menu), and export the list to Excel or PDF — the export always includes every field regardless of which columns you currently have showing on screen.

### Households
Group members who live together — a household has a head and any number of other members with a role (spouse, child, dependent). Address auto-fills from the head's own profile. Check "Couples only" to see just the households with both a head and a linked spouse.

### Follow-up
Log a note (with an outcome once it's resolved) against any member, and assign someone to follow up with them. Some follow-ups appear here on their own — repeat absenteeism and a walk-in's 3rd visit (see Attendance) file one automatically, assigned to whichever "default follow-up user" (Staff & roles) currently has the fewest pending.

### Soul Winning
Track a person won in evangelism through to full integration: **Won → Attending church programs → Being visited → Allocated to a fellowship/cell → Enrolled in a new believers class → Completed**. Every stage change is recorded, not just overwritten, so there's a full history. Assign (and reassign) whoever's responsible for following the person up. Once they've completed the class, "Add as a member" promotes them into a real Member record.

### Import Center
Bring in an existing member list in bulk — Excel, CSV, or even a scanned PDF. The system tries to match your spreadsheet's own column headers first; AI only steps in for messy headers or unstructured files. Before you approve anything, a summary pops up flagging possible duplicates (both against your existing members and within the file itself) and any dates it couldn't confidently read — with a one-click "skip all flagged duplicates." Nothing becomes a real member until you review and approve it. A PDF works well for a simple register, but a table with many columns comes through more reliably as Excel or CSV — a PDF has no column structure left by the time AI reads it, so some fields can come through blank even though they're in the file.

### Registrations
Every church gets a public link (shareable from this page) where visitors fill in the same basic details as the Add Member form. Submissions notify whoever's appointed as a registration approver; nothing becomes a real member until approved.

---

## Ministry

### Events
A month calendar — big day tiles, chevrons to move a month at a time, a "Today" button, and a "go to date" jump. Click a day to see everything happening on it; click an event in that list to expand it in place. Create an event with a title, location, start date/time, and optionally an end date/time, and it automatically gets its own public attendance link — the same check-in page people scan a QR code for or an usher opens on a shared device. Tick "Repeats" to generate a whole series at once (daily, weekly, or monthly, until a date you choose) — each occurrence is its own full event with its own attendance link and its own debrief, not a single recurring placeholder. Optionally tag it with a meeting category (e.g. Sunday Service) so a recurring calendar-driven meeting feeds the same repeat-absenteeism tracking as one started from Attendance directly. Once an event's start time has passed, file a debrief (venue, actual attendance, strengths, challenges, recommendations).

### Fellowships (cell groups)
Your church's cell groups/fellowships — name, leader, meeting day/time/location. Renamed to whatever your church calls them under Settings → Terminology.

### Fellowship reports
A leader logs their meeting: attendance, giving collected, expenses. Giving never touches the real ledger until an Org Admin or Finance Officer reviews and approves it. Every report also notifies the Org Admin, whoever's appointed Pastor, and whoever heads the Fellowships department.

### Departments
Directorates and departments, each with a head. Renamed under Settings → Terminology if your church uses different words.

### Service Units
Teams that serve in services and programs — Media, Ushers, Protocol, Music, Children, Devotional are offered as suggestions when you add your first one, but nothing's forced on you. Add members to a unit, edit its name/description/leader at any time, and pull an attendance/absenteeism report for the whole unit or one member — computed from the same check-in data everyone already generates by checking in normally, no separate roll-call needed.

---

## Trainings

### Programs
The umbrella a discipleship class sits under (e.g. "Foundations", "Leadership Track").

### Classes & Discipleship
Individual class cohorts under a program — instructor, start/end dates, and a member roster. Take attendance for a class session the same way as any other attendance session.

---

## Finance

### Giving
Every gift on file — category, fund, method, giver.

### Funds
Designated pools (Building Fund, Missions Fund) separate from category. A fund with a target amount shows a live progress bar and can carry a deadline.

### Pledges
A member or partner's commitment to give a total over time. Fulfilled amount is calculated from actual giving, never entered by hand. Editable (amount, fund, frequency, dates, notes) at any time; auto-marked Fulfilled once met, or Archived well past its end date if it never was — archived pledges can be reactivated. Record a partial or full payment straight from the pledge itself with "Record a payment" — whoever originally logged the pledge is notified every time a payment lands against it, with the running fulfilled percentage.

### Partners
External givers (people, organizations, sister churches) who give without being a Member — tracked with their own giving/pledge history.

### Batches
Group a collection (a Sunday service) and reconcile the declared total against what was actually recorded.

### Requisitions
A leader asks for funds for a stated reason; finance approves or rejects; only afterward does the leader file a separate accountability report on what it was actually spent on. Neither side can approve their own submission.

### Accounting
A simple chronological register of everything recorded in Giving — not full double-entry bookkeeping.

### Financial Settings
Hierarchical giving categories (add subcategories, rename, remove) and your church's own payees/vendors.

---

## Operations

### Attendance
Start a session by picking one of your church's meeting categories (Sunday Service, Cell Fellowship, ...) and a date/time — or "Other (spot meeting)" for a one-off with no ongoing category. Then check people in — search an existing member, or take a walk-in's name and phone. Duplicate check-ins for the same session are prevented automatically. Delete a mistaken check-in with the trash icon, or promote a walk-in straight into a full Member record (every field Add Member offers, not just name and phone) with "Add as a new member." If a walk-in was instead added as a Member separately after the service, "Link to an existing member" points their check-in at that real record instead of leaving a duplicate lying around. A walk-in who checks in three times under the same phone number without ever being registered gets turned into a Member automatically, with their past visits linked to the new record and a follow-up filed to reach out about registering them properly.

Once someone has attended a meeting category before, missing the next 3 sessions of that same category in a row automatically files a follow-up too — nobody has to notice the gap themselves. Both of these run as a background check, so there can be a short delay before a follow-up appears.

### Assets
General church assets — photos, flyers, documents.

### Fixed Assets
Land, buildings, equipment, vehicles — with up to 4 reference photos per asset (auto-optimized on upload). Current value is recalculated every time the page loads from cost/depreciation rate/acquisition date, never stored. Editing an asset requires a second person's approval; asking about an asset's condition notifies the right branch/admin and they respond with a description and photos.

### Deletion requests
Deleting a member, household, fellowship, or department doesn't happen immediately — it's requested, and a different appointed approver has to confirm before anything actually goes away.

---

## Communications

### Announcements
Broadcast a message in-app to everyone with a login, or narrow it to one role or one branch. Reaches staff/leaders with a login only — not the congregation directly, since no SMS/WhatsApp provider is connected yet.

### Testimonies
Anyone with a login posts a categorized testimony; everyone reads the feed; only an Org Admin can remove one.

### Daily Devotional
One entry per calendar day, but you're not limited to writing today's — schedule as many ahead of time as you like, or go back and fix an old one. Only the Org Admin or someone granted the "devotional editor" permission can write one; everyone signed in can read it.

---

## Reports (Analytics)

Cross-system aggregated views, tabbed: **Members & attendance** (growth, trends, demographics), **Attendance lists** (download a specific event's attendance list, or pull one member's full attendance history), **Service units** (present vs. absent across every service unit, for one chosen service), **Giving** (trends, by category, by fund), **Statements** (a member's or a fund's full running statement), **Pledges** (fulfillment), **Fixed assets** (value by category, condition), **Fellowship leaders** (submission volume, approval rate, average attendance). Every card on every tab has its own Excel export.

---

## Setup

### Organization Admin
**Branches** — your church's campuses; one is always marked "main," reassignable at any time, each with its own optional leader. Deleting one (files a deletion request like everything else) isn't allowed while it's still the main branch. **Meeting categories** — the recurring meeting types your church runs (Sunday Service, Cell Fellowship, ...); rename or deactivate one at any time without losing the history attached to it. **Staff & roles** — invite a login, assign its role and branch, and toggle any of the additive permissions (deletion approver, registration approver, cell leadership, Pastor, Fellowships department head, devotional editor, default follow-up user). Edit a staff member's name, role, or branch at any time from the Edit icon on their row — handy for fixing a wrong branch assignment after the fact. "Reset password" on their row emails them a reset link directly (you never see the link yourself); the temporary password you set when inviting them only gets used for their very first login anyway, since the app forces a real password to be set at that point. **Audit log** — a searchable record of logins, deletions, approvals, and most create/update actions across your organization, most recent first.

### Settings
Your church's profile (name, logo, country, contact info, currency), theme (six color options — Onyx, the neutral grey, is the default), terminology — rename "Members," "Households," "Fellowships," "Departments," or "Daily Devotional" to whatever your church actually calls them; the new word appears everywhere that noun shows up — and Data backup: download a complete copy of your organization's data, and restore from it if you ever need to. Worth doing before a major update or a hosting/storage change; restoring replaces your current data with the backup's, so it's meant for real data-loss situations, not everyday use.
