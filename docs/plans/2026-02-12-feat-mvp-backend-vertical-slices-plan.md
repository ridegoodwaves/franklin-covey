---
title: "Ship MVP Backend — 3 Vertical Slices"
type: feat
date: 2026-02-12
updated: 2026-02-18
brainstorm: docs/brainstorms/2026-02-12-mvp-ship-strategy-brainstorm.md
prd: prd_for_apps/franklincovey-coaching-platform-prd.md
delta: docs/CIL-BRIEF-DELTA-ANALYSIS.md
review: docs/reviews/2026-02-14-technical-review-consolidated.md
changelog:
  - 2026-02-13: "Added Organization model (multi-org architecture per Greg's requirement). De-scoped email nudges to dashboard flags. Added workshop agenda reference."
  - 2026-02-13b: "Added printable client reports (proposal requirement — @media print CSS, no PDF library). Added coach CSV import script to Phase 0 (critical path for March 2 real data). Cross-referenced proposal deck — 6 flags identified."
  - 2026-02-14: "Applied technical review amendments: replaced Serializable transactions with SELECT FOR UPDATE + unique constraints, cut Phase 0 over-engineering (pino, PII masking, API helpers), replaced advisory lock with timestamp guard, simplified coach ordering to Math.random(), added typed error classes and null safety notes. Full review: docs/reviews/2026-02-14-technical-review-consolidated.md"
  - 2026-02-14b: "Designed fully automated QA strategy: 5 test suites (30 scenarios) using Claude in Chrome browser automation. Added test infrastructure (/api/test/* endpoints, test seed data, Mailpit). Covers OTP auth, coach selection, session logging, admin import/export, dashboard KPIs, cross-cutting auth/rate-limiting. Zero manual QA target."
  - 2026-02-16: "Added email safety stack to Phase 0: startup assertion (crash if prod SMTP creds in non-prod env), sanitize-by-default on coach CSV import (--raw flag for production), Mailpit explicitly in docker-compose spec. Added .gitignore for real data CSVs."
  - 2026-02-17: "Applied Feb 17 workshop decisions: removed participant-facing filters from coach selector, simplified participant flow (ends at selection — no engagement page), updated session statuses to 3 types, re-scoped nudge emails IN (Day 5/10/15 + auto-assign), updated participant count (~60 first cohort), fixed 'Kari' to 'Kari Sadler' throughout, added session receipts to future considerations."
  - 2026-02-18: "Resolved P0 deployment decisions: official MVP target is Vercel + Supabase, contract signed, and FC committed to a 24-hour blocking-decision owner through March 16. Coach panel split clarified: 15 total coaches for MLP/ALP and 16 total for EF/EL. Remaining open clarifications: participant counts by cohort and use-or-lose/window-close policy."
  - 2026-02-18b: "Locked session status policy per stakeholder clarification: coaches are source of truth for session outcomes (COMPLETED, FORFEITED_CANCELLED, FORFEITED_NOT_USED). No automatic Session 1 lock/expiry based on cohort window deadlines in MVP; ops monitors via dashboard."
  - 2026-02-18c: "Confirmed panel separation with FC: EF/EL coaches are a completely separate pool from MLP/ALP. No cross-pool matching in MVP."
  - 2026-02-18d: "Nudge anchor clarified: Day 0 is cohort start date. Day 5/10 reminders and Day 15 auto-assign are measured from cohort start date."
  - 2026-02-18e: "Forfeited Session 1 labels clarified by FC: 'Session forfeited - canceled within 24 hours' and 'Session forfeited - not taken advantage of' (mapped to FORFEITED_CANCELLED and FORFEITED_NOT_USED)."
  - 2026-02-18f: "Email delivery planning note added: Resend free-tier daily limits can throttle launch-day OTP/magic-link traffic; recommend paid tier for launch window."
  - 2026-02-18g: "Capacity counting rule confirmed by Kari: count COACH_SELECTED, IN_PROGRESS, and ON_HOLD; exclude INVITED, COMPLETED, and CANCELED."
---

# feat: Ship MVP Backend — 3 Vertical Slices (March 2/9/16)

## Overview

Connect the existing polished frontend (~60% built, hardcoded demo data) to a real Next.js API backend with Prisma + PostgreSQL, shipping in three independently deployable vertical slices aligned to hard deadlines:

