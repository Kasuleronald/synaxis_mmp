Absolutely. For Claude Code, I would **not** start by asking it to immediately code the system. Give it a strong **master prompt** that tells it to behave like a senior product architect first: understand the scope, design the architecture, define modules, database, offline synchronization strategy, permissions, UI system, roadmap, and then wait for your approval before implementation.

I would also make **ZOE** more than just a name—define it as a complete church operating platform.

Here is a prompt you can paste directly into Claude Code:

# ZOE — Comprehensive Church Management & Ministry Operating System

You are acting as a **Principal Software Architect, Senior Full-Stack Engineer, Product Designer, Database Architect, DevOps Engineer, and Church Management Systems consultant**.

I want you to help me build a complete, modern, scalable church management and ministry operating system called **ZOE**.

Do NOT begin by writing the application code immediately.

Your first responsibility is to deeply analyze the requirements, identify missing functionality, propose the complete system architecture, and create a detailed implementation roadmap. We will review and approve the architecture before serious implementation begins.

---

# 1. PRODUCT VISION

Build **ZOE**, a comprehensive Church Management System / Ministry Operating System that can manage the day-to-day operations, people, discipleship, finances, ministries, departments, projects, assets, communication, and growth of a modern church.

ZOE should not feel like an old-fashioned church database.

It should feel like a **modern enterprise SaaS platform designed specifically for churches and ministries**.

The system should be:

* Modern
* Beautiful
* Fast
* Responsive
* Intuitive
* Scalable
* Secure
* Modular
* Multi-departmental
* Data-driven
* Offline-capable
* Synchronization-capable
* Mobile-friendly
* Suitable for small churches and large multi-campus churches

The UI should use **colorful visual sections**, cards, charts, dashboards, icons, meaningful colors, modern typography, excellent spacing, subtle animations and a professional design system.

The product name throughout the application should be:

# ZOE

Possible meaning/brand concept:

**ZOE — Church Life & Ministry Management Platform**

The system should communicate the concept of **life, growth, discipleship, connection and ministry**.

---

# 2. IMPORTANT DEVELOPMENT PRINCIPLE

Do NOT blindly implement everything in one huge application.

First create:

1. Product vision
2. Functional requirements
3. System modules
4. User roles
5. Permission architecture
6. Information architecture
7. Database architecture
8. Technical architecture
9. Offline architecture
10. Synchronization architecture
11. API architecture
12. UI/UX design system
13. Security architecture
14. Reporting architecture
15. Notification architecture
16. Deployment architecture
17. Development phases
18. MVP definition
19. Future roadmap

Then wait for my approval before moving into major implementation.

---

# 3. CORE SYSTEM MODULES

Design ZOE to contain, at minimum, the following modules.

## A. Executive Dashboard

Create a high-level dashboard showing:

* Total members
* Active members
* New members
* Visitors
* First-time visitors
* Salvations
* Baptisms
* Discipleship progress
* Home fellowship participation
* Department participation
* Volunteer participation
* Giving
* Partnerships
* Projects
* Assets
* Attendance
* Follow-ups
* Member growth
* Membership retention
* Upcoming events
* Pending tasks
* Alerts
* Important statistics

Dashboards should be configurable based on user role.

---

# 4. PEOPLE & MEMBERSHIP MANAGEMENT

Create a comprehensive member management system.

Member profiles should support:

* Full name
* Photo
* Gender
* Date of birth
* Contact information
* Email
* Address
* Emergency contact
* Marital status
* Family relationships
* Spouse
* Children
* Parents
* Guardian
* Membership status
* Date joined
* Date saved
* Baptism status
* Baptism date
* Salvation date
* Church campus
* Home fellowship
* Department
* Ministry
* Discipleship class
* Spiritual growth status
* Volunteer roles
* Leadership roles
* Attendance history
* Giving history
* Partnership history
* Follow-up history
* Prayer requests
* Counselling records where appropriate
* Notes
* Tags
* Documents
* Custom fields

Support member lifecycle:

