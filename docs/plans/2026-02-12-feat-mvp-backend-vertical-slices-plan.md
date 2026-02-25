---
title: "Ship MVP Backend — 3 Vertical Slices"
type: feat
date: 2026-02-12
updated: 2026-02-24
brainstorm: docs/brainstorms/2026-02-12-mvp-ship-strategy-brainstorm.md
prd: prd_for_apps/franklincovey-coaching-platform-prd.md
delta: docs/CIL-BRIEF-DELTA-ANALYSIS.md
review: docs/reviews/2026-02-14-technical-review-consolidated.md
changelog:
  - 2026-02-13: "Added Organization model (multi-org architecture per Greg's requirement). De-scoped email nudges to dashboard flags. Added workshop agenda reference."
  - 2026-02-13b: "Added printable client reports (proposal requirement — @media print CSS, no PDF library). Added coach CSV import script to Phase 0 (critical path for March 2 real data). Cross-referenced proposal deck — 6 flags identified."
  - 2026-02-14: "Applied technical review amendments: replaced Serializable transactions with SELECT FOR UPDATE + unique constraints, cut Phase 0 over-engineering (pino, PII masking, API helpers), replaced advisory lock with timestamp guard, simplified coach ordering to Math.random(), added typed error classes and null safety notes. Full review: docs/reviews/2026-02-14-technical-review-consolidated.md"
  - 2026-02-14b: "Designed fully automated QA strategy: 5 test suites (30 scenarios) using Claude in Chrome browser automation. Added test infrastructure (/api/test/* endpoints, test seed data, Mailpit). Covers participant auth, coach selection, session logging, admin import/export, dashboard KPIs, and cross-cutting auth/rate-limiting."
  - 2026-02-16: "Added email safety stack to Phase 0: startup assertion (crash if prod SMTP creds in non-prod env), sanitize-by-default on coach CSV import (--raw flag for production), Mailpit explicitly in docker-compose spec. Added .gitignore for real data CSVs."
  - 2026-02-17: "Applied Feb 17 workshop decisions: removed participant-facing filters from coach selector, simplified participant flow (ends at selection — no engagement page), updated session statuses to 3 types, and captured the then-current reminder/assignment assumptions. Note: reminder ownership and assignment behavior were later finalized by the 2026-02-24 decision lock."
  - 2026-02-18: "Resolved P0 deployment decisions: official MVP target is Vercel + Supabase, contract signed, and FC committed to a 24-hour blocking-decision owner through March 16. Coach panel split clarified: 15 total coaches for MLP/ALP and 16 total for EF/EL. Remaining open clarifications: participant counts by cohort and use-or-lose/window-close policy."
  - 2026-02-18b: "Locked session status policy per stakeholder clarification: coaches are source of truth for session outcomes (COMPLETED, FORFEITED_CANCELLED, FORFEITED_NOT_USED). No automatic Session 1 lock/expiry based on cohort window deadlines in MVP; ops monitors via dashboard."
  - 2026-02-18c: "Confirmed panel separation with FC: EF/EL coaches are a completely separate pool from MLP/ALP. No cross-pool matching in MVP."
  - 2026-02-18d: "Recorded timing-anchor clarification (Day 0 = cohort start date) for the pre-lock reminder model in place at that time."
  - 2026-02-18e: "Forfeited Session 1 labels clarified by FC: 'Session forfeited - canceled within 24 hours' and 'Session forfeited - not taken advantage of' (mapped to FORFEITED_CANCELLED and FORFEITED_NOT_USED)."
  - 2026-02-18f: "Email delivery planning note added: Resend free-tier daily limits can throttle launch-day auth/magic-link traffic; recommend paid tier for launch window."
  - 2026-02-18g: "Capacity counting rule confirmed by Kari: count COACH_SELECTED, IN_PROGRESS, and ON_HOLD; exclude INVITED, COMPLETED, and CANCELED."
  - 2026-02-24: "Applied post-workshop decision lock to remove cross-doc ambiguity: participant auth now uses USPS-delivered email + participant access code (no system participant emails), EF/EL capacity confirmed at 20, planning baseline locked at 400, EF/EL reporting anchor locked to selection-window start + 9 months, and use-it-or-lose-it locked as ALP/MLP manual model only. MLP/ALP capacity updated from 15 to 20 — all pools now COACH_CAPACITY = 20 (Kari confirmed)."
  - 2026-02-24b: "Applied two P0 security corrections from technical review: (1) Replace NODE_ENV test-endpoint guard with TEST_ENDPOINTS_ENABLED env var — NODE_ENV is always 'production' on Vercel including staging, so the old guard would disable E2E tests. Added TEST_ENDPOINTS_SECRET header check as secondary gate. (2) Correct access-code hashing: use HMAC-SHA256 (not bcrypt) since bcrypt offers no precomputation resistance for a 6-digit numeric space. Defense-in-depth stays: strict expiry + one-time-use + per-IP rate limiting + per-participant lockout. Moved failedAttempts + lockedUntil from VerificationCode row to Participant model so code resets cannot bypass lockout."
  - 2026-02-24c: "FC delivered ALP-135 roster for MVP import. Additional participant-context spreadsheet (`FY26 ALP 136_EF 1 Coaching Bios.xlsx`) was clarified as optional context for later coach visibility; explicitly locked out of MVP selector/matching logic and moved to post-MVP backlog."
  - 2026-02-24d: "Participant auth decision updated per Kari confirmation: MVP uses roster-matched email-entry only (no participant access codes) due USPS cohort group-email workflow + FC sender restrictions. Access-code references in this backlog are now historical unless explicitly re-approved."
  - 2026-02-24e: "Applied 2026-02-24d auth decision to frontend and API client: removed access code field from participant entry page, renamed verifyAccessCode → verifyParticipantEmail, updated endpoint to POST /api/participant/auth/verify-email, replaced INVALID_CREDENTIALS error code with UNRECOGNIZED_EMAIL (specific messaging per product decision). VerificationCode model removal delegated to schema owner. Research doc updated to match."
---

# feat: Ship MVP Backend — 3 Vertical Slices (March 2/9/16)

> **Normative decision lock (2026-02-24):** this plan is an implementation backlog, but final policy decisions are controlled by:
> - `docs/plans/2026-02-18-fc-project-plan.md`
> - `docs/drafts/2026-02-18-mvp-contract-v1.md`
>
> If this document conflicts with either source above, the source-of-truth docs win.

## Overview

Connect the existing polished frontend (~60% built, hardcoded demo data) to a real Next.js API backend with Prisma + PostgreSQL, shipping in three independently deployable vertical slices aligned to hard deadlines:

| Slice | Scope | Deadline | Users Impacted |
|-------|-------|----------|----------------|
| **1** | Coach Selector + Participant Email Auth (roster-matched) | **March 2** | ~60 participants (first cohort) |
| **2** | Coach Engagement + Session Logging | **March 9** | ~15 coaches (MLP/ALP panel) |
| **3** | Admin Portal + Needs-Attention Workflow | **March 16** | 3 admins (Ops, Kari, Greg) |