| Slice | Scope | Deadline | Users Impacted |
|-------|-------|----------|----------------|
| **1** | Coach Selector + Participant OTP Auth | **March 2** | ~60 participants (first cohort) |
| **2** | Coach Engagement + Session Logging | **March 9** | ~15 coaches (MLP/ALP panel) |
| **3** | Admin Portal + Nudge Emails + Auto-Assign | **March 16** | 3 admins (Ops, Kari, Greg) |

**Key architectural decisions** (from [brainstorm](docs/brainstorms/2026-02-12-mvp-ship-strategy-brainstorm.md)):
- Participant auth: Generic link + email + OTP (not HMAC tokens)
- Dashboards: 1 Ops dashboard + 1 executive summary view
- Multi-program: Schema-ready, UI-later (`Program` model seeded, no admin UI)
- Multi-org: `Organization` model from day 1 — infrastructure for the full platform (Greg's requirement, added 2026-02-13)
- Nudges: Email reminders (Day 5, Day 10, Day 15 auto-assign; **Day 0 = cohort start date**) + dashboard flags (re-scoped 2026-02-17 — reverses 2026-02-13 de-scoping)
- Backend: Next.js API routes + Prisma in same repo

## Problem Statement / Motivation

The frontend is polished but entirely hardcoded. Without a backend, the platform cannot:
1. Authenticate ~60 USPS participants arriving March 2 (first cohort; 400 total across all programs)
2. Match participants to real coaches with capacity awareness
3. Let coaches log sessions or track engagement progress
4. Give admins visibility into program health or import new participants
5. Send automated nudge emails when engagements stall

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
│  │  • /api/participant/auth   (OTP flow)     │   │
│  │  • /api/participant/coaches (selection)    │   │
│  │  • /api/coach/sessions     (logging)      │   │
│  │  • /api/admin/import       (bulk)         │   │
│  │  • /api/admin/dashboard    (KPIs)         │   │
│  │  • /api/cron/nudges        (automated)    │   │
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
        Int maxEngagements "default 15"
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
    }

    VerificationCode {
        String id PK
        String participantId FK
        String code "6-digit hashed"
        DateTime expiresAt "5 min"
        Int attempts "max 3"
        Boolean used
        DateTime createdAt
    }

    Engagement {
        String id PK
        String participantId FK
        String coachId FK "nullable"
        String programId FK
        DateTime cohortStartDate "Day 0 for nudge timing"
        EngagementStatus status
        Int statusVersion "optimistic lock"
        Int totalSessions
        Boolean autoAssigned "default false"
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
        NudgeType nudgeType "REMINDER_DAY5 | REMINDER_DAY10 | AUTO_ASSIGN | COACH_ATTENTION | OPS_ESCALATION"
        Boolean emailSent "default false"
        DateTime sentAt
        String assignedCoachId FK "nullable, only for AUTO_ASSIGN"
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
- **Added** `VerificationCode` model (brainstorm: OTP replaces HMAC tokens)
- **Added** `CoachProfile.languages`, `.location`, `.credentials`, `.videoUrl` (CIL Brief delta)
- **Added** `Session.occurredAt` (coach enters date since no webhook auto-sync)
- **Removed** `Participant.tokenHash` (OTP replaces HMAC tokens)
- **Removed** `Session.calendlyEventUri` (Calendly API removed)
- **Added** `Engagement.programId` (multi-program from day 1)

**Schema changes from Feb 17 workshop:**
- **Added** `CoachProgramPanel` join table (many-to-many: coaches ↔ programs). MLP/ALP share 15 total coaches; EF/EL use a separate 16-coach panel. **Pools are separate with no cross-pool matching in MVP.** `@@unique([coachProfileId, programId])` prevents duplicate assignments.
- **Added** `Program.code` (unique program identifier: MLP, ALP, EF, EL) and `Program.track` (moved from Participant — track is a property of the program, not the participant)
- **Changed** `SessionStatus` enum: was `SCHEDULED | COMPLETED | CANCELED | NO_SHOW` → now `COMPLETED | FORFEITED_CANCELLED | FORFEITED_NOT_USED`
- **Changed** `SessionNote.topics/outcomes` arrays → `SessionNote.topicDiscussed` (single string from program competency list) + `SessionNote.sessionOutcome` (single string)
- **Changed** `NudgeLog.nudgeType` enum: was `PARTICIPANT_STALLED | COACH_ATTENTION | OPS_ESCALATION` → now `REMINDER_DAY5 | REMINDER_DAY10 | AUTO_ASSIGN | COACH_ATTENTION | OPS_ESCALATION`
- **Added** `NudgeLog.emailSent` boolean (tracks whether email was sent vs dashboard-only flag)
- **Added** `NudgeLog.assignedCoachId` FK (nullable — populated only for `AUTO_ASSIGN` nudge type)
- **Renamed** `NudgeLog.flaggedAt` → `NudgeLog.sentAt` (nudges now send emails, not just set flags)
- **Removed** `NudgeLog.acknowledged/acknowledgedAt` (ops workflow doesn't need explicit acknowledgment for MVP)
- **Removed** `Participant.programTrack` (track is now on `Program.track` — derived via `Engagement.programId`)
- **Added** `Engagement.autoAssigned` boolean (tracks whether coach was system-assigned at Day 15 vs participant-selected)
- **Added** `Engagement.cohortStartDate` (Day 0 anchor for nudge timing from cohort schedule)

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
  - CSV columns: name, email, bio, photo, specialties (semicolon-separated), languages, location, credentials, videoUrl, meetingBookingUrl, maxEngagements
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
  - `transitionEngagement(tx: Prisma.TransactionClient, engagementId, targetStatus, currentStatusVersion)` — accepts transaction client so it composes inside existing transactions
  - Valid transitions: `INVITED→COACH_SELECTED`, `COACH_SELECTED→IN_PROGRESS`, `IN_PROGRESS→COMPLETED`, any→`CANCELED`/`ON_HOLD`
  - Updates `lastActivityAt` on every transition
  - Always checks `statusVersion` in WHERE clause (enforces optimistic locking in one place)
  - Throws `InvalidTransitionError` on invalid transition (with current + target status)
- [ ] Validation schemas (Zod) — `src/lib/validations.ts`
  - `participantEmailSchema` — lowercase, trim, valid format
  - `otpSchema` — exactly 6 digits
  - `sessionNoteSchema` — topics from `SESSION_TOPICS_BY_PROGRAM[programType]` (MLP has managerial competencies, ALP/EF/EL have executive competencies), outcomes from `SESSION_OUTCOMES`, duration from `DURATION_OPTIONS`
  - `csvRowSchema` — firstName, lastName, email, org, programTrack, programId, cohortCode, cohortStartDate (ISO date)
- [ ] Email client — `src/lib/email.ts`
  - Resend client wrapper (or AWS SES — **decision needed before Slice 1**)
  - `sendOTP(email, code)` — participant verification
  - `sendMagicLink(email, url)` — coach/admin auth (via Auth.js)
  - `sendNudge(type, recipient, engagement)` — automated nudge emails (Day 5, Day 10 reminders, Day 15 auto-assign notification, ops escalation)
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
OTP_SECRET= # For HMAC-signing OTP codes

# Email
RESEND_API_KEY= # Or AWS SES credentials
EMAIL_FROM=noreply@franklincovey-coaching.com

# Cron
CRON_SECRET= # Shared secret for /api/cron/* endpoints

# Monitoring
SENTRY_DSN=
LOG_LEVEL=info
```

- [ ] Create `Dockerfile` (3-stage build, non-root user) — `Dockerfile`
- [ ] Create `docker-compose.yml` (PostgreSQL 16 + PgBouncer + Mailpit) — `docker-compose.yml`
  - Mailpit: SMTP on port 1025, web UI on port 8025. Catches all non-production email.
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

#### 1.1 Participant OTP Auth

**Flow:**

```
Generic link (franklincovey-coaching.com/participant)
    → Enter email
    → POST /api/participant/auth/request-otp { email }
    → Server: lookup Participant by email (case-insensitive)
    → Server: generate 6-digit OTP, hash with HMAC, store VerificationCode
    → Server: send OTP via email (React Email template)
    → Client: show OTP input form
    → POST /api/participant/auth/verify-otp { email, code }
    → Server: verify code, mark used, set httpOnly session cookie
    → Redirect: /participant/select-coach (if no coach selected)
              OR /participant/confirmation (if coach already selected — flow ends at selection)
```

- [ ] OTP request endpoint — `src/app/api/participant/auth/request-otp/route.ts`
  - Validate email format (Zod)
  - Normalize: lowercase, trim
  - Lookup `Participant` by email
  - **Security: identical 200 response whether email found or not** (prevent enumeration)
  - If found: generate 6-digit code, HMAC-hash, create `VerificationCode` (5-min expiry)
  - Invalidate any existing unused codes for this participant
  - Send OTP email via `sendOTP()`
  - Rate limit: 3 requests/email/hour + 10 requests/IP/hour + **100 requests/IP/day** (global brute force protection)

- [ ] OTP verify endpoint — `src/app/api/participant/auth/verify-otp/route.ts`
  - Validate email + code format
  - Lookup latest `VerificationCode` for participant
  - Check: not expired, not used, attempts < 3
  - Increment `attempts` on each verify attempt (even if wrong code)
  - On success: mark `used = true`, create session cookie (iron-session, 30-day rolling)
  - On failure: return generic "Invalid or expired code" (no detail leaking)
  - After 3 failed attempts: auto-lock for 15 minutes (not permanent ban)
  - Rate limit: 5 attempts/email/5min

- [ ] Participant session middleware — `src/lib/participant-session.ts`
  - `iron-session` with httpOnly, secure, sameSite=lax cookie
  - Session data: `{ participantId, email, engagementId? }`
  - `getParticipantSession(req)` — returns session or null
  - `requireParticipantSession(req)` — returns session or 401

- [ ] OTP email template — `src/emails/participant-otp.tsx`
  - React Email component with FC branding (Cormorant Garamond heading, Inter body)
  - Subject: "Your FranklinCovey Coaching verification code"
  - Body: 6-digit code in large monospace font, 5-minute expiry note
  - "If you didn't request this, ignore this email"

- [ ] Participant auth page — Update `src/app/participant/page.tsx`
  - Email input form (currently landing page — convert to auth entry point)
  - OTP verification form (6-digit input, auto-submit on complete)
  - Loading states, error messages, "Resend code" button (30s cooldown)
  - Redirect logic based on engagement status

**SpecFlow resolutions baked in:**
- Email not found → identical response (issue #6)
- OTP brute force → global IP rate limit + per-email lockout (issue #16)
- Expired OTP → "Resend code" button (issue #7)
- Concurrent OTP requests → invalidate previous codes (issue #9)
- Email delivery failure → identical "check your email" response + logging (issue #12)
- Returning participant → check session cookie first, skip auth (issue #3)

#### 1.2 Coach Selection API

- [ ] List available coaches — `src/app/api/participant/coaches/route.ts`
  - `GET /api/participant/coaches` (no filter params — filters removed per Feb 17 workshop)
  - Requires participant session
  - Lookup participant's engagement → `programId` → coach panel via `CoachProgramPanel`
  - Query: `CoachProfile` where `active = true` AND on participant's program panel AND current engagement count < `maxEngagements`
  - Capacity count: `SELECT COUNT(*) FROM Engagement WHERE coachId = ? AND status IN ('COACH_SELECTED', 'IN_PROGRESS', 'ON_HOLD')`
  - ~~Apply filters (location, language, specialty, credential)~~ — **REMOVED** per Feb 17 workshop. Bio + video drive selection, not filters.
  - Capacity-weighted randomization: coaches with more remaining capacity are weighted higher (`Math.random()` weighted by `maxEngagements - activeCount`)
  - Return first 3 coaches with profile data (bio, photo, specialties, languages, location, credentials, videoUrl)
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
  - Confirmation page shows: selected coach name, bio, `meetingBookingUrl` as "Book Your Session" button (opens Calendly in new tab)
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
- [ ] Test OTP flow end-to-end on staging
- [ ] Test coach selection end-to-end on staging
- [ ] Load test: ~60 concurrent participants hitting coach selector (first cohort; 400 total over 6 months)

**Slice 1 Acceptance Criteria:**
- [ ] Participant can visit generic link, enter email, receive OTP, verify, and land on coach selector
- [ ] Coach selector shows 3 capacity-weighted randomized coaches (no filters)
- [ ] Remix shows 3 different coaches (max 1 remix, one-way door with confirmation warning)
- [ ] Coach selection creates engagement with `COACH_SELECTED` status
- [ ] **Participant flow ends at selection**: confirmation page + Calendly link. No engagement page.
- [ ] Capacity is enforced: full coach disappears from pool (15 per coach fixed)
- [ ] Zero coaches scenario shows appropriate message + notifies ops
- [ ] Returning participant with valid session skips OTP → goes to confirmation (if coach already selected)
- [ ] OTP brute force is rate-limited (3 attempts/email, 10/IP/hour)
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
  - Redirect to `/participant` if participant session expired (re-enter OTP)

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
  if (count === 0 && engagement.status === 'COACH_SELECTED') {
    await transitionEngagement(tx, engagementId, 'IN_PROGRESS', engagement.statusVersion)
  }

  // 5. Auto-complete engagement if all sessions done (fixed 2026-02-14: was missing statusVersion check)
  if (sessionNumber === engagement.totalSessions && !isDraft) {
    await transitionEngagement(tx, engagementId, 'COMPLETED', engagement.statusVersion)
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

- [ ] Import execution — `src/app/api/admin/import/execute/route.ts`
  - `POST /api/admin/import/execute { rows: ValidatedRow[], programId }`
  - **Phase A**: Atomic transaction — create all `Participant` + `Engagement` records
    - Engagement created with `status: INVITED`, `coachId: null`, `totalSessions` from `programTrack`, `cohortStartDate` from CSV
    - Transaction timeout: 30s (fail-safe for large imports)
  - **Phase B**: Email batch — send invitation emails (generic link + instructions)
    - Queued, not blocking (admin sees "Import complete, sending invitations...")
    - Failed emails tracked in response
    - Admin can retry failed emails via `POST /api/admin/import/retry-emails { participantIds }`
  - Return: `{ created: number, skipped: number, emailsSent: number, emailsFailed: string[] }`

#### 3.3 Nudge System (Email Reminders + Dashboard Flags + Auto-Assign)

> **Updated 2026-02-17**: Re-scoped from dashboard-only flags to email nudges + auto-assignment per Feb 17 workshop. FC explicitly wants automated participant re-engagement. The "blind spot" identified in 2026-02-13 (participants who never log in can't see dashboard flags) is now addressed by email nudges. Email infrastructure already exists for OTP auth — incremental cost of 2-3 templates is low.
>
> **Nudge timing anchor (2026-02-18):** Day 0 is the participant's **cohort start date**. Day 5/10 reminders and Day 15 auto-assignment are measured from cohort start date, not from invitation send date or first login.

- [ ] Nudge evaluation + email sending endpoint — `src/app/api/cron/nudges/route.ts`
  - `POST /api/cron/nudges` with `Authorization: Bearer {CRON_SECRET}`
  - **Idempotency guard**: timestamp check prevents redundant runs

```typescript
// Simple timestamp guard — cron runs once daily, no concurrent execution risk
const lastNudge = await prisma.nudgeLog.findFirst({ orderBy: { sentAt: 'desc' } })
if (lastNudge && Date.now() - lastNudge.sentAt.getTime() < 3600_000) {
  return NextResponse.json({ skipped: true, reason: 'Ran less than 1 hour ago' })
}
```

  - Query overdue engagements and **send emails + set dashboard flags**:
    - **Day 5 — `PARTICIPANT_REMINDER_1`**: status = `INVITED`, no coach selected in 5+ days from cohort start date. Send gentle reminder email to participant. Set dashboard flag.
    - **Day 10 — `PARTICIPANT_REMINDER_2`**: status = `INVITED`, no coach selected in 10+ days from cohort start date, `REMINDER_1` already sent. Send firmer reminder email. Set dashboard flag.
    - **Day 15 — `AUTO_ASSIGN`**: status = `INVITED`, no coach selected in 15+ days from cohort start date, `REMINDER_2` already sent. **System auto-assigns coach** (capacity-weighted selection) + sends notification email to participant with assigned coach info + Calendly link. Set dashboard flag. Transitions engagement to `COACH_SELECTED`.
    - **`COACH_ATTENTION`**: status = `IN_PROGRESS`, no session logged in 14+ days. Dashboard flag only (no email to participant — coach handles this).
    - **`OPS_ESCALATION`**: any engagement stalled 21+ days. Dashboard flag + email to ops (Andrea/Kari).
    - **No date-based session status mutation**: cron flags overdue work for ops visibility but does not auto-mark sessions `FORFEITED_*` based on cohort window dates.
  - **Per-nudge-type cooldown** — each type checked independently
  - Log each nudge to `NudgeLog` table: type, email sent (boolean), dashboard flag set, auto-assignment details
  - Return: `{ processed: number, emailsSent: number, flagsSet: number, autoAssigned: number, errors: number }`

- [ ] Auto-assignment logic — `src/lib/auto-assign.ts`
  - Called by nudge cron at Day 15 for `INVITED` engagements
  - Selects coach via capacity-weighted randomization (same logic as participant coach selector)
  - Scoped to same program's coach panel (MLP/ALP pool or EF/EL pool; no cross-pool assignment)
  - Creates engagement with `COACH_SELECTED` status, sets `coachSelectedAt`
  - Sends notification email to participant: "You've been matched with [coach name]" + coach bio + Calendly link
  - Sends notification email to coach: "New participant auto-assigned: [participant name]"

- [ ] Nudge email templates (restored — emails back in scope per Feb 17 workshop):
  - `src/emails/participant-reminder-day5.tsx` — gentle: "Don't forget to select your coach"
  - `src/emails/participant-reminder-day10.tsx` — firmer: "Your coaching session is waiting — select a coach soon"
  - `src/emails/participant-auto-assigned.tsx` — "You've been matched with [coach name]" + coach bio + Calendly link
  - `src/emails/coach-auto-assigned.tsx` — "New participant assigned: [participant name]"
  - `src/emails/ops-escalation.tsx` — "N engagements critically stalled (21+ days)"

- [ ] Dashboard "Needs Attention" integration — wire into admin KPI endpoint (3.1)
  - `NudgeLog` flags surface in the Ops dashboard "Needs Attention" tab (default view, top of page)
  - Grouped by type: "N participants haven't selected a coach", "N auto-assigned at Day 15", "N engagements have no recent session (14+ days)", "N engagements critically stalled (21+ days)"
  - Coach dashboard also shows a "Needs Attention" indicator for their own stalled engagements

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
- [ ] Bulk import validates CSV, creates participants + engagements atomically, sends invitation emails
- [ ] Failed import emails can be retried
- [ ] Nudge cron sends Day 5 + Day 10 reminder emails to stalled participants
- [ ] Day 15 auto-assignment: system assigns coach + notifies participant and coach via email
- [ ] Dashboard flags set for all nudge types (stalled, attention, escalation, auto-assigned)
- [ ] "Needs Attention" tab in ops dashboard shows flagged engagements grouped by type
- [ ] Coach dashboard shows "Needs Attention" indicator for their own stalled engagements
- [ ] Concurrent cron runs are prevented via timestamp guard
- [ ] CSV export streams correctly, excludes private notes
- [ ] Engagement summary and dashboard views are print-friendly (browser print-to-PDF, `@media print` CSS)
- [ ] All admin routes require admin auth

---

## Alternative Approaches Considered

### 1. HMAC Token Auth (PRD Original)
- Per-participant unique URL with signed token
- **Rejected**: Distribution of 400 unique links is operationally complex. OTP with generic link is simpler for admins and participants.

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

- [ ] ~60 participants (first cohort) can authenticate via generic link + OTP
- [ ] Participants see 3 capacity-weighted randomized coaches (no filters), select one, receive Calendly link
- [ ] Coaches can sign in via magic link and log structured sessions
- [ ] Session logging enforces program track limits (2 or 5 sessions)
- [ ] Admins can view KPIs, manage engagements, import participants, and manage coaches
- [ ] Automated nudge emails (Day 5, Day 10 reminders) + Day 15 auto-assignment, surfaced in dashboard "Needs Attention" tab
- [ ] CSV export works with all filters applied

### Non-Functional Requirements

- [ ] OTP brute force protected (rate limiting + lockout)
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
- [ ] OTP request/verify API routes — unit tests covering: valid email, unknown email (identical response), expired code, 3-attempt lockout, rate limiting
- [ ] Coach selection API — unit tests covering: capacity enforcement, race condition (two concurrent selects for last slot), inactive coach rejection, filter combinations
- [ ] Engagement state machine — unit tests for all valid transitions + rejection of invalid transitions

**Slice 2:**
- [ ] Session logging — unit tests for: session number auto-increment, totalSessions limit, draft→submit transition, private notes exclusion from admin responses

**Slice 3:**
- [ ] Bulk import — unit test for: duplicate email handling, Phase A rollback on failure, CSV validation edge cases
- [ ] Nudge flag cron — unit test for: cooldown enforcement, advisory lock idempotency, correct flag types set for overdue thresholds (7/14/21 days)

**Tooling:** Vitest (already compatible with Next.js 15) for unit tests.

**E2E / QA: Fully Automated via Claude in Chrome**

> **Goal**: Zero manual QA. Claude in Chrome validates every critical user flow end-to-end on staging before each deployment. Automated test runs produce GIF recordings and pass/fail verdicts for each scenario.

#### Test Infrastructure

**Test Helper Endpoints** (guarded by `NODE_ENV !== 'production'`):

- [ ] `GET /api/test/latest-otp?email=` — returns latest unhashed OTP code for email — `src/app/api/test/latest-otp/route.ts`
  - Returns `{ code: "123456", expiresAt: "...", used: false }` or 404 if none exists
  - **Production guard**: returns 404 in production, enforced by middleware + env check
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

**Suite 1: Participant OTP Auth** (Slice 1 — run before March 2)

| # | Scenario | Steps | Pass Criteria |
|---|----------|-------|---------------|
| 1.1 | Happy path OTP | 1. Navigate to `/participant` 2. Enter `alice@test.franklincovey.com` 3. Submit email form 4. Call `/api/test/latest-otp?email=alice@test.franklincovey.com` 5. Enter OTP code 6. Wait for redirect | Redirects to `/participant/select-coach`. Session cookie is set. Page shows coach cards. |
| 1.2 | Unknown email (no enumeration) | 1. Navigate to `/participant` 2. Enter `unknown@test.franklincovey.com` 3. Submit | Same "Check your email" message as 1.1. No error, no difference in response time (±500ms). |
| 1.3 | Expired OTP | 1. Request OTP for `alice@...` 2. Wait 6 minutes (or mock via test endpoint) 3. Enter code | "Invalid or expired code" message. "Resend code" button visible. |
| 1.4 | Wrong OTP × 3 (lockout) | 1. Request OTP 2. Enter `000000` three times | After 3rd attempt: "Too many attempts. Try again in 15 minutes." OTP input disabled. |
| 1.5 | Resend OTP | 1. Request OTP 2. Click "Resend code" (after 30s cooldown) 3. Verify new OTP via test endpoint 4. Enter new code | New code works. Old code is invalidated (verify via test endpoint: `used: true`). |
| 1.6 | Returning participant (session valid) | 1. Complete 1.1 (get session cookie) 2. Close tab 3. Navigate to `/participant` again | Skips email/OTP entry. Redirects directly to `/participant/select-coach` or `/participant/engagement` based on engagement status. |
| 1.7 | Invalid email format | 1. Enter `not-an-email` 2. Submit | Client-side validation prevents submission. No API call made (verify via network tab or console). |

**Recording**: GIF of scenarios 1.1 and 1.4 for stakeholder review.

---

**Suite 2: Coach Selection** (Slice 1 — run before March 2)

| # | Scenario | Steps | Pass Criteria |
|---|----------|-------|---------------|
| 2.1 | View coaches | 1. Auth as `alice@test...` (Suite 1.1) 2. Land on `/participant/select-coach` | Exactly 3 coach cards displayed. Each card shows: name, bio, photo, specialties, languages, location, credentials. `meetingBookingUrl` NOT visible (verify DOM). |
| 2.2 | Filter coaches | 1. Select a language filter 2. Observe coach cards | Cards update. All displayed coaches match filter. Loading skeleton shown during fetch. |
| 2.3 | Remix coaches | 1. Click "See Different Coaches" 2. Observe new coaches | 3 different coach cards appear (none from previous set). "See Different Coaches" button changes to disabled or shows "No more remixes." |
| 2.4 | Second remix blocked | 1. After 2.3, try remix again | Button disabled or returns error. Text: "You've already refreshed your coach options." |
| 2.5 | Select coach (happy path) | 1. Click "Select Coach" on a coach card 2. Confirm selection (if confirmation dialog exists) | Redirects to `/participant/engagement`. Page shows selected coach's name, bio, `meetingBookingUrl` as "Book Next Session" button. Verify engagement status via `/api/test/engagement`: `status = COACH_SELECTED`. |
| 2.6 | Coach at capacity | 1. Auth as `alice@test...` 2. Select `coach2@test...` (full capacity) | Error message: "This coach is no longer available." Coach card refreshes or disappears. Other coaches still selectable. |
| 2.7 | Zero coaches available | 1. Set all test coaches to inactive/full (via test endpoint or pre-configured seed state) 2. Load coach selector | Message: "No coaches are currently available. We'll notify the team." Verify ops notification is created (check via test endpoint or admin dashboard). |
| 2.8 | Already selected (re-visit) | 1. Auth as `bob@test...` (already has coach) 2. Navigate to `/participant/select-coach` | Redirects to `/participant/engagement` (not back to selection). |

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
| 5.6 | Rate limiting — OTP brute force | 1. Send 11 OTP requests for same IP in 1 hour | 11th request returns 429 Too Many Requests. |

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

- [ ] Create `/api/test/latest-otp` endpoint — `src/app/api/test/latest-otp/route.ts`
- [ ] Create `/api/test/latest-magic-link` endpoint — `src/app/api/test/latest-magic-link/route.ts`
- [ ] Create `/api/test/reset` endpoint — `src/app/api/test/reset/route.ts`
- [ ] Create `/api/test/engagement` endpoint — `src/app/api/test/engagement/route.ts`
- [ ] Add production guard middleware for `/api/test/*` routes — `src/middleware.ts`
- [ ] Add test seed data to `prisma/seed.ts` (8 test entities above)
- [ ] Add Mailpit to `docker-compose.yml` for local email inspection
- [ ] Document test execution runbook in `docs/qa/automated-testing-runbook.md`

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Coach selector uptime on March 2 | 99.9% | Health endpoint monitoring |
| Participant auth success rate | >95% | OTP verify success / total attempts |
| Time to select coach | <3 minutes | `coachSelectedAt` - session start |
| Session logging completion | >90% of sessions logged within 48h | `Session.completedAt` vs `occurredAt` |
| Nudge flag coverage | 100% overdue engagements flagged within 24h | Cron run logs + NudgeLog count vs overdue query |
| Admin dashboard load time | <2s | Server-side metric (cached KPIs) |

---

## Dependencies & Prerequisites

### Must Resolve Before Slice 1 (status as of Feb 18)

| Decision | Options | Impact |
|----------|---------|--------|
| **Email provider** | Resend (recommend paid tier at launch) vs AWS SES | OTP + magic link + nudge emails all depend on this; free-tier daily caps may throttle launch-day traffic |
| **Cloud provider** | **Resolved: Vercel + Supabase (confirmed 2026-02-18)** | MVP hosting and database target locked; remove infra ambiguity |
| **Domain / DNS** | Who manages? What subdomain? | Deployment URL, email sender domain |
| **Real coach data entry** | Admin CSV upload vs manual entry vs seed script | 35 coaches need real bios, photos, booking URLs, and video URLs before March 2. Seed script only covers dev data. Options: (a) FC provides a CSV and we import via a one-off script, (b) build a minimal coach profile edit form in admin portal (pulls Slice 3 work forward), or (c) Kari/Andrea enter data directly in the database via a simple admin form. **Recommend option (a)** — CSV from FC ops, imported with a script. |
| **Blocking decision turnaround** | **Resolved: FC 24-hour owner through Mar 16 (confirmed 2026-02-18)** | Protects critical path when implementation questions arise |
| **Contract status** | **Resolved: signed (confirmed 2026-02-18)** | Removes pre-launch legal/commercial execution risk |
| **Participant counts by cohort** | Pending clarification from Kari/FC | Required to validate capacity assumptions and overlap load with panel split fixed at 15 (MLP/ALP) and 16 (EF/EL) |

### Must Resolve Before Slice 3 (by March 9)

| Decision | Options | Impact |
|----------|---------|--------|
| **Session window reporting rule** | Display-only deadline tracking vs hide from MVP | Affects dashboard messaging only; does not trigger automatic session status updates |
| **Nudge recipients** | Hardcoded vs configurable | Ops escalation email targets |
| **Executive summary scope** | What metrics matter to Kari vs Greg? | Dashboard content |
| **Import duplicate handling** | Skip existing vs error on duplicate | CSV import behavior |

---

## Risk Analysis & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Email provider DPA not signed by March 2 | Medium | High — no OTP, no auth | Start with Resend trial, fallback to AWS SES (no DPA needed for internal tool) |
| Resend free-tier daily cap throttles launch-day emails | Medium | High — OTP/magic link delays during spikes | Use Resend paid tier for launch window or SES fallback; monitor send rate on first cohort days |
| ~60 first-cohort users overwhelm coach selector | Low | High — launch day failure | Load test before March 2, validate with first-cohort concurrency assumptions |
| Coach capacity race condition | Medium | Medium — two participants get same coach | Serialized transaction with capacity recheck (implemented above) |
| OTP email deliverability issues | Medium | High — participants can't log in | Monitor Resend deliverability, add "Resend code" UX, ops has manual workaround |
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