Visitor → New Convert → Member → Active Member → Volunteer → Leader → Minister

Also support:

* Inactive members
* Transferred members
* Deceased members
* Members who leave the church

Include member search, filtering, segmentation, bulk actions and export.

---

# 5. VISITORS & CONNECTION MANAGEMENT

Create a visitor management system.

Capture:

* First-time visitors
* Returning visitors
* Referral source
* Service attended
* Date visited
* Contact details
* Person who invited them
* Location
* Prayer requests
* Interests
* Follow-up status

Create an automated visitor journey:

Visitor → Contacted → Followed Up → Connected → Attended Again → Joined → Discipleship → Serving

Provide follow-up tasks and reminders.

---

# 6. FOLLOW-UP & MEMBER GROWTH

Build a powerful follow-up CRM.

Follow-ups should work for:

* Visitors
* New converts
* New members
* Absent members
* People requesting prayer
* Baptism candidates
* Discipleship students
* Home fellowship members
* Department members
* Volunteers
* Leaders
* Counselling cases
* Special pastoral follow-up

Support:

* Follow-up assignments
* Follow-up schedules
* Calls
* SMS
* WhatsApp integration architecture
* Email
* Visits
* Notes
* Outcomes
* Next actions
* Reminders
* Escalation
* Follow-up history

Create a visual member journey/timeline.

---

# 7. DEPARTMENTS

Build a flexible department management system.

Examples:

* Worship
* Media
* Children's Ministry
* Youth
* Young Adults
* Men
* Women
* Marriage
* Evangelism
* Missions
* Prayer
* Ushering
* Protocol
* Security
* Technical
* Finance
* Administration
* Hospitality
* ICT
* Communications
* Transport
* Creative Arts

Church administrators must be able to create custom departments.

Each department should have:

* Director/Head
* Assistant
* Members
* Volunteers
* Activities
* Goals
* Meetings
* Attendance
* Tasks
* Budget
* Assets
* Projects
* Reports
* Documents
* Announcements

---

# 8. DIRECTORATES / MINISTRY STRUCTURE

Support hierarchical organizational structures.

Example:

Church
→ Directorate
→ Department
→ Team
→ Volunteer

Allow custom structures.

Examples:

Pastoral Directorate

* Pastoral Care
* Counselling
* Follow-up

Operations Directorate

* Finance
* Administration
* ICT
* Security

Creative Directorate

* Media
* Worship
* Design
* Production

The architecture must support different organizational structures without hard-coding them.

---

# 9. VOLUNTEER MANAGEMENT

Build a volunteer management module.

Track:

* Volunteer profile
* Skills
* Interests
* Availability
* Department
* Team
* Role
* Training
* Certification
* Service history
* Attendance
* Performance
* Supervisor
* Schedule
* Status

Create volunteer scheduling and roster management.

Allow leaders to assign people to specific services/events.

---

# 10. HOME FELLOWSHIPS / CELL GROUPS

Create a complete Home Fellowship / Cell / Small Group module.

Support:

* Fellowship creation
* Leader
* Assistant leader
* Members
* Location
* Meeting day
* Meeting time
* Meeting frequency
* Attendance
* Visitors
* Follow-ups
* Bible studies
* Prayer requests
* Activities
* Reports
* Multiplication/growth
* Group health indicators

Track group growth over time.

Support fellowship multiplication:

Fellowship A
→ Fellowship B
→ Fellowship C

---

# 11. DISCIPLESHIP SCHOOL / BIBLE SCHOOL

This should be one of the strongest modules in ZOE.

Create a complete discipleship school / ministry training system.

Support:

### Programs

Examples:

* Foundations
* New Believers
* Discipleship Level 1
* Discipleship Level 2
* Leadership School
* Ministry School
* Bible School

### Classes

Each class should have:

* Name
* Program
* Level
* Instructor
* Assistant
* Semester/intake
* Start date
* End date
* Capacity
* Location
* Online/offline
* Status

### Modules

Each program contains modules.

Each module should support:

* Module name
* Description
* Instructor
* Lessons
* Learning objectives
* Scripture references
* Materials
* Assignments
* Quizzes
* Exams
* Attendance
* Grades
* Completion status

### Student progression

Support:

Enrolled → Active → Completed → Promoted → Graduated

Allow promotion rules such as:

* Attendance requirement
* Minimum grade
* Module completion
* Instructor approval
* Character/discipleship assessment

Generate certificates.

Create student transcripts.

---

# 12. ATTENDANCE

Build centralized attendance.

Attendance should work for:

* Sunday services
* Midweek services
* Home fellowships
* Departments
* Discipleship classes
* Events
* Volunteer teams
* Meetings
* Conferences
* Trainings

Support:

* Manual attendance
* QR code
* Member search
* Check-in
* Check-out
* Bulk attendance
* Offline attendance

Attendance data should feed the analytics engine.

---

# 13. GIVING & FINANCIAL CONTRIBUTIONS

Create a secure giving management system.

Track:

* Tithes
* Offerings
* Missions
* Building fund
* Special offerings
* Partnerships
* Pledges
* Donations
* Project contributions

Support:

* Cash
* Bank
* Mobile money
* Card
* Online giving
* Other payment methods

Track:

* Giving history
* Giving categories
* Donor/member
* Anonymous giving
* Receipts
* Statements
* Campaigns
* Pledges
* Payment references

IMPORTANT:

Design this module with strong financial security and audit trails.

Do not expose sensitive giving information to unauthorized users.

---

# 14. PARTNERSHIPS

Create a partnership management system.

Partnerships may be:

* Monthly
* Quarterly
* Annual
* Project-based
* Missions
* Building
* Media
* Outreach
* Community projects

Track:

* Partner
* Commitment
* Frequency
* Payment history
* Outstanding commitments
* Campaign
* Communication
* Statements
* Thank-you communication

---

# 15. PROJECT MANAGEMENT

Create church project management.

Examples:

* Building projects
* Church plants
* Outreach campaigns
* Missions
* Conferences
* Technology projects
* Community development
* Media projects

Support:

* Project owner
* Budget
* Timeline
* Milestones
* Tasks
* Team
* Expenses
* Funding
* Documents
* Progress
* Risks
* Reports

Create visual project dashboards.

---

# 16. ASSET MANAGEMENT

Build an asset register.

Track:

* Asset name
* Category
* Serial number
* Purchase date
* Cost
* Current value
* Location
* Department
* Custodian
* Condition
* Warranty
* Maintenance schedule
* Documents
* Disposal

Categories:

* Vehicles
* Computers
* Cameras
* Audio equipment
* Musical instruments
* Furniture
* Buildings
* Land
* Generators
* Networking equipment
* Projectors
* Church equipment

Include asset transfer and maintenance history.

---

# 17. EVENTS & CALENDAR

Create event management.

Support:

* Services
* Conferences
* Weddings
* Funerals
* Trainings
* Meetings
* Outreach
* Missions
* Youth events
* Department events

Each event should support:

* Registration
* Attendance
* Volunteers
* Departments
* Budget
* Tasks
* Resources
* Venue
* Schedule
* Announcements

---

# 18. COMMUNICATIONS

Create centralized church communication.

Support architecture for:

* SMS
* Email
* Push notifications
* WhatsApp
* In-app notifications
* Announcements

Create audience segmentation:

* All members
* Department
* Fellowship
* Age group
* Gender
* Location
* Discipleship class
* Volunteers
* Leaders
* Custom groups

Include communication history and delivery status.

---

# 19. PRAYER & PASTORAL CARE

Create a pastoral care module.

Support:

* Prayer requests
* Counselling requests
* Hospital visits
* Home visits
* Bereavement
* Marriage support
* Crisis support
* Pastoral assignments
* Follow-up
* Confidential notes

Confidential information must have strict permission controls.

---

# 20. MISSIONS & EVANGELISM

Create a missions/evangelism module.

Track:

* Evangelism campaigns
* Outreach events
* Salvations
* New converts
* Baptisms
* Mission trips
* Missionaries
* Mission partners
* Locations
* Follow-up

Provide conversion/growth analytics.

---

# 21. DOCUMENT MANAGEMENT

Allow churches to manage:

* Member documents
* Certificates
* Meeting minutes
* Policies
* Reports
* Training materials
* Contracts
* Asset documents
* Financial documents

Use permissions and document categories.

---

# 22. TASKS & WORKFLOW

Create a task management system.

Tasks can be assigned to:

* Individuals
* Departments
* Teams
* Volunteers

Support:

* Priority
* Due dates
* Status
* Comments
* Attachments
* Recurring tasks
* Notifications
* Approvals

---

# 23. REPORTING & ANALYTICS

Create a powerful reporting engine.

Reports should include:

### Membership

* Growth
* Retention
* Demographics
* New members
* Transfers
* Inactive members

### Spiritual growth

* Salvations
* Baptisms
* Discipleship
* Graduations
* Promotions
* Serving participation

### Attendance

* Weekly
* Monthly
* Yearly
* Department
* Fellowship
* Service

### Giving

* Trends
* Categories
* Campaigns
* Partnerships
* Projects

### Ministry

* Department performance
* Volunteer engagement
* Fellowship growth
* Follow-up performance

Use charts, graphs, KPIs and drill-down reports.

---

# 24. ROLE-BASED ACCESS CONTROL

Design a sophisticated RBAC system.

Potential roles:

* Super Administrator
* Senior Pastor
* Executive Pastor
* Pastor
* Directorate Director
* Department Head
* Fellowship Leader
* Discipleship Administrator
* Discipleship Instructor
* Finance Officer
* HR/Admin
* Volunteer Coordinator
* Follow-up Coordinator
* Project Manager
* Member
* Volunteer
* Guest

Permissions should be granular.

Example:

A Finance Officer may see financial information but should not automatically see confidential pastoral counselling records.

A Fellowship Leader should see members in their fellowship but not necessarily all church members.

Design this as configurable permissions rather than hard-coded roles.

---

# 25. OFFLINE-FIRST ARCHITECTURE

This is a CRITICAL requirement.

ZOE must continue working when the internet is unavailable.

The application should support:

* Offline login/session where secure and appropriate
* Offline member search
* Offline attendance
* Offline visitor registration
* Offline follow-up notes
* Offline fellowship attendance
* Offline discipleship attendance
* Offline data entry
* Offline task management

When connectivity returns:

**Automatically synchronize local changes with the central server.**

Design a robust synchronization architecture.

Consider:

* Local database
* IndexedDB
* Service Worker
* PWA
* Local cache
* Sync queue
* Change tracking
* UUID-based records
* Timestamps
* Version numbers
* Conflict detection
* Conflict resolution
* Retry mechanisms
* Idempotent API operations
* Failed sync queue
* Sync status indicator

The user should clearly see:

🟢 Synced

🟡 Syncing

🔴 Offline

⚠️ Sync failed

Do NOT simply cache API responses.

Design a genuine offline-first data architecture.

---

# 26. MULTI-CAMPUS SUPPORT

The system should be designed from the beginning to support:

* One church
* Multiple branches
* Multiple campuses
* Church plants

Example:

ZOE
→ Church
→ Kampala Campus
→ Entebbe Campus
→ Jinja Campus
→ Online Campus

Allow central administration with campus-level permissions.

---

# 27. MULTI-TENANT ARCHITECTURE

Evaluate whether ZOE should eventually support multiple independent churches using the same platform.

Example:

Church A
Church B
Church C

Each church must have isolated data.

Design the architecture so this can be added without rebuilding the entire system.

---

# 28. DATABASE ARCHITECTURE

Design a normalized and scalable database.

At minimum consider entities such as:

* organizations
* campuses
* users
* roles
* permissions
* members
* households
* relationships
* departments
* directorates
* teams
* volunteers
* fellowships
* fellowship_members
* attendance
* events
* discipleship_programs
* discipleship_modules
* classes
* enrollments
* grades
* promotions
* certificates
* followups
* prayer_requests
* giving
* giving_categories
* partnerships
* projects
* project_tasks
* assets
* maintenance
* communications
* notifications
* documents
* audit_logs
* sync_operations