**Key architectural decisions** (from [brainstorm](docs/brainstorms/2026-02-12-mvp-ship-strategy-brainstorm.md)):
- Participant auth: USPS-delivered coach-selector link + roster-matched participant email entry only (no system participant emails in MVP)
- Dashboards: 1 Ops dashboard + 1 executive summary view
- Multi-program: Schema-ready, UI-later (`Program` model seeded, no admin UI)
- Multi-org: `Organization` model from day 1 — infrastructure for the full platform (Greg's requirement, added 2026-02-13)
- Reminder ownership: USPS/FC Ops manual reminders in MVP; system owns dashboard flags and coach/admin magic-link emails only
- Backend: Next.js API routes + Prisma in same repo

## Problem Statement / Motivation

The frontend is polished but entirely hardcoded. Without a backend, the platform cannot:
1. Authenticate ~60 USPS participants arriving March 2 (first cohort; 400 total across all programs)
2. Match participants to real coaches with capacity awareness
3. Let coaches log sessions or track engagement progress
4. Give admins visibility into program health or import new participants
5. Surface "Needs Attention" items for FC Ops follow-up when engagements stall

The CIL Brief (Feb 2026) expanded scope from 5-10 coaches to **35 coaches** and from 1 program to **4 programs**, making the backend's data model more critical than originally planned.

## Technical Approach

### Architecture

```
┌─────────────────────────────────────────────────┐
│  Next.js 15 App Router (same repo)              │
│                                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│  │Participant│  │  Coach   │  │    Admin      │   │
│  │  Portal   │  │  Portal  │  │    Portal     │   │
│  └─────┬────┘  └─────┬────┘  └──────┬───────┘   │
│        │              │              │            │
│  ┌─────┴──────────────┴──────────────┴───────┐   │
│  │          API Routes (/api/*)               │   │
│  │  • /api/auth/[...nextauth] (coach/admin)  │   │
│  │  • /api/participant/auth   (access-code)  │   │
│  │  • /api/participant/coaches (selection)    │   │
│  │  • /api/coach/sessions     (logging)      │   │
│  │  • /api/admin/import       (bulk)         │   │
│  │  • /api/admin/dashboard    (KPIs)         │   │
│  │  • /api/cron/nudges        (dashboard flags only) │   │
│  │  • /api/export             (CSV stream)   │   │
│  └─────────────────┬─────────────────────────┘   │
│                    │                              │
│  ┌─────────────────┴─────────────────────────┐   │
│  │         Prisma ORM (lib/prisma.ts)         │   │
│  └─────────────────┬─────────────────────────┘   │
└────────────────────┼──────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │   PostgreSQL 16       │
         │ (Supabase PostgreSQL) │
         │   via PgBouncer       │
         └───────────────────────┘
```

### ERD (Full Schema)

```mermaid
erDiagram
    Organization {
        String id PK
        String name
        String slug UK
        Boolean active
        DateTime createdAt
    }

    Program {
        String id PK
        String organizationId FK
        String name
        String code UK "MLP | ALP | EF | EL"
        String description
        ProgramTrack track "TWO_SESSION | FIVE_SESSION"
        Boolean active
        DateTime createdAt
    }

    User {
        String id PK
        String email UK
        String name
        Role role "COACH | ADMIN"
        Boolean active
    }

    CoachProfile {
        String id PK
        String userId FK
        String bio
        String photo
        String[] specialties
        String[] languages
        String location
        String[] credentials
        String videoUrl
        String meetingBookingUrl
        Int maxEngagements "default 20"
        Boolean active
    }

    CoachProgramPanel {
        String id PK
        String coachProfileId FK
        String programId FK
        DateTime assignedAt
    }

    Participant {
        String id PK
        String email UK
        String firstName
        String lastName
        String org
        Int failedAttempts "auth lockout counter — scoped to participant not to code row"
        DateTime lockedUntil "null when not locked"
    }

    VerificationCode {
        String id PK
        String participantId FK
        String codeHash "HMAC-SHA256 of 6-digit code"
        DateTime expiresAt "coachSelectionWindowEnd"
        Boolean used "one-time-use flag"
        DateTime createdAt
    }
    %% NOTE: attempts/lockout are tracked on Participant (failedAttempts + lockedUntil),
    %% NOT on VerificationCode — so a code reset cannot bypass the lockout.

    Engagement {
        String id PK
        String participantId FK
        String coachId FK "nullable"
        String programId FK
        DateTime cohortStartDate "Day 0 for nudge timing"
        EngagementStatus status
        Int statusVersion "optimistic lock"
        Int totalSessions
        DateTime coachSelectedAt
        DateTime lastActivityAt
    }

    Session {
        String id PK
        String engagementId FK
        Int sessionNumber
        DateTime occurredAt "coach enters"
        DateTime completedAt
        SessionStatus status "COMPLETED | FORFEITED_CANCELLED | FORFEITED_NOT_USED"
    }

    SessionNote {
        String id PK
        String sessionId FK
        String topicDiscussed "from program competency list"
        String sessionOutcome
        Int duration
        String privateNotes "coach-only"
        Boolean isDraft
        DateTime submittedAt
    }

    NudgeLog {
        String id PK
        String engagementId FK
        NudgeType nudgeType "SELECTION_WINDOW_NEEDS_ATTENTION | COACH_ATTENTION | OPS_ESCALATION"
        Boolean emailSent "default false"
        DateTime sentAt
    }

    Organization ||--o{ Program : "has many"
    Program ||--o{ Engagement : "has many"
    Program ||--o{ CoachProgramPanel : "has coaches via"
    User ||--o| CoachProfile : "has one"
    CoachProfile ||--o{ CoachProgramPanel : "assigned to panels via"
    CoachProfile ||--o{ Engagement : "coaches"
    Participant ||--o{ Engagement : "participates in"
    Participant ||--o{ VerificationCode : "verifies via"
    Engagement ||--o{ Session : "contains"
    Session ||--o| SessionNote : "has notes"
    Engagement ||--o{ NudgeLog : "tracked by"
```

**Schema changes from PRD:**
- **Added** `Organization` model (2026-02-13: multi-org architecture per Greg's "infrastructure for the full platform" requirement)
- **Added** `Program.organizationId` FK (2026-02-13: programs belong to organizations)
- **Added** `Program` model (brainstorm: soft multi-program support)
- **Added** `VerificationCode` model (participant access-code verification)
- **Added** `CoachProfile.languages`, `.location`, `.credentials`, `.videoUrl` (CIL Brief delta; `videoUrl` is de-scoped in MVP UI)
- **Added** `Session.occurredAt` (coach enters date since no webhook auto-sync)
- **Removed** `Participant.tokenHash` (replaced with participant access-code verification model)
- **Removed** `Session.calendlyEventUri` (Calendly API removed)
- **Added** `Engagement.programId` (multi-program from day 1)

**Schema changes from Feb 17 workshop:**
- **Added** `CoachProgramPanel` join table (many-to-many: coaches ↔ programs). MLP/ALP and EF/EL remain separate pools with no cross-pool matching in MVP. All coach capacity locked at **20 per coach** across all pools (MLP/ALP updated from 15 to 20; Kari confirmed 2026-02-24). `@@unique([coachProfileId, programId])` prevents duplicate assignments.
- **Added** `Program.code` (unique program identifier: MLP, ALP, EF, EL) and `Program.track` (moved from Participant — track is a property of the program, not the participant)
- **Changed** `SessionStatus` enum: was `SCHEDULED | COMPLETED | CANCELED | NO_SHOW` → now `COMPLETED | FORFEITED_CANCELLED | FORFEITED_NOT_USED`
- **Changed** `SessionNote.topics/outcomes` arrays → `SessionNote.topicDiscussed` (single string from program competency list) + `SessionNote.sessionOutcome` (single string)
- **Changed** `NudgeLog.nudgeType` enum: now tracks dashboard attention flags for manual FC follow-up (no participant reminder sends in MVP)
- **Added** `NudgeLog.emailSent` boolean (tracks coach/admin/ops email sends where applicable)
- **Renamed** `NudgeLog.flaggedAt` → `NudgeLog.sentAt` (single timestamp for flags/emails)
- **Removed** `NudgeLog.acknowledged/acknowledgedAt` (ops workflow doesn't need explicit acknowledgment for MVP)
- **Removed** `Participant.programTrack` (track is now on `Program.track` — derived via `Engagement.programId`)
- ~~`NudgeLog.assignedCoachId`~~ — removed (reserved field with no MVP use; add when matching workflows ship)
- ~~`Engagement.autoAssigned`~~ — removed (reserved field with no MVP use; add when auto-assignment feature ships)
- **Added** `Engagement.cohortStartDate` (Day 0 anchor from cohort schedule)

---

## Implementation Phases

### Phase 0: Foundation (Days 1-2)

Infrastructure and schema that all three slices depend on.

#### 0.1 Initialize Prisma + PostgreSQL

- [ ] `npm install prisma @prisma/client` — `package.json`
- [ ] `npx prisma init` — creates `prisma/schema.prisma` + `.env`
- [ ] Write **full schema** (all 11+ models, not just Slice 1) — `prisma/schema.prisma`
  - Include all `@@index` declarations from PRD (don't add retroactively)
  - Include `Organization`, `Program`, `CoachProgramPanel`, `VerificationCode` models (new vs PRD)
  - `Organization` as top-level tenant: `{ id, name, slug, active, createdAt }`
  - `Program.organizationId` FK — programs belong to organizations
  - `Program.code` unique identifier (MLP, ALP, EF, EL) + `Program.track` (TWO_SESSION, FIVE_SESSION)
  - `CoachProgramPanel` join table: `@@unique([coachProfileId, programId])` — coaches assigned to program panels
  - Use `@@unique([engagementId, sessionNumber])` for session dedup
  - Use `@@unique([engagementId, nudgeType, sentAt])` for nudge dedup
- [ ] Create `.env.example` with all required vars — `.env.example`
- [ ] Create `docker-compose.yml` for local PostgreSQL + PgBouncer — `docker-compose.yml`
- [ ] Run `npx prisma migrate dev --name init` to create initial migration
- [ ] Create Prisma singleton — `src/lib/prisma.ts`

```typescript
// src/lib/prisma.ts — globalThis pattern prevents connection leaks on hot reload
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }
export const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

#### 0.2 Seed Data

- [ ] Create seed script — `prisma/seed.ts`
  - 1 organization (the government coaching contract) + 1 placeholder org for dev testing
  - 4 programs under the primary org: MLP (TWO_SESSION), ALP (TWO_SESSION), EF (FIVE_SESSION), EL (FIVE_SESSION)
  - 5+ sample coaches with realistic profiles for dev testing
  - CoachProgramPanel assignments model both pools: MLP/ALP shared pool and EF/EL separate pool
  - 3 admin users (Andrea/Ops, Kari/Coaching Director, Greg/VP)
  - 10 sample participants for dev testing
  - 5 sample engagements at various states
- [ ] Add `prisma.seed` script to `package.json`

- [ ] Coach CSV import script (added 2026-02-13 — critical path for March 2)
  - `scripts/import-coaches.ts` — CLI script (not admin UI) to load real coach data from FC-provided CSV
  - CSV columns: name, email, bio, photo, specialties (semicolon-separated), languages, location, credentials, meetingBookingUrl, maxEngagements
  - Validates each row against Zod schema, logs errors, skips invalid rows
  - Creates `User` (role=COACH) + `CoachProfile` + `CoachProgramPanel` entries atomically per row
  - `--programs MLP,ALP` or `--programs EF,EL` assigns coaches to specified program panels
  - Coaches should be imported into the correct pool only; no cross-pool assignment by default in MVP
  - Idempotent: update existing coach by email if re-run (upsert)
  - Run via `npx tsx scripts/import-coaches.ts --file coaches-mlp-alp.csv --orgId <orgId> --programs MLP,ALP`
  - Run via `npx tsx scripts/import-coaches.ts --file coaches-ef-el.csv --orgId <orgId> --programs EF,EL`
  - **Sanitize-by-default**: emails rewritten to `{slug}+test@yourdomain.com` unless `--raw` flag is passed. `--raw` prints a warning: "Importing raw email addresses. Only use in production." Safe-by-default prevents accidental email sends to real coaches.
  - **This is how 35 real coaches get into the system for March 2.** Admin UI for coach management ships in Slice 3 (March 16).
  - FC provides the CSV; Amit provides the template (see workshop agenda pre-req)
  - **Git hygiene**: real CSV (with real emails) added to `.gitignore`. Only the template with example rows is committed.

#### 0.3 Shared Utilities

- [ ] Engagement state machine — `src/lib/engagement-state.ts`
  - `transitionEngagement(tx: Prisma.TransactionClient, engagementId, targetStatus, currentStatusVersion): Promise<{ newStatusVersion: number }>` — accepts transaction client so it composes inside existing transactions; **returns new statusVersion** so callers can chain transitions without stale version reads
  - Valid transitions: `INVITED→COACH_SELECTED`, `COACH_SELECTED→IN_PROGRESS`, `IN_PROGRESS→COMPLETED`, any→`CANCELED`/`ON_HOLD`
  - Updates `lastActivityAt` on every transition
  - Always checks `statusVersion` in WHERE clause (enforces optimistic locking in one place)
  - Throws `InvalidTransitionError` on invalid transition (with current + target status)
  - **Important**: when calling `transitionEngagement` twice in one transaction (e.g., `IN_PROGRESS` then `COMPLETED`), thread the returned `newStatusVersion` into the second call — never reuse the version from transaction start
- [ ] Validation schemas (Zod) — `src/lib/validations.ts`
  - `participantEmailSchema` — lowercase, trim, valid format
  - `participantAccessCodeSchema` — code format/length for participant auth
  - `sessionNoteSchema` — topics from `SESSION_TOPICS_BY_PROGRAM[programType]` (MLP has managerial competencies, ALP/EF/EL have executive competencies), outcomes from `SESSION_OUTCOMES`, duration from `DURATION_OPTIONS`
  - `csvRowSchema` — firstName, lastName, email, org, programTrack, programId, cohortCode, cohortStartDate (ISO date)
- [ ] Email client — `src/lib/email.ts`
  - Resend client wrapper (or AWS SES — **decision needed before Slice 1**)
  - `sendMagicLink(email, url)` — coach/admin auth (via Auth.js)
  - **Startup assertion**: crash if production SMTP credentials (Resend/SES/SendGrid) detected in non-production `NODE_ENV`. Prevents `.env` mix-ups from sending real emails. Pattern: `if (NODE_ENV !== 'production' && SMTP_HOST matches /resend|ses|sendgrid/) throw Error`
- [ ] Error classes — `src/lib/errors.ts`
  - `CoachAtCapacityError`, `CoachInactiveError`, `NoInvitedEngagementError`, `AllSessionsCompletedError`, `InvalidTransitionError`
  - Use `instanceof` checks in route handlers (not string comparison)
- [ ] ~~Structured logging~~ — **Deferred** (use `console.log`/`console.error` for MVP; add pino post-launch)
- [ ] ~~API response helpers~~ — **Deferred** (use `NextResponse.json()` directly; extract helpers when duplication appears)
- [ ] Rate limiting — use Vercel's built-in rate limiting or simple in-memory Map with TTL (not custom middleware)

#### 0.4 Environment + Docker

```env
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/franklincovey?connection_limit=20&pool_timeout=10"

# Auth
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000

# Participant Auth
ACCESS_CODE_SECRET= # HMAC-SHA256 key for participant access codes. Use crypto.createHmac('sha256', secret).update(code).digest('hex').

# Email
RESEND_API_KEY= # Or AWS SES credentials
EMAIL_FROM=noreply@franklincovey-coaching.com

# Cron
CRON_SECRET= # Shared secret for /api/cron/* endpoints

# Test endpoints (staging only — never set in production)
# On Vercel, NODE_ENV is always "production" — even on staging deployments.
# TEST_ENDPOINTS_ENABLED is the only safe discriminator between staging and production.
TEST_ENDPOINTS_ENABLED=   # Set to "true" in staging Vercel project only. Leave blank/absent in production.
TEST_ENDPOINTS_SECRET=    # Shared secret required as X-Test-Secret header on all /api/test/* requests.

# Monitoring
SENTRY_DSN=
LOG_LEVEL=info
```

- [ ] `Dockerfile` — **Post-launch (target: within 30 days of March 2)** — needed before FC AWS migration. Not required for Vercel launch. 3-stage build, non-root user.
- [ ] Create `docker-compose.yml` (PostgreSQL 16 + Mailpit) — `docker-compose.yml`
  - Mailpit: SMTP on port 1025, web UI on port 8025. Catches all non-production email.
  - **Note**: remove PgBouncer from local docker-compose — Supabase provides pooling in production; direct Postgres locally is simpler and matches actual prod topology
- [ ] Add `/api/health` endpoint — `src/app/api/health/route.ts`
  - Returns `{ status: "ok", version: process.env.npm_package_version }`
  - Database connectivity check (Prisma `$queryRaw('SELECT 1')`)

**Phase 0 Acceptance Criteria:**
- [ ] `npx prisma migrate dev` runs without errors
- [ ] `npx prisma db seed` populates all tables
- [ ] `docker compose up` starts PostgreSQL + PgBouncer locally
- [ ] `/api/health` returns 200 with database check passing
- [ ] All shared utilities have TypeScript types (no `any`)

---

### Slice 1: Coach Selector (Days 3-8) — Deadline: March 2

The critical path. 400 participants arrive on this date.

#### 1.1 Participant Email Auth (roster-matched)

> **⚠️ Decision 2026-02-24d:** Access codes de-scoped. MVP uses roster-matched email entry only.
> Reason: USPS cohort group-email workflow + FC sender restrictions make per-participant code delivery unworkable.
> Access-code tasks below are historical — do not implement unless explicitly re-approved.

**Flow:**

```
USPS welcome email
    → participant gets coach-selector link only (no access code)
    → participant opens /participant and enters their email address
    → POST /api/participant/auth/verify-email { email }
    → server checks email exists in Participant roster AND cohort window is open
    → server sets httpOnly session cookie
    → Redirect: /participant/select-coach (if no coach selected)
              OR /participant/confirmation (if coach already selected — flow ends at selection)
```

- [ ] Email verification endpoint — `src/app/api/participant/auth/verify-email/route.ts`
  - Input: `{ email: string }`
  - Normalize email (lowercase, trim)
  - Look up `Participant` by email — return `UNRECOGNIZED_EMAIL` if not found
  - Check cohort window not closed — return `WINDOW_CLOSED` if past end date
  - Rate limits: 10/IP/hour
  - On success: create session cookie (iron-session, `{ participantId, email }`), return `alreadySelected` if engagement is `COACH_SELECTED`
  - On failure: return specific error code (enumeration not a concern — roster is not a secret)

- [ ] Participant session middleware — `src/lib/participant-session.ts`
  - `iron-session` with httpOnly, secure, sameSite=lax cookie
  - Session data: `{ participantId, email, engagementId? }`
  - `getParticipantSession(req)` — returns session or null
  - `requireParticipantSession(req)` — returns session or 401

- [ ] Participant auth page — `src/app/participant/page.tsx` ✅ **DONE (frontend)**
  - Single email input, roster-matched
  - Error messages: UNRECOGNIZED_EMAIL, WINDOW_CLOSED, RATE_LIMITED
  - Redirect logic based on alreadySelected flag

**SpecFlow resolutions baked in:**
- Email not found → UNRECOGNIZED_EMAIL with friendly message (issue #6)
- Rate limiting → global IP rate limit (issue #16)
- Returning participant → check session cookie first, skip auth (issue #3)

~~**~~HISTORICAL (access-code tasks — do not implement)~~**~~
~~- Access-code generation + export utility (`scripts/generate-participant-access-codes.ts`)~~
~~- `VerificationCode` model and `codeHash` / `ACCESS_CODE_SECRET` (removed from schema)~~
~~- HMAC-SHA256 hashing + per-participant lockout (`failedAttempts`, `lockedUntil`)~~

#### 1.2 Coach Selection API

- [ ] List available coaches — `src/app/api/participant/coaches/route.ts`
  - `GET /api/participant/coaches` (no filter params — filters removed per Feb 17 workshop)
  - Requires participant session
  - Lookup participant's engagement → `programId` → coach panel via `CoachProgramPanel`
  - Query: `CoachProfile` where `active = true` AND on participant's program panel AND current engagement count < `maxEngagements`
  - Capacity count: `SELECT COUNT(*) FROM Engagement WHERE coachId = ? AND status IN ('COACH_SELECTED', 'IN_PROGRESS', 'ON_HOLD')`
  - ~~Apply filters (location, language, specialty, credential)~~ — **REMOVED** per Feb 17 workshop. Bio + video drive selection, not filters.
  - Capacity-weighted randomization: coaches with more remaining capacity are weighted higher (`Math.random()` weighted by `maxEngagements - activeCount`)
  - Return first 3 coaches with profile data (bio, photo, specialties, languages, location, credentials)
  - **Do NOT return `meetingBookingUrl`** — only exposed after coach is selected (prevent pre-selection booking)
  - Cache: 60s SWR (stale-while-revalidate)

- [ ] Remix coaches — `src/app/api/participant/coaches/remix/route.ts`
  - `POST /api/participant/coaches/remix { excludeIds: string[] }`
  - Same query as list, but exclude `excludeIds`
  - **Server-side remix tracking**: store `remixCount` in participant session (max 1)
  - Return 403 if remix already used
  - Return remaining eligible coaches (up to 3)

- [ ] Select coach — `src/app/api/participant/coaches/select/route.ts`
  - `POST /api/participant/coaches/select { coachId }`
  - Requires participant session
  - **SELECT FOR UPDATE transaction** to prevent race condition (issue #43) — locks only the target coach row, not the table:

```typescript
// Coach selection with row-level locking (reviewed 2026-02-14: SELECT FOR UPDATE replaces Serializable)
await prisma.$transaction(async (tx) => {
  // 1. Lock coach row + recheck capacity (server-side, not trusting client)
  const [coach] = await tx.$queryRaw<CoachProfile[]>`
    SELECT * FROM "CoachProfile" WHERE id = ${coachId} FOR UPDATE
  `
  if (!coach) throw new CoachInactiveError(coachId)
  if (!coach.active) throw new CoachInactiveError(coachId)

  const activeCount = await tx.engagement.count({
    where: { coachId, status: { in: ['COACH_SELECTED', 'IN_PROGRESS', 'ON_HOLD'] } }
  })
  if (activeCount >= coach.maxEngagements) {
    throw new CoachAtCapacityError(coachId)
  }

  // 2. Transition engagement INVITED → COACH_SELECTED
  const engagement = await tx.engagement.findFirstOrThrow({
    where: { participantId, status: 'INVITED' }
  }).catch(() => { throw new NoInvitedEngagementError(participantId) })

  await tx.engagement.update({
    where: { id: engagement.id, statusVersion: engagement.statusVersion },
    data: {
      coachId,
      status: 'COACH_SELECTED',
      statusVersion: { increment: 1 },
      coachSelectedAt: new Date(),
      lastActivityAt: new Date(),
    }
  })
}) // Default Read Committed isolation — FOR UPDATE handles the race condition
```

  - On `COACH_AT_CAPACITY`: return 409 with "Coach no longer available" + trigger coach grid refresh
  - On success: update participant session with `engagementId`, redirect to `/participant/confirmation` (participant flow ends here)

#### 1.3 Wire Frontend to Real Data

- [ ] Update `src/app/participant/select-coach/page.tsx`
  - Replace hardcoded 15-coach array with `useSWR('/api/participant/coaches')`
  - ~~Wire filter controls to API query params~~ — **REMOVED** per Feb 17 workshop. No participant-facing filters.
  - Wire "See Different Coaches" to `/api/participant/coaches/remix` (1 remix max, one-way door with confirmation warning)
  - Wire "Select Coach" to `/api/participant/coaches/select`
  - Add loading skeletons, error states, empty states
  - Handle "coach at capacity" error (refresh grid, show message)
  - Handle "zero coaches available" (show message + "we'll notify the team")

- [ ] Create zero-coaches notification — `src/lib/notifications.ts`
  - When zero coaches available: send email to ops team (Andrea + Kari)
  - Include: participant name, program, timestamp
  - **Hardcoded recipients for MVP** (configurable post-launch)

- [ ] Update coach selection confirmation page — `src/app/participant/confirmation/page.tsx`
  - **Participant flow ENDS at selection** (Feb 17 workshop decision). No engagement page, no session tracking for participants.
  - Confirmation page shows: selected coach name, bio, and `meetingBookingUrl` as "Book Your Session" button when available (tool-agnostic link, e.g., Calendly/Acuity). If missing, show coach-outreach fallback message.
  - "You're all set" messaging. Participant never returns to platform.
  - ~~`/participant/engagement` page~~ — **REMOVED** from participant flow. Participants don't track sessions; coaches do.

- ~~[ ] Update `src/app/participant/engagement/page.tsx`~~ — **REMOVED** per Feb 17 workshop.
  - ~~Replace hardcoded data with real engagement + coach data from API~~
  - ~~Show "Book Next Session" button with coach's `meetingBookingUrl` (opens new tab)~~
  - ~~Show engagement timeline (sessions logged, status)~~
  - **Participant flow ends at selection.** Engagement tracking is coach-only via `/coach/engagement`.

#### 1.4 Deploy Infrastructure

- [ ] Provision Supabase PostgreSQL project/environment (P0 confirmed Feb 18)
- [ ] Run `prisma migrate deploy` against production database
- [ ] Run seed script (4 programs, 35 coaches, 3 admins)
- [ ] Deploy to Vercel staging (Supabase env)
- [ ] Configure email provider (Resend / SES — **decision needed**; if Resend, use paid tier for launch window to avoid free-tier daily cap throttling)
- [ ] Set environment variables in production
- [ ] Test participant access-code flow end-to-end on staging
- [ ] Test coach selection end-to-end on staging
- [ ] Load test: ~60 concurrent participants hitting coach selector (first cohort; 400 total over 6 months)

**Slice 1 Acceptance Criteria:**
- [ ] Participant can visit coach-selector link, enter email + access code, verify, and land on coach selector
- [ ] Coach selector shows 3 capacity-weighted randomized coaches (no filters)
- [ ] Remix shows 3 different coaches (max 1 remix, one-way door with confirmation warning)
- [ ] Coach selection creates engagement with `COACH_SELECTED` status
- [ ] **Participant flow ends at selection**: confirmation page + scheduling link/fallback message. No engagement page.
- [ ] Capacity is enforced with configured per-coach limits (all pools locked at 20; count active statuses only)
- [ ] Zero coaches scenario shows appropriate message + notifies ops
- [ ] Returning participant with valid session skips auth → goes to confirmation (if coach already selected)
- [ ] Access-code brute force is rate-limited (attempt limit + lockout + IP throttling)
- [ ] All API responses identical for valid/invalid emails (no enumeration)

---

### Slice 2: Coach Engagement (Days 9-14) — Deadline: March 9

#### 2.1 Coach/Admin Auth (Auth.js Magic Links)

- [ ] `npm install next-auth@beta @auth/prisma-adapter`
- [ ] Auth.js configuration — `src/lib/auth.ts`
  - Prisma adapter for `User`, `Account`, `AuthSession`, `VerificationToken` models
  - Email provider (Resend) for magic links
  - 15-minute magic link expiry
  - `signIn` callback: reject if `User.active = false` or email not in `User` table
  - **Identical response for valid/invalid emails** (prevent enumeration)
  - Session strategy: `jwt` with 24-hour max lifetime
  - Custom 30-minute idle timeout: store `lastActivity` in JWT, check on each request

- [ ] Auth.js route handler — `src/app/api/auth/[...nextauth]/route.ts`
- [ ] Rate limiting for magic link requests — 3/email/hour + 10/IP/hour
- [ ] Magic link email template — `src/emails/magic-link.tsx`
  - FC branding, "Sign in to FranklinCovey Coaching" subject
  - 15-minute expiry note
  - "If you didn't request this, ignore this email"

- [ ] Auth middleware — `src/middleware.ts`
  - **Dual-auth routing**: participant routes (`/participant/*`) check iron-session cookie; coach/admin routes (`/coach/*`, `/admin/*`) check Auth.js JWT. Public routes (`/`, `/auth/*`, `/api/health`) skip auth entirely.
  - Protect `/coach/*` routes: require authenticated User with `role = COACH`
  - Protect `/admin/*` routes: require authenticated User with `role = ADMIN`
  - Check 30-minute idle timeout on each request (coach/admin only — participants get 30-day rolling session)
  - Redirect to `/auth/signin` if unauthenticated or expired (coach/admin)
  - Redirect to `/participant` if participant session expired (re-enter access code)

- [ ] Sign-in page — `src/app/auth/signin/page.tsx`
  - Email input with "Send magic link" button
  - "Check your email" confirmation screen
  - FC branding consistent with rest of app

#### 2.2 Session Logging API

**Resolution of SpecFlow issue #48/#49: Coach creates Session + logs notes in one step.**

> **Session statuses updated (Feb 18 clarification)**: Three statuses: (1) Session Completed, (2) Session forfeited - canceled within 24 hours, (3) Session forfeited - not taken advantage of. Session notes simplified to Topic Discussed + Session Outcome only. "Other" topic shows static note "Please email the coaching practice" (no free-text input).
>
> **Policy clarification (2026-02-18):** Session outcomes are coach-entered only. The system does **not** auto-forfeit, auto-close, or auto-expire Session 1 access based on May/cohort window deadlines in MVP.

- [ ] Create + log session — `src/app/api/coach/sessions/route.ts`
  - `POST /api/coach/sessions { engagementId, occurredAt, topicDiscussed, sessionOutcome, duration, privateNotes?, status }`
  - `status`: `COMPLETED`, `FORFEITED_CANCELLED` ("Session forfeited - canceled within 24 hours"), `FORFEITED_NOT_USED` ("Session forfeited - not taken advantage of")
  - Requires authenticated coach session
  - Verify coach owns this engagement (`Engagement.coachId = currentUser.coachProfile.id`)
  - **Transaction with unique constraint protection** for session number assignment (reviewed 2026-02-14: unique constraint replaces Serializable):

```typescript
// Session creation — @@unique([engagementId, sessionNumber]) prevents duplicates
// Retry once on unique violation (concurrent session creation is extremely rare — one coach per engagement)
await prisma.$transaction(async (tx) => {
  // 1. Count existing sessions
  const count = await tx.session.count({ where: { engagementId } })
  const sessionNumber = count + 1

  // 2. Check against totalSessions limit
  const engagement = await tx.engagement.findUniqueOrThrow({ where: { id: engagementId } })
  if (count >= engagement.totalSessions) {
    throw new AllSessionsCompletedError(engagementId)
  }

  // 3. Create session + note atomically
  const session = await tx.session.create({
    data: {
      engagementId,
      sessionNumber,
      occurredAt,
      completedAt: isDraft ? null : new Date(),
      status: isDraft ? 'SCHEDULED' : 'COMPLETED',
    }
  })
  await tx.sessionNote.create({
    data: {
      sessionId: session.id,
      topics,
      outcomes,
      duration,
      privateNotes,
      isDraft,
      submittedAt: isDraft ? null : new Date(),
    }
  })

  // 4. Transition engagement if first session (uses transitionEngagement helper)
  let currentStatusVersion = engagement.statusVersion
  if (count === 0 && engagement.status === 'COACH_SELECTED') {
    const { newStatusVersion } = await transitionEngagement(tx, engagementId, 'IN_PROGRESS', currentStatusVersion)
    currentStatusVersion = newStatusVersion
  }

  // 5. Auto-complete engagement if all sessions done
  // Thread currentStatusVersion from step 4 — do NOT reuse engagement.statusVersion here;
  // step 4 may have already incremented it and the optimistic lock check would fail.
  if (sessionNumber === engagement.totalSessions && !isDraft) {
    await transitionEngagement(tx, engagementId, 'COMPLETED', currentStatusVersion)
  }

  return session
}) // Default isolation — @@unique constraint handles race condition
```

  - On `ALL_SESSIONS_COMPLETED`: return 409 with "All sessions already logged"

- [ ] Update session note (auto-save) — `src/app/api/coach/sessions/[id]/route.ts`
  - `PATCH /api/coach/sessions/:id { topics?, outcomes?, duration?, privateNotes?, isDraft? }`
  - Verify coach owns engagement
  - Update `SessionNote` fields
  - If `isDraft` changes from `true` to `false`: set `submittedAt`, update `Session.completedAt`
  - Debounce handled client-side (2s); server processes each save independently

- [ ] List sessions for engagement — `src/app/api/coach/engagements/[id]/sessions/route.ts`
  - `GET /api/coach/engagements/:id/sessions`
  - Returns all sessions with notes (excluding `privateNotes` if admin is requesting)
  - Include previous session's notes for "context panel" (session N-1)

- [ ] Coach engagement list — `src/app/api/coach/engagements/route.ts`
  - `GET /api/coach/engagements?status=ACTIVE|COMPLETED`
  - Returns engagements for current coach with participant info
  - Include session count, last session date, engagement status

- [ ] Coach dashboard stats — `src/app/api/coach/dashboard/route.ts`
  - `GET /api/coach/dashboard`
  - Active engagements count, sessions this week, completion rate
  - Upcoming sessions (by `occurredAt` in future, if any scheduled)
  - "Needs attention" list (engagements with no session logged in 14+ days)

#### 2.3 Wire Coach Frontend

- [ ] Update `src/app/coach/dashboard/page.tsx`
  - Replace hardcoded data with `useSWR('/api/coach/dashboard')` + `/api/coach/engagements`
  - Wire tabs (Active/Completed) to API query params
  - Real-time stats from dashboard API

- [ ] Update `src/app/coach/engagement/page.tsx`
  - Replace hardcoded data with real engagement + session data
  - Implement "Log Session" form:
    - Date picker for `occurredAt` (default: today)
    - Topic dropdown (from `SESSION_TOPICS_BY_PROGRAM` — shows managerial or executive competencies based on participant's program) and outcome dropdown (from `SESSION_OUTCOMES`)
    - Duration dropdown (from `DURATION_OPTIONS`)
    - Private notes textarea
    - Auto-save with 2s debounce (PATCH endpoint)
    - "Save Draft" and "Submit" buttons
  - Previous session context panel (read-only, shows session N-1 notes)
  - "Book Next Session" button → opens `meetingBookingUrl` in new tab
  - Engagement timeline showing all sessions

**Slice 2 Acceptance Criteria:**
- [ ] Coach can sign in via magic link email
- [ ] Coach dashboard shows real engagement data and stats
- [ ] Coach can log a session with structured dropdowns (topics, outcomes, duration)
- [ ] Session notes auto-save as draft (2s debounce)
- [ ] First session log transitions engagement to `IN_PROGRESS`
- [ ] Final session log transitions engagement to `COMPLETED`
- [ ] Coach cannot log more sessions than `totalSessions`
- [ ] Private notes are not visible in admin API responses
- [ ] 30-minute idle timeout enforced (auto-save preserves work)
- [ ] Session number auto-increments correctly under concurrent access

---

### Slice 3: Admin Portal (Days 15-22) — Deadline: March 16

#### 3.1 Admin Dashboard APIs

- [ ] KPI endpoint — `src/app/api/admin/dashboard/kpis/route.ts`
  - `GET /api/admin/dashboard/kpis?programId=`
  - Returns: total engagements, in-progress, needs-attention, completed, canceled
  - "Needs attention" = no session logged in 14+ days OR no coach selected in 7+ days
  - **Cached 60s** via Next.js `unstable_cache` with `revalidate: 60`
  - Optional `programId` filter (soft multi-program)

- [ ] Engagement table — `src/app/api/admin/engagements/route.ts`
  - `GET /api/admin/engagements?status=&coachId=&programTrack=&programId=&search=&page=&sort=`
  - Paginated (10 per page), sortable by any column
  - Search across participant name + email + coach name
  - Filter by: status, coach, program track, program
  - Include: participant name/email, coach name, status, session count, last activity
  - **Exclude `privateNotes` from all session data**

- [ ] Executive summary — `src/app/api/admin/dashboard/executive/route.ts`
  - `GET /api/admin/dashboard/executive?programId=`
  - Aggregated metrics for Kari/Greg:
    - Overall completion rate (%)
    - Average sessions per engagement
    - Coach utilization (active engagements / max capacity, per coach)
    - Program health by program (if programId not specified)
    - Engagement velocity (avg days from INVITED → COMPLETED)
  - Cached 60s

- [ ] Coach roster — `src/app/api/admin/coaches/route.ts`
  - `GET /api/admin/coaches` — list all coaches with capacity info
  - `PATCH /api/admin/coaches/:id` — update coach profile (maxEngagements, active status)
  - Includes: computed `currentEngagements` count per coach

#### 3.2 Bulk Import

- [ ] CSV upload + validation — `src/app/api/admin/import/route.ts`
  - `POST /api/admin/import` with `multipart/form-data`
  - Parse CSV (detect encoding: UTF-8, Windows-1252)
  - Validate each row against `csvRowSchema`:
    - `firstName`, `lastName`: required, non-empty
    - `email`: valid format, lowercase, trim
    - `org`: required
    - `programTrack`: must be `TWO_SESSION` or `FIVE_SESSION`
    - `programId`: must match existing `Program.id`
    - `cohortCode`: required (e.g., `ALP-135`, `MLP-80`, `EF-1`, `EL-1`)
    - `cohortStartDate`: required ISO date; used as Day 0 for nudge timing
  - Check for duplicate emails within CSV
  - Check for existing participants (by email) — skip or error (configurable)
  - Return validation results with row-level errors
  - **CSV injection prevention**: strip leading `=`, `+`, `-`, `@` from all text fields

- [ ] Import validation — generates a batch token on success
  - Validation endpoint returns `{ batchToken: string, rows: ValidatedRow[], errors: RowError[] }` on success
  - `batchToken` is a short-lived server-side token (stored in a `ImportBatch` table or signed JWT, expires in 1 hour) that references the validated rows
  - Token prevents double-submit: executing the same batch token twice returns `{ created: 0, skipped: N, alreadyExecuted: true }` rather than creating duplicates
- [ ] Import execution — `src/app/api/admin/import/execute/route.ts`
  - `POST /api/admin/import/execute { batchToken: string }` — **not** the raw rows; token is consumed server-side
  - Check `batchToken` status: if already executed, return idempotency response immediately
  - Mark token as `EXECUTING` before transaction begins (prevents concurrent double-submit)
  - **Phase A**: Atomic transaction — create all `Participant` + `Engagement` records
    - Engagement created with `status: INVITED`, `coachId: null`, `totalSessions` from `programTrack`, `cohortStartDate` from CSV
    - Transaction timeout: 30s (fail-safe for large imports)
  - **Phase B**: Access-code export package — generate USPS-ready communication payload
    - Build export with participant email + cohort + access code + selection window
    - No participant email send from system in MVP
    - Mark package timestamp for ops auditability
  - Mark token as `EXECUTED` on success
  - Return: `{ created: number, skipped: number, exportGenerated: boolean, exportPath?: string, alreadyExecuted?: boolean }`

#### 3.3 Needs-Attention Workflow (Manual Reminders in MVP)

> **Decision lock (2026-02-24):** participant reminders are manual in MVP (USPS + FC Ops). System does not send participant reminder emails and does not auto-assign coaches in MVP.

- [ ] Needs-attention flag endpoint — `src/app/api/cron/nudges/route.ts`
  - `POST /api/cron/nudges` with `Authorization: Bearer {CRON_SECRET}`
  - Runs idempotent checks and creates/updates dashboard flags only
  - No participant reminders, no participant assignment side effects

- [ ] Flag rules for MVP:
  - **ALP/MLP selection-window attention**: participant remains `INVITED` at selection-window close
  - **ALP/MLP use-it-or-lose-it attention**: Session 1/2 not scheduled by cohort deadline (dashboard flag only; no auto-forfeit mutation)
  - **COACH_ATTENTION**: `IN_PROGRESS` engagement with stale session logging
  - **OPS_ESCALATION**: engagement exceeds defined attention threshold without owner action
  - **EF/EL exception**: do not apply ALP/MLP deadline-based use-it-or-lose-it flag logic to EF/EL

- [ ] Dashboard "Needs Attention" integration — wire into admin KPI endpoint (3.1)
  - `NudgeLog` (or equivalent flag table) surfaces in Ops dashboard "Needs Attention" tab
  - Group by actionable categories (selection overdue, session status missing, stalled coach updates, escalations)
  - Coach dashboard shows a "Needs Attention" indicator for that coach's engagements

- [ ] Optional ops alert emails
  - System may email FC Ops for escalation-only events (if enabled)
  - Participant reminder sends remain outside system scope in MVP

#### 3.4 CSV Export + Printable Reports

- [ ] Streaming CSV export — `src/app/api/export/route.ts`
  - `GET /api/export?status=&coachId=&programId=&format=csv`
  - Server-side streaming (ReadableStream)
  - Columns: participant name, email, org, coach name, status, session count, program track, last activity
  - **Exclude `privateNotes`** (coach-only data)
  - **CSV injection prevention** on output (prefix with `'` for formula-starting cells)
  - Filename: `franklincovey-engagements-YYYY-MM-DD.csv`

- [ ] Printable client reports (added 2026-02-13 — proposal requirement)
  - `@media print` CSS for dashboard views and engagement summary — `src/app/globals.css`
    - Hide navigation, sidebars, interactive controls in print mode
    - Optimize layout for A4/Letter paper (single column, appropriate margins)
    - FC logo header + report date in print header
  - Print-friendly engagement summary page — `src/app/admin/engagements/[id]/print/page.tsx`
    - Participant info, coach info, session history with notes (excluding privateNotes), status timeline
    - "Print Report" button on engagement detail page triggers `window.print()`
  - Print-friendly dashboard summary — print styles on `src/app/admin/dashboard/page.tsx`
    - KPI cards, engagement table (current page), status distribution
  - **No PDF generation library needed** — browser print-to-PDF covers the requirement

#### 3.5 Wire Admin Frontend

- [ ] Update `src/app/admin/dashboard/page.tsx`
  - Replace hardcoded KPI data with `useSWR('/api/admin/dashboard/kpis')`
  - Replace hardcoded engagement table with real data + pagination
  - Wire filter controls to API query params
  - Add "Needs Attention" tab with real data

- [ ] Create executive summary view — `src/app/admin/dashboard/executive/page.tsx` (or tab)
  - Aggregated metrics: completion rate, coach utilization, engagement velocity
  - Per-program breakdown (when multi-program UI ships)
  - Accessible via tab toggle on admin dashboard

- [ ] Update `src/app/admin/coaches/page.tsx`
  - Replace hardcoded data with real coach roster
  - Show current/max engagement capacity per coach
  - Allow editing `maxEngagements` and `active` status
  - Search/filter for 35 coaches

- [ ] Update `src/app/admin/import/page.tsx`
  - Wire CSV upload to validation API
  - Show validation results with row-level errors
  - Preview table (paginated, max 50 rows shown)
  - "Import" button → execute API
  - Progress indicator + results summary
  - "Retry failed emails" button

**Slice 3 Acceptance Criteria:**
- [ ] Admin dashboard shows real KPI data cached at 60s
- [ ] "Needs Attention" as default dashboard view (top of page)
- [ ] Engagement table paginates, sorts, and filters correctly (by status + coach for MVP)
- [ ] Executive summary shows aggregated metrics (completion rate, coach utilization)
- [ ] Bulk import validates CSV, creates participants + engagements atomically, and generates access-code export package for USPS communications
- [ ] Dashboard flags set for all configured needs-attention types (selection overdue, attention, escalation)
- [ ] "Needs Attention" tab in ops dashboard shows flagged engagements grouped by type
- [ ] Coach dashboard shows "Needs Attention" indicator for their own stalled engagements
- [ ] Concurrent cron runs are prevented via timestamp guard
- [ ] CSV export streams correctly, excludes private notes
- [ ] Engagement summary and dashboard views are print-friendly (browser print-to-PDF, `@media print` CSS)
- [ ] All admin routes require admin auth

---

## Alternative Approaches Considered

### 1. System-Sent OTP Auth
- Generic participant URL + system-sent OTP email
- **Rejected for MVP**: Participant communications are USPS-owned; participant auth uses USPS-delivered access codes instead.

### 2. Backend-First Foundation
- Build entire backend before wiring frontend
- **Rejected**: Nothing shippable until week 3. March 2 deadline requires Slice 1 to be independently deployable.

### 3. Separate Backend Service
- Dedicated Express/Fastify API, separate repo
- **Rejected**: Adds deployment complexity and cross-repo coordination. Next.js API routes are sufficient for this scale (35 coaches, 400 participants).

### 4. Three Separate Dashboards
- Purpose-built views for Ops, Kari, and Greg
- **Rejected**: 3x build effort. Ops dashboard + executive summary covers 90% of needs. Individual views can evolve post-launch.

---

## Acceptance Criteria

### Functional Requirements

- [ ] ~60 participants (first cohort) can authenticate via USPS-delivered coach-selector link + email + access code
- [ ] Participants see 3 capacity-weighted randomized coaches (no filters), select one, and receive scheduling link/fallback message
- [ ] Coaches can sign in via magic link and log structured sessions
- [ ] Session logging enforces program track limits (2 or 5 sessions)
- [ ] Admins can view KPIs, manage engagements, import participants, and manage coaches
- [ ] Participant reminders are manual by USPS/FC Ops; system provides "Needs Attention" visibility and ops escalation support
- [ ] CSV export works with all filters applied

### Non-Functional Requirements

- [ ] Access-code brute force protected (rate limiting + lockout)
- [ ] Coach/admin sessions timeout after 30 minutes idle
- [ ] Private notes excluded from all admin-facing API responses
- [ ] All database writes use transactions (no partial state)
- [ ] KPI queries cached at 60s (no expensive aggregation on every load)
- [ ] CSV import handles 400 rows in <30s
- [ ] System handles ~60 concurrent users on coach selector (first cohort)

### Quality Gates

- [ ] All API routes have Zod validation on inputs
- [ ] All mutations use transactions with default isolation (SELECT FOR UPDATE or unique constraints for race conditions — no Serializable)
- [ ] Prisma schema matches ERD above (no drift)
- [ ] Environment variables documented in `.env.example`
- [ ] Health endpoint verifies database connectivity
- [ ] Console logging on all API routes (structured logging deferred to post-launch)

### Testing Strategy

Minimal but targeted — cover the flows where bugs cause the most damage:

**Slice 1 (must-have before March 2):**
- [ ] Access-code verify API routes — unit tests covering: valid email/code, unknown email (identical response), expired code, lockout, rate limiting
- [ ] Coach selection API — unit tests covering: capacity enforcement, race condition (two concurrent selects for last slot), inactive coach rejection, filter combinations
- [ ] Engagement state machine — unit tests for all valid transitions + rejection of invalid transitions

**Slice 2:**
- [ ] Session logging — unit tests for: session number auto-increment, totalSessions limit, draft→submit transition, private notes exclusion from admin responses

**Slice 3:**
- [ ] Bulk import — unit test for: duplicate email handling, Phase A rollback on failure, CSV validation edge cases, access-code export generation
- [ ] Needs-attention cron — unit test for: cooldown enforcement, idempotency, correct flag types set for ALP/MLP deadlines and EF/EL exceptions

**Tooling:** Vitest (already compatible with Next.js 15) for unit tests.

**E2E / QA: Fully Automated via Claude in Chrome**

> **Goal**: Zero manual QA. Claude in Chrome validates every critical user flow end-to-end on staging before each deployment. Automated test runs produce GIF recordings and pass/fail verdicts for each scenario.

#### Test Infrastructure

**Test Helper Endpoints** (guarded by `TEST_ENDPOINTS_ENABLED=true` + `X-Test-Secret` header):

> **Why not `NODE_ENV`?** On Vercel, `NODE_ENV` is always `"production"` in all deployed environments — including staging. Using `NODE_ENV !== "production"` as the guard would disable test endpoints on staging (breaking E2E tests) or require mis-configuring the env var. Use `TEST_ENDPOINTS_ENABLED=true` (set only in the staging Vercel project) combined with a shared `X-Test-Secret` header check to ensure the endpoints are never reachable in production.

- [ ] `GET /api/test/latest-access-code?email=` — returns current test access code metadata for a participant — `src/app/api/test/latest-access-code/route.ts`
  - Returns code metadata or 404 if none exists
  - **Production guard**: check `process.env.TEST_ENDPOINTS_ENABLED !== 'true'` → return 404. Also verify `X-Test-Secret` header matches `process.env.TEST_ENDPOINTS_SECRET`.
- [ ] `GET /api/test/latest-magic-link?email=` — returns latest magic link URL — `src/app/api/test/latest-magic-link/route.ts`
  - Returns `{ url: "https://...", expiresAt: "..." }` or 404
  - Reads from Auth.js `VerificationToken` table
- [ ] `POST /api/test/reset` — resets test data to seed state — `src/app/api/test/reset/route.ts`
  - Deletes all `VerificationCode`, `NudgeLog`, `SessionNote`, `Session` records for test participants/coaches
  - Re-creates test engagements at `INVITED` status
  - Does NOT touch real coach/admin data (scoped to `@test.franklincovey.com` emails)
  - Returns `{ reset: true, cleaned: { verificationCodes: N, sessions: N, ... } }`
- [ ] `GET /api/test/engagement?participantEmail=` — returns current engagement state for inspection — `src/app/api/test/engagement/route.ts`

**Local Dev Email**: Mailpit (`docker-compose.yml` already includes it) — web UI at `localhost:8025` for visual email verification during development. Claude in Chrome can browse Mailpit UI to verify email content/formatting.

**Test Seed Data** (added to `prisma/seed.ts`):

| Entity | Test Email | Purpose |
|--------|-----------|---------|
| Participant (new) | `alice@test.franklincovey.com` | Happy path — has `INVITED` engagement, 5-session track |
| Participant (returning) | `bob@test.franklincovey.com` | Already selected a coach — engagement at `COACH_SELECTED` |
| Participant (completed) | `carol@test.franklincovey.com` | All sessions done — engagement at `COMPLETED` |
| Participant (unknown) | `unknown@test.franklincovey.com` | Not in Participant table — tests enumeration prevention |
| Coach | `coach1@test.franklincovey.com` | Active, capacity 2, 1 current engagement |
| Coach (full) | `coach2@test.franklincovey.com` | Active, capacity 1, 1 current engagement (at max) |
| Coach (inactive) | `coach3@test.franklincovey.com` | `active: false` — should never appear in selection |
| Admin | `admin@test.franklincovey.com` | Admin user for portal tests |

#### Test Suites

---

**Suite 1: Participant Access-Code Auth** (Slice 1 — run before March 2)

| # | Scenario | Steps | Pass Criteria |
|---|----------|-------|---------------|
| 1.1 | Happy path access code | 1. Navigate to `/participant` 2. Enter `alice@test.franklincovey.com` 3. Enter valid access code from test fixture 4. Submit | Redirects to `/participant/select-coach`. Session cookie is set. Page shows coach cards. |
| 1.2 | Unknown email (no enumeration) | 1. Navigate to `/participant` 2. Enter `unknown@test.franklincovey.com` + any code 3. Submit | Generic invalid/expired response. No detail leak, no timing side-channel > ±500ms. |
| 1.3 | Expired code | 1. Use expired access code for `alice@...` 2. Submit | "Invalid or expired code" message appears. |
| 1.4 | Wrong code × 3 (lockout) | 1. Enter invalid code three times | After 3rd attempt: lockout message shown; attempts blocked for cooldown interval. |
| 1.5 | Ops reset code | 1. Invalidate participant code 2. Generate reset code via ops/test utility 3. Retry login with new code | New code works and old code is rejected. |
| 1.6 | Returning participant (session valid) | 1. Complete 1.1 (get session cookie) 2. Close tab 3. Navigate to `/participant` again | Skips auth form. Redirects directly to `/participant/select-coach` or `/participant/confirmation` based on engagement state. |
| 1.7 | Invalid email format | 1. Enter `not-an-email` 2. Submit | Client-side validation prevents submission. No API call made (verify via network tab or console). |

**Recording**: GIF of scenarios 1.1 and 1.4 for stakeholder review.

---

**Suite 2: Coach Selection** (Slice 1 — run before March 2)

| # | Scenario | Steps | Pass Criteria |
|---|----------|-------|---------------|
| 2.1 | View coaches | 1. Auth as `alice@test...` (Suite 1.1) 2. Land on `/participant/select-coach` | Exactly 3 coach cards displayed. Each card shows: name, bio, photo, specialties, languages, location, credentials. `meetingBookingUrl` NOT visible (verify DOM). |
| 2.2 | No participant filters in MVP | 1. Load `/participant/select-coach` 2. Inspect UI controls | No participant-facing filter controls are shown in MVP. |
| 2.3 | Remix coaches | 1. Click "See Different Coaches" 2. Observe new coaches | 3 different coach cards appear (none from previous set). "See Different Coaches" button changes to disabled or shows "No more remixes." |
| 2.4 | Second remix blocked | 1. After 2.3, try remix again | Button disabled or returns error. Text: "You've already refreshed your coach options." |
| 2.5 | Select coach (happy path) | 1. Click "Select Coach" on a coach card 2. Confirm selection (if confirmation dialog exists) | Redirects to `/participant/confirmation`. Page shows selected coach details + booking link/fallback message. Verify engagement status via `/api/test/engagement`: `status = COACH_SELECTED`. |
| 2.6 | Coach at capacity | 1. Auth as `alice@test...` 2. Select `coach2@test...` (full capacity) | Error message: "This coach is no longer available." Coach card refreshes or disappears. Other coaches still selectable. |
| 2.7 | Zero coaches available | 1. Set all test coaches to inactive/full (via test endpoint or pre-configured seed state) 2. Load coach selector | Message: "No coaches are currently available. We'll notify the team." Verify ops notification is created (check via test endpoint or admin dashboard). |
| 2.8 | Already selected (re-visit) | 1. Auth as `bob@test...` (already has coach) 2. Navigate to `/participant/select-coach` | Redirects to `/participant/confirmation` (not back to selection). |

**Recording**: GIF of scenario 2.5 (full selection flow) and 2.6 (capacity error).

---

**Suite 3: Coach Auth + Session Logging** (Slice 2 — run before March 9)

| # | Scenario | Steps | Pass Criteria |
|---|----------|-------|---------------|
| 3.1 | Coach magic link auth | 1. Navigate to `/auth/signin` 2. Enter `coach1@test.franklincovey.com` 3. Call `/api/test/latest-magic-link?email=coach1@test...` 4. Navigate to magic link URL | Redirects to `/coach/dashboard`. Dashboard shows coach's engagements. |
| 3.2 | Coach dashboard data | 1. Auth as coach1 (3.1) 2. Read dashboard | Shows: active engagements count, sessions this week, "Needs Attention" items (if any). Engagement list shows participant names, status, session count. |
| 3.3 | Log first session | 1. Auth as coach1 2. Click engagement with `bob@test...` (status: `COACH_SELECTED`) 3. Click "Log Session" 4. Set `occurredAt` to today 5. Select topics from dropdown 6. Select outcomes from dropdown 7. Select duration 8. Enter private notes 9. Click "Submit" | Session appears in timeline with session #1. Engagement status transitions to `IN_PROGRESS` (verify via `/api/test/engagement?participantEmail=bob@test...`). |
| 3.4 | Auto-save draft | 1. Start logging a session 2. Fill in topics only 3. Wait 3 seconds (debounce) 4. Navigate away 5. Return to engagement | Draft session preserved. Previously entered topics still present. "Draft" badge visible. |
| 3.5 | Session limit enforcement | 1. Use test participant with 2-session track at session 2 of 2 2. Log session #2 (submit, not draft) 3. Try to create session #3 | Session #2 saves. Engagement transitions to `COMPLETED`. "Log Session" button disappears or shows "All sessions completed." Attempting to create session #3 returns 409. |
| 3.6 | Private notes exclusion | 1. Log session with private notes as coach 2. Check admin API response for same session | Private notes visible in coach view. Private notes NOT present in admin engagement detail (verify via `/api/admin/engagements/{id}` — check response JSON). |
| 3.7 | Coach idle timeout | 1. Auth as coach 2. Wait 31 minutes (or mock timeout via test endpoint) 3. Click any link | Redirected to `/auth/signin`. Session expired message shown. |

**Recording**: GIF of scenario 3.3 (full session logging flow).

---

**Suite 4: Admin Portal** (Slice 3 — run before March 16)

| # | Scenario | Steps | Pass Criteria |
|---|----------|-------|---------------|
| 4.1 | Admin auth | 1. Navigate to `/auth/signin` 2. Enter `admin@test.franklincovey.com` 3. Use magic link (via test endpoint) | Redirects to `/admin/dashboard`. |
| 4.2 | Dashboard KPIs | 1. Auth as admin 2. Read dashboard | KPI cards present: total engagements, in-progress, needs-attention, completed, canceled. Values match test seed data counts. |
| 4.3 | Engagement table pagination | 1. View engagement table 2. Click page 2 (if >10 engagements) 3. Sort by "Last Activity" descending 4. Filter by status "IN_PROGRESS" | Table re-renders correctly. Sorted column shows correct order. Filter reduces rows. Search works across participant + coach names. |
| 4.4 | CSV import — happy path | 1. Navigate to `/admin/import` 2. Upload valid test CSV (3 rows: firstName, lastName, email, org, programTrack, programId) 3. Review validation preview 4. Click "Import" | Validation shows 3 valid rows, 0 errors. After import: success message with counts. New participants appear in engagement table (verify via `/api/admin/engagements`). |
| 4.5 | CSV import — validation errors | 1. Upload CSV with: missing email (row 2), invalid programTrack (row 3), duplicate email (row 4) 2. Review validation | Row-level errors displayed: row 2 "email required", row 3 "invalid program track", row 4 "duplicate email." Valid rows still importable. |
| 4.6 | CSV import — duplicate participant | 1. Upload CSV with email of existing participant 2. Review validation | Warning: "Participant already exists" with option to skip. Import proceeds for new rows only. |
| 4.7 | CSV export | 1. Apply filters on engagement table 2. Click "Export CSV" 3. Download file 4. Inspect contents | CSV downloads with correct filename (`franklincovey-engagements-YYYY-MM-DD.csv`). Columns match table. Filters applied. `privateNotes` column absent. No CSV injection (`=`, `+`, `-`, `@` prefixed with `'`). |
| 4.8 | Executive summary | 1. Navigate to executive summary tab/page 2. Read metrics | Shows: completion rate (%), avg sessions/engagement, coach utilization chart, engagement velocity. Values are plausible given seed data. |
| 4.9 | Needs Attention tab | 1. Trigger nudge cron (via `POST /api/cron/nudges` with CRON_SECRET) 2. Navigate to "Needs Attention" tab | Flagged engagements grouped by type: stalled participants (7+ days), coach attention (14+ days), escalation (21+ days). Counts match overdue seed data. |
| 4.10 | Coach roster management | 1. Navigate to `/admin/coaches` 2. Find coach with 1/2 capacity 3. Change `maxEngagements` to 1 4. Verify coach now shows as "full" | Capacity updates immediately. Coach no longer appears in participant coach selection (verify via Suite 2.6 logic). |
| 4.11 | Print engagement report | 1. Navigate to engagement detail 2. Click "Print Report" 3. Verify print preview (screenshot) | Print layout: single column, no sidebar/nav, FC logo header, participant info, coach info, session history (no private notes), status timeline. Readable on A4/Letter. |

**Recording**: GIF of scenario 4.4 (CSV import flow) and 4.9 (needs attention flags).

---

**Suite 5: Cross-Cutting Concerns**

| # | Scenario | Steps | Pass Criteria |
|---|----------|-------|---------------|
| 5.1 | Unauthorized access — participant routes | 1. Clear all cookies 2. Navigate to `/participant/select-coach` | Redirects to `/participant` (auth entry point). |
| 5.2 | Unauthorized access — coach routes | 1. Clear all cookies 2. Navigate to `/coach/dashboard` | Redirects to `/auth/signin`. |
| 5.3 | Unauthorized access — admin routes | 1. Auth as coach 2. Navigate to `/admin/dashboard` | 403 or redirect to `/auth/signin`. Coach cannot access admin routes. |
| 5.4 | Role boundary — coach accessing admin API | 1. Auth as coach 2. Fetch `/api/admin/dashboard/kpis` | Returns 403 Forbidden. |
| 5.5 | Health endpoint | 1. Fetch `/api/health` | Returns `{ status: "ok" }` with 200. Database connectivity verified. |
| 5.6 | Rate limiting — access-code brute force | 1. Submit repeated invalid access-code attempts from same IP | Requests are throttled and lockout is enforced. |

---

#### Execution Model

**When to run:**
- **Pre-deployment gate**: Full suite runs against staging after `prisma migrate deploy` and before DNS cutover
- **Per-slice gate**: Only run suites relevant to the slice being deployed (Suite 1+2+5 for Slice 1, add Suite 3 for Slice 2, full suite for Slice 3)
- **Regression on redeploy**: Full suite on any hotfix or schema change

**How to run** (Claude in Chrome operator workflow):
1. Open staging URL in Chrome with Claude in Chrome extension active
2. Call `/api/test/reset` to restore seed state
3. Execute suites sequentially (1 → 2 → 3 → 4 → 5) — each suite assumes prior suite's seed state
4. Record GIFs for key flows (marked above with "Recording" notes)
5. Report pass/fail verdict per scenario with screenshots of any failures

**Test run duration estimate**: ~30-45 minutes for full suite (Claude in Chrome navigates, fills forms, verifies results at human-like speed).

**Failure handling**: On any failure, Claude captures screenshot + console logs, marks scenario as FAIL, continues remaining scenarios, and produces a summary report with:
- Total: X/Y passed
- Failed scenarios with screenshot evidence
- Suggested root cause (based on error messages / page content)

#### Test Data Lifecycle

```
seed.ts (initial state)
    → Suite 1 (creates verification codes, sets sessions)
    → Suite 2 (selects coaches, changes engagement status)
    → Suite 3 (logs sessions, transitions engagements)
    → Suite 4 (imports participants, sets nudge flags)
    → /api/test/reset (returns to seed state for next run)
```

Suites are designed to run **in order** — each suite builds on state created by previous suites. Suite 2 needs the participant authenticated in Suite 1. Suite 3 needs a coach-selected engagement from Suite 2. The `/api/test/reset` endpoint is called only at the start of a full run, not between suites.

#### Implementation Checklist

- [ ] Create `/api/test/latest-access-code` endpoint — `src/app/api/test/latest-access-code/route.ts`
- [ ] Create `/api/test/latest-magic-link` endpoint — `src/app/api/test/latest-magic-link/route.ts`
- [ ] Create `/api/test/reset` endpoint — `src/app/api/test/reset/route.ts`
- [ ] Create `/api/test/engagement` endpoint — `src/app/api/test/engagement/route.ts`
- [ ] Add production guard middleware for `/api/test/*` routes — `src/middleware.ts`
  - Guard: `TEST_ENDPOINTS_ENABLED !== 'true'` → return 404 (do NOT use `NODE_ENV` — always `"production"` on Vercel)
  - Secondary: require `X-Test-Secret` header to match `TEST_ENDPOINTS_SECRET` env var
- [ ] Add test seed data to `prisma/seed.ts` (8 test entities above)
- [ ] Add Mailpit to `docker-compose.yml` for local email inspection
- [ ] Document test execution runbook in `docs/qa/automated-testing-runbook.md`

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Coach selector uptime on March 2 | 99.9% | Health endpoint monitoring |
| Participant auth success rate | >95% | Access-code verify success / total attempts |
| Time to select coach | <3 minutes | `coachSelectedAt` - session start |
| Session logging completion | >90% of sessions logged within 48h | `Session.completedAt` vs `occurredAt` |
| Nudge flag coverage | 100% overdue engagements flagged within 24h | Cron run logs + NudgeLog count vs overdue query |
| Admin dashboard load time | <2s | Server-side metric (cached KPIs) |

---

## Dependencies & Prerequisites

### Must Resolve Before Slice 1 (status as of Feb 18)

| Decision | Options | Impact |
|----------|---------|--------|
| **Email provider** | Resend (recommend paid tier at launch) vs AWS SES | Coach/admin magic-link emails depend on this; free-tier daily caps may throttle busy days |
| **Cloud provider** | **Resolved: Vercel + Supabase (confirmed 2026-02-18)** | MVP hosting and database target locked; remove infra ambiguity |
| **Domain / DNS** | Who manages? What subdomain? | Deployment URL, email sender domain |
| **Real coach data entry** | Admin CSV upload vs manual entry vs seed script | 35 coaches need real bios, photos, and booking URLs before March 2 (video is de-scoped for MVP). Seed script only covers dev data. Options: (a) FC provides a CSV and we import via a one-off script, (b) build a minimal coach profile edit form in admin portal (pulls Slice 3 work forward), or (c) Kari/Andrea enter data directly in the database via a simple admin form. **Recommend option (a)** — CSV from FC ops, imported with a script. |
| **Blocking decision turnaround** | **Resolved: FC 24-hour owner through Mar 16 (confirmed 2026-02-18)** | Protects critical path when implementation questions arise |
| **Contract status** | **Resolved: signed (confirmed 2026-02-18)** | Removes pre-launch legal/commercial execution risk |
| **Participant counts by cohort** | Baseline confirmed at 400; per-cohort allocations pending final file lock | Required to validate capacity assumptions and overlap load (all coach capacity locked at 20) |

### Must Resolve Before Slice 3 (by March 9)

| Decision | Options | Impact |
|----------|---------|--------|
| **Session window reporting rule** | Display-only deadline tracking vs hide from MVP | Affects dashboard messaging only; does not trigger automatic session status updates |
| **Manual reminder tracking fields** | Track in system vs track externally | Ops execution transparency across cohorts |
| **Executive summary scope** | What metrics matter to Kari vs Greg? | Dashboard content |
| **Import duplicate handling** | Skip existing vs error on duplicate | CSV import behavior |

---

## Risk Analysis & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Email provider DPA not signed by March 2 | Medium | Medium — coach/admin auth delays | Start with Resend trial, fallback to AWS SES |
| Resend free-tier daily cap throttles launch-day emails | Medium | Medium — magic-link delays during spikes | Use Resend paid tier for launch window or SES fallback; monitor send rate on high-volume days |
| ~60 first-cohort users overwhelm coach selector | Low | High — launch day failure | Load test before March 2, validate with first-cohort concurrency assumptions |
| Coach capacity race condition | Medium | Medium — two participants get same coach | Serialized transaction with capacity recheck (implemented above) |
| USPS participant email execution issues | Medium | High — participants may not have access codes on time | Provide USPS-ready export early, include checklist + send-date tracking, and define exception-handling path with FC Ops |
| Schema migration needed mid-slice | Low | Medium — deployment complexity | Ship full schema in Phase 0, even for models used in later slices |
| Feb 18 workshop reveals new requirements | High | Medium — scope creep | Brainstorm decisions are firm; new requirements go to post-launch backlog |

---

## Future Considerations

Post-launch backlog (NOT in scope for March 16):

1. **Multi-program admin UI** — Program selector in dashboard, program-scoped views
2. **Dark mode** — `darkMode: ["class"]` already configured in Tailwind, just needs `dark:` variants
3. **Chemistry interviews** — Adds 2 states + 4 transitions to state machine (PRD deferred)
4. **Configurable nudge thresholds** — Admin UI to change 7/14/21 day thresholds
5. **Waitlist system** — When all coaches at capacity
6. **`next/font` migration** — Better font loading, eliminate FOUT
7. **Separate Kari/Greg dashboard views** — When executive summary is insufficient
8. **Print-friendly reports** — PDF export of engagement summaries
9. **Real-time updates** — WebSocket/SSE for dashboard live refresh
10. **Session receipts** — Per-session receipt with coach attestation (checkbox, not DocuSign). USPS client request from Feb 17 workshop. Nice-to-have.
11. **Admin panel management UI for coach pools** — Visual management of MLP/ALP vs EF/EL pool membership
12. **Participant-facing filters** — If FC decides participants need filtering by specialty/language in future (removed from MVP per Feb 17 workshop)

---

## References & Research

### Internal References

- PRD: `/Users/amitbhatia/.cursor/prd_for_apps/franklincovey-coaching-platform-prd.md`
  - Schema: lines 167-365
  - Auth flows: lines 140-163
  - API routes: lines 114-135
  - State machine: lines 412-489
  - Deployment: lines 920-977
- CIL Brief Delta: `/Users/amitbhatia/.cursor/franklin-covey/docs/CIL-BRIEF-DELTA-ANALYSIS.md`
- Brainstorm: `docs/brainstorms/2026-02-12-mvp-ship-strategy-brainstorm.md`
- Domain constants: `src/lib/config.ts`
- Status utilities: `src/lib/utils.ts`
- Documented solution (communication pattern): `docs/solutions/integration-issues/calendly-api-scope-miscommunication.md`

### External References

- Next.js 15 App Router: https://nextjs.org/docs/app
- Prisma 6: https://www.prisma.io/docs
- Auth.js v5: https://authjs.dev
- iron-session: https://github.com/vvo/iron-session
- Resend + React Email: https://resend.com/docs
- Zod validation: https://zod.dev

### SpecFlow Analysis

124 findings analyzed, 16 critical blockers resolved in this plan. Full analysis available from spec-flow-analyzer session (agent ID: a3c6e60).

---

*Generated from brainstorm + SpecFlow analysis. Next: `/workflows:work` to begin implementation.*