Do not blindly use this list. Improve it.

Identify missing entities and relationships.

Produce an ERD before implementation.

---

# 29. SECURITY

Security must be treated as a first-class feature.

Include:

* Authentication
* Authorization
* RBAC
* Password hashing
* Session management
* JWT/session strategy
* MFA architecture
* Audit logging
* Encryption
* Secure API
* Rate limiting
* Input validation
* CSRF protection where applicable
* XSS protection
* SQL injection prevention
* File upload security
* Backup strategy
* Data recovery
* Sensitive data access controls

Financial and pastoral data require enhanced restrictions.

---

# 30. AUDIT TRAIL

Every important action should be auditable.

Track:

* Who performed the action
* What changed
* Previous value
* New value
* Date/time
* Device
* IP where appropriate
* Reason where required

Especially for:

* Financial records
* Membership changes
* Role changes
* Permissions
* Pastoral records
* Asset changes
* Data deletion

---

# 31. UI/UX DESIGN

Create a premium modern dashboard.

Think:

**Stripe + Linear + Notion + modern SaaS dashboards + excellent church software UX**

but do NOT simply copy any product.

Use:

* Colorful module sections
* Beautiful cards
* Modern sidebar
* Responsive navigation
* Command/search bar
* Data tables
* Charts
* Timelines
* Kanban boards
* Calendar
* Activity feeds
* Member avatars
* Status badges
* Empty states
* Loading states
* Skeleton loaders
* Toast notifications
* Confirmation dialogs
* Beautiful forms

Each major module should have its own visual identity while maintaining a unified ZOE design system.

Suggested color families:

Membership — Blue

Discipleship — Purple

Fellowships — Green

Departments — Orange

Giving — Gold

Projects — Teal

Assets — Slate

Communications — Pink

Pastoral Care — Deep Red

Analytics — Indigo

Do not overuse colors. Maintain professional visual hierarchy and accessibility.

---

# 32. RESPONSIVE DESIGN

ZOE must work beautifully on:

* Desktop
* Laptop
* Tablet
* Mobile

Mobile users should be able to perform practical ministry tasks such as:

* Register visitors
* Take attendance
* Add members
* Record follow-ups
* View schedules
* Check tasks
* Record fellowship attendance
* View notifications

---

# 33. TECHNOLOGY STACK

Do not assume the stack blindly.

Evaluate the best modern architecture.

A potential stack could be:

Frontend:

* React
* TypeScript
* Vite
* Tailwind CSS
* modern component library

Backend:

* Node.js
* TypeScript
* REST API or carefully justified alternative

Database:

* PostgreSQL

Offline:

* IndexedDB
* Service Worker
* PWA

Authentication:

* Secure session/JWT architecture

Infrastructure:

* Docker
* Reverse proxy
* HTTPS
* Automated backups

However, you are responsible for evaluating whether this is actually the best architecture.

Explain alternatives and make a recommendation.

---

# 34. API ARCHITECTURE

Design a clean API architecture.

Include:

* Authentication
* Members
* Visitors
* Departments
* Directorates
* Fellowships
* Attendance
* Discipleship
* Follow-ups
* Giving
* Partnerships
* Projects
* Assets
* Events
* Communications
* Reports
* Notifications
* Synchronization

Use:

* Validation
* Pagination
* Filtering
* Sorting
* Search
* Error handling
* Versioning
* Idempotency where necessary

---

# 35. SEARCH

Create a global search system.

Search across:

* Members
* Visitors
* Fellowships
* Departments
* Events
* Projects
* Assets
* Discipleship
* Tasks
* Documents

Include keyboard shortcuts where appropriate.

---

# 36. NOTIFICATION ENGINE

Design notifications for:

* Follow-up reminders
* Birthdays
* Events
* Attendance issues
* Discipleship deadlines
* Assignment deadlines
* Task deadlines
* Giving confirmations
* Project milestones
* Volunteer schedules
* System alerts

Support in-app notifications first and design integrations for SMS/email/WhatsApp/push.

---

# 37. AUTOMATION ENGINE

Design a future workflow/automation engine.

Example:

IF

Visitor has attended twice

THEN

Create follow-up task.

Another example:

IF

Member completes Discipleship Level 1

THEN

Notify discipleship administrator and make member eligible for Level 2.

Another:

IF

Member has missed fellowship for 3 consecutive meetings

THEN

Create follow-up task for fellowship leader.

Design this in a configurable way.

---

# 38. DATA IMPORT & EXPORT

Support:

* Excel import
* CSV import
* Excel export
* CSV export
* PDF reports

Provide validation and duplicate detection during imports.

---

# 39. BACKUPS & DISASTER RECOVERY

Design:

* Automated backups
* Point-in-time recovery strategy
* Backup verification
* Database restoration
* Disaster recovery
* Export capability

A church must never lose its historical data.

---

# 40. ARCHITECTURE DOCUMENTATION

Before coding, produce:

### 1. Product Requirements Document

### 2. System Architecture Document

### 3. Module Map

### 4. User Role Matrix

### 5. Permission Matrix

### 6. Database ERD

### 7. Database Schema Proposal

### 8. API Architecture

### 9. Offline/Sync Architecture

### 10. UI/UX Design System

### 11. Navigation Architecture

### 12. Security Model

### 13. Reporting Architecture

### 14. Notification Architecture

### 15. Multi-campus Architecture

### 16. Multi-tenant Architecture

### 17. Deployment Architecture

### 18. Backup Architecture

### 19. Testing Strategy

### 20. Development Roadmap

---

# 41. DEVELOPMENT ROADMAP

Divide development into realistic phases.

For example:

## Phase 0 — Discovery & Architecture

No major coding.

Finalize requirements and architecture.

## Phase 1 — Foundation

* Project setup
* Authentication
* Users
* Roles
* Permissions
* Organization
* Campuses
* Core database
* UI design system

## Phase 2 — People

* Members
* Households
* Visitors
* Follow-ups
* Attendance

## Phase 3 — Ministry

* Departments
* Directorates
* Volunteers
* Fellowships
* Events

## Phase 4 — Discipleship

* Programs
* Modules
* Classes
* Enrollment
* Attendance
* Grades
* Promotions
* Certificates

## Phase 5 — Finance

* Giving
* Partnerships
* Campaigns
* Financial reporting

## Phase 6 — Operations

* Assets
* Projects
* Tasks
* Documents

## Phase 7 — Communications

* Notifications
* SMS
* Email
* WhatsApp architecture

## Phase 8 — Intelligence

* Analytics
* Dashboards
* Reports
* Automation

## Phase 9 — Offline & Synchronization

Build and harden the offline-first experience.

## Phase 10 — Production

* Security hardening
* Testing
* Performance
* Backups
* Deployment
* Monitoring

Improve this roadmap if you believe a different order is better.

---

# 42. TESTING

Create a serious testing strategy.

Include:

* Unit tests
* Integration tests
* API tests
* Database tests
* UI tests
* End-to-end tests
* Permission tests
* Offline tests
* Sync tests
* Conflict tests
* Security tests
* Performance tests

Especially test:

**Offline → data entry → connection restored → synchronization → conflict resolution**

---

# 43. PERFORMANCE

The system should remain fast with:

* 1,000 members
* 10,000 members
* 100,000+ members

Avoid architectures that will collapse as the church grows.

Design:

* Pagination
* Indexing
* Caching
* Lazy loading
* Background synchronization
* Efficient queries
* Optimistic UI where appropriate

---

# 44. FUTURE AI FEATURES

Do not make AI a requirement for the MVP, but architect ZOE so AI can eventually provide:

* Member growth insights
* Attendance anomaly detection
* Follow-up recommendations
* Automated report summaries
* Sermon/resource recommendations
* Discipleship recommendations
* Volunteer matching
* Predictive member retention insights
* Natural-language reporting

Example:

"Show me members who have stopped attending for the last 4 weeks."

or:

"Which home fellowships have grown the most this quarter?"

or:

"Which discipleship students are at risk of dropping out?"

Design the system so these capabilities can be added later.

---

# 45. IMPORTANT CHURCH-SPECIFIC CONSIDERATIONS

Think beyond generic CRM software.

ZOE should understand church realities such as:

* Spiritual growth
* Discipleship
* Pastoral care
* Fellowship
* Serving
* Leadership development
* Evangelism
* Missions
* Baptism
* Salvation
* Church membership
* Family/household structures
* Church plants
* Ministry teams
* Volunteers
* Giving
* Partnerships
* Prayer
* Member care

Identify other church-specific requirements I have not mentioned.

---

# 46. YOUR FIRST TASK — DO NOT CODE YET

Before creating substantial application code, produce a comprehensive **ZOE Architecture & Product Blueprint**.

Your response should contain:

## SECTION 1 — Understanding

Explain your understanding of what ZOE is.

## SECTION 2 — Recommended Product Scope

Identify all modules you recommend.

Separate:

* MVP
* Phase 2
* Phase 3
* Future

## SECTION 3 — System Architecture

Show the architecture diagram conceptually.

## SECTION 4 — Technology Recommendation

Compare possible stacks and recommend one.

## SECTION 5 — Database Architecture

List major entities and relationships.

## SECTION 6 — RBAC

Provide roles and permissions.

## SECTION 7 — Offline Architecture

Explain exactly how offline-first operation and synchronization should work.

## SECTION 8 — Multi-campus / Multi-tenant

Explain how this should be designed.

## SECTION 9 — UI/UX Architecture

Describe navigation, dashboards, module layouts and design system.

## SECTION 10 — API Architecture

Define major API domains.

## SECTION 11 — Security

Define the security model.

## SECTION 12 — Reporting

Define the analytics and reporting architecture.

## SECTION 13 — Roadmap

Create a detailed implementation roadmap.

## SECTION 14 — MVP

Define exactly what the first usable version should contain.

## SECTION 15 — Risks

Identify architectural and product risks.

## SECTION 16 — Questions

Ask me only the questions that are genuinely necessary before implementation.

---

# 47. CODING RULE

After presenting the blueprint, DO NOT automatically start building everything.

Wait for my approval.

Once I approve the architecture, we will proceed module by module.

For each module:

1. Confirm requirements
2. Design database changes
3. Design API
4. Design UI
5. Implement
6. Test
7. Review
8. Integrate
9. Document

Do not create massive amounts of unstructured code.

Keep the code:

* Modular
* Maintainable
* Typed
* Tested
* Documented
* Secure
* Scalable

---

# 48. IMPORTANT DESIGN PHILOSOPHY

ZOE should feel like a **premium modern SaaS product**, not an administration spreadsheet.

The dashboard should immediately communicate:

**People → Growth → Ministry → Giving → Operations → Impact**

The system should help church leaders answer questions such as:

> Who are our people?

> Where are they?

> How are they growing?

> Who needs follow-up?

> Who is being discipled?

> Who is serving?

> Which fellowships are healthy?

> Which departments are active?

> What is happening financially?

> What projects are running?

> What assets do we own?

> What is the church's overall health?

The software should transform church data into actionable ministry intelligence.

---

# 49. FINAL INSTRUCTION

Think deeply before responding.

Do not rush into coding.

Challenge my assumptions where necessary.

Identify missing modules and requirements.

Recommend better approaches where appropriate.

Do not simply agree with everything I have specified.

Act like a senior architect who is responsible for designing a system that could eventually serve a church with **100,000+ members across multiple campuses and countries**.

The first deliverable is therefore:

# ZOE — COMPLETE PRODUCT, ARCHITECTURE & DEVELOPMENT BLUEPRINT

Only after I approve that blueprint should implementation begin.
