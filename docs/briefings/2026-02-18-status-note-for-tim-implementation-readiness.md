# Status Note for Tim — MVP Implementation Readiness (Feb 18, 2026)

## Project Plan File You Asked About

The main project plan doc is:
- `franklin-covey/docs/plans/2026-02-18-fc-project-plan.md`

It matches the "tiered plan" format built for Tim (FC-shareable top section + internal action items at bottom).

## Execution Update (Feb 25, 2026)

- Staging schema migration is applied and tracked in Prisma migration history.
- USPS baseline seed is loaded in staging: 4 programs, 14 cohorts, 32 coach memberships, 175 participants, 175 engagements.
- Admin users seeded in staging: Amit + Tim (Kari/Andrea pending email addresses).
- Staging email safeguards are now hardened by config and code:
  - `EMAIL_OUTBOUND_ENABLED=false` in staging
  - sandbox mode + allowlist still required
  - centralized guard required for all send paths (`src/lib/email/guard.ts`, `src/lib/email/send-with-guard.ts`)

## What Is Ready on Auth Scope (Decision-Ready and Frozen)

These are locked and ready for implementation:
- Participant access is fixed to USPS-sent cohort welcome email + roster-matched email entry (no participant access code and no system-sent participant email in MVP).
- Coach/admin auth model is fixed to shared `/auth/signin` magic-link flow with fresh-link re-auth after timeout.
- Auth-related API contract paths are frozen for MVP.
- Participant flow is frozen: email entry -> 3 coaches -> optional remix -> select -> confirmation (no return dashboard).
- Nudge timing anchor is frozen: Day 0 = `cohortStartDate`.

Source refs:
- `franklin-covey/docs/drafts/2026-02-18-mvp-contract-v1.md:17`
- `franklin-covey/docs/drafts/2026-02-18-mvp-contract-v1.md:29`
- `franklin-covey/docs/drafts/2026-02-18-mvp-contract-v1.md:55`
- `franklin-covey/docs/drafts/2026-02-18-mvp-contract-v1.md:80`
- `franklin-covey/docs/plans/2026-02-18-fc-project-plan.md:26`

## Decisions Confirmed Today (P0 Locks)

- MVP deployment target: Vercel + Supabase.
- Contract status: signed.
- FC 24-hour blocking-decision owner confirmed through March 16.
- Coach pools split confirmed (MLP/ALP separate from EF/EL; no cross-pool matching in MVP).
- Session status policy confirmed (coach-entered outcomes only; no auto expiry lock).
- Forfeiture label language clarified.
- Nudge Day 0 anchor clarified (cohort start date).
- EF/EL coach capacity confirmed: 20 participants per coach.
- MVP participant planning baseline confirmed: 400 total participants.
- EF/EL reporting window anchor confirmed: coach-selection-window start + 9 months.
- Capacity counting rule confirmed: count `COACH_SELECTED`, `IN_PROGRESS`, `ON_HOLD`; exclude `INVITED`, `COMPLETED`, `CANCELED`.
- Scheduling-link policy clarified: MVP supports direct booking URLs from Calendly, Acuity, or equivalent (no Calendly-only requirement).
- Booking-link fallback policy clarified: coaches without active links may still be selected; confirmation shows coach-outreach message and coach is expected to contact participant within 2 business days (ops follows via "Needs Attention" if delayed).
- Coach bio videos are de-scoped from MVP coach selector.
- ALP-138 Session 2 start date confirmed: Aug 7, 2026.
- Participant welcome comms owner confirmed: USPS sends on first day of each coach-selection window.
- Coach access comms owner confirmed: Andrea and/or Kari, sent as soon as portal is available and before Mar 2.
- Participant communication boundary confirmed: CIL system does not send participant emails in MVP.
- Participant entry model confirmed by Kari: email-entry-only for MVP (no participant access codes), aligned to USPS cohort group-email workflow and FC sender restrictions.
- Use-it-or-lose-it behavior confirmed as manual for ALP/MLP only: no auto-lock/forfeit; overdue Session 1/2 items should surface as "Needs Attention". EF/EL does not use this model.

Source refs:
- `franklin-covey/docs/plans/2026-02-18-fc-project-plan.md:4`
- `franklin-covey/docs/plans/2026-02-18-fc-project-plan.md:97`
- `franklin-covey/docs/plans/2026-02-18-fc-project-plan.md:116`
- `franklin-covey/docs/drafts/2026-02-18-mvp-contract-v1.md:71`

## Highest-Priority Work Next (Execution Order)

1. **Participant auth implementation (email-entry only)**
- Replace access-code assumptions in backend/API contracts used for Slice 1 implementation.
- Implement roster-matched email-entry validation + active cohort-window gating + session creation.
- Ensure generic auth errors + rate limiting + audit logging are in place.

2. **Participant selection APIs + frontend wiring**
- Implement `GET /api/participant/coaches`, `POST /api/participant/coaches/remix`, `POST /api/participant/coaches/select`.
- Enforce capacity race protections (`SELECT FOR UPDATE` + optimistic lock checks).
- Keep booking-link fallback behavior locked ("coach reaches out within 2 business days").

3. **Data ingestion for first cohorts**
- Import ALP-135 roster (received) and complete MLP-80 + remaining March cohort imports.
- Complete coach import (bios/photos/scheduling links) and verify pool assignments (MLP/ALP vs EF/EL).

4. **Environment readiness + staging deploy**
- Complete Vercel/Supabase staging+production split with distinct secrets.
- Apply staging email safety gates (`EMAIL_MODE=sandbox`, allowlist, no participant sends).
- Deploy Slice 1 to staging and run Kari beta script.

5. **Coach/admin auth + operations flow**
- Implement magic-link auth for coach/admin.
- Implement session logging baseline for Slice 2 and admin needs-attention pipeline for Slice 3.

## Hard Must-Haves (ASAP) to Avoid Implementation Delay

These are critical-path items for Slice 1 timeline integrity:

1. MVP scope freeze enforcement
- Keep API/state behavior locked; route any additions through change control.
- Protects March 2 date from late rework.

2. Remaining roster/cohort imports
- ALP-135 is received; complete MLP-80 and remaining March cohorts with final allocations.
- Needed to validate capacity/load assumptions and staging QA realism.

3. Coach data completeness
- Ensure usable scheduling links across active coach panel.
- Missing links are allowed, but raise manual follow-up volume and ops risk.

4. Communication tracker execution confirmation
- Confirm owner and cadence for participant/coach send status tracking fields (Planned/Sent).
- Needed for clean per-cohort communication accountability.

5. Staging verification before beta
- Validate participant email-entry auth, selector, remix, select, and confirmation flows in staging.
- Validate coach/admin magic-link access and audit logs for critical participant actions.

Source refs:
- `franklin-covey/docs/plans/2026-02-18-fc-project-plan.md:120`
- `franklin-covey/docs/plans/2026-02-18-fc-project-plan.md:124`
- `franklin-covey/docs/plans/2026-02-18-fc-project-plan.md:125`
- `franklin-covey/docs/plans/2026-02-18-fc-project-plan.md:126`
- `franklin-covey/docs/plans/2026-02-18-fc-project-plan.md:128`
- `franklin-covey/docs/drafts/2026-02-18-mvp-contract-v1.md:69`

## Can Wait (Does Not Block Starting Build Today)

- Blaine IT approval for production infrastructure (important, but explicitly not an MVP blocker).
- KPI preference tuning for executive summary.
- Session window reporting presentation rule.
- Cohort comms tracking fields (participant send date, coach send date, owner, status).
- CSV duplicate strategy nuance.

Source refs:
- `franklin-covey/docs/plans/2026-02-18-fc-project-plan.md:129`
- `franklin-covey/docs/plans/2026-02-18-fc-project-plan.md:108`
- `franklin-covey/docs/drafts/2026-02-18-mvp-contract-v1.md:85`

## Working Cadence and Feedback Process

### Meeting Cadence (every other day)

| Cadence | Participants | Focus |
|---------|--------------|-------|
| Every other day (30 minutes) | Tim + Amit (+ FC stakeholders as needed) | Progress updates, blocking issues, confusing items to brainstorm together |

### Feedback Priority System

| Priority | Definition | Example (FC MVP) | Expected Turnaround |
|----------|------------|------------------|---------------------|
| **P0** | Blocking/critical issue that prevents launch-critical work or breaks core flow | Participants cannot complete roster-email entry/login, or coach selection API fails for all users | Immediate triage same day |
| **P1** | Urgent fix needed for upcoming milestone quality or timeline protection | USPS participant access emails are delayed for some users, or coach session logging fails intermittently | Prioritize in next build window (typically within 24 hours) |
| **P2** | Nice-to-have or non-blocking enhancement | Add a dashboard filter, refine report formatting, or polish UI copy | Backlog and schedule against milestone capacity |

### Feedback Workflow

1. Tim sends feedback by Whisper note or Loom recording with page/flow context.
2. Each feedback item is tagged as P0, P1, or P2.
3. CIL posts disposition for each item: `accepted`, `needs clarification`, or `deferred`.
4. P0 items are escalated immediately and handled before non-P0 work.

### 24-Hour Change Log Standard

- The project plan or companion update note includes a daily "last 24 hours" summary.
- Summary includes: what changed, why it changed, and whether scope/timeline impact exists.
- Any breaking change proposal is explicitly called out before implementation.

## Current Repo Reality Check

Decision scope and backend foundation are now in motion in this repo snapshot:
- `prisma/` exists with multi-org-ready schema + initial migration.
- Staging DB schema is live and seeded via repeatable scripts.
- `.env` templates and validation enforce staging/production email safety rules.
- `src/app/api/` endpoints are still pending implementation wiring; frontend remains mostly stubbed.

Meaning: architecture + data foundations are no longer the blocker. Remaining risk is delivery wiring (API/auth flows), missing cohort input files, and ops test execution timing.

## Environment + Email Safety SOP (Locked Feb 19, 2026)

### Environment isolation (required)

- Use separate projects for each environment:
  - Vercel: `fc-staging`, `fc-production`
  - Supabase: `fc-staging`, `fc-production`
- Do not share secrets, API keys, DB URLs, auth config, or cron secrets across environments.

### Staging data policy (required)

- Staging is sanitized-only.
- No raw production participant/coach PII is imported into staging.
- Preserve cohort/program/capacity fields so behavior and reporting can still be tested realistically.

### Staging email send safety (required)

- Set `EMAIL_MODE=sandbox` in staging.
- Set `EMAIL_OUTBOUND_ENABLED=false` in staging by default (hard kill switch).
- Enforce hard recipient allowlist in staging before any send operation.
- Block (not queue) non-allowlisted recipients.
- Route all send paths through shared email guard helpers before provider send.
- Keep a visible staging banner that email sends are sandboxed.

### Release gates before production sends

1. Staging proves zero accidental sends to non-allowlisted recipients.
2. Participant roster-email-entry auth and coach/admin magic-link auth flows pass in staging.
3. Production sender identity/domain and pilot inbox checks are complete.

## Environment Variable Matrix (Staging vs Production)

| Variable | Staging | Production | Owner | Required By | Notes |
| --- | --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_APP_ENV` | `staging` | `production` | Build Team | Phase 0 setup | Drives environment-specific safeguards |
| `NEXT_PUBLIC_SITE_URL` | Staging URL | Production URL | Build Team | Phase 0 setup | Used for callbacks and links |
| `DATABASE_URL` | Staging Supabase DB URL | Production Supabase DB URL | Amit | Before backend wiring | Never shared across envs |
| `NEXT_PUBLIC_SUPABASE_URL` | Staging project URL | Production project URL | Amit | Before auth wiring | Public, but env-specific |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Staging anon key | Production anon key | Amit | Before auth wiring | Keep environment-scoped |
| `SUPABASE_SERVICE_ROLE_KEY` | Staging service role key | Production service role key | Amit | Before import APIs | Server-side only |
| `AUTH_SECRET` | Unique staging secret | Unique production secret | Amit | Before auth test | Different per environment |
| `RESEND_API_KEY` | Staging key | Production key | Amit | Before email test | Separate keys preferred |
| `EMAIL_FROM` | Staging sender identity | Production sender identity | Tim + Blaine | Before launch emails | Production identity should be FC-approved |
| `EMAIL_MODE` | `sandbox` | `live` | Build Team | Before staging tests | Hard send gate |
| `EMAIL_ALLOWLIST` | Internal test inbox list | Optional safety list | Amit + Build Team | Before staging tests | Required in staging |
| `EMAIL_OUTBOUND_ENABLED` | `false` | `true` | Build Team | Before staging tests | Hard outbound kill switch |
| `MAGIC_LINK_TTL_MINUTES` | `30` (default) | `30` (default) | Build Team | Auth setup | Coach/admin auth behavior |
| `TEST_ENDPOINTS_ENABLED` | `true` | `false` | Build Team | Before E2E runs | Explicit staging-only gate for `/api/test/*` routes |
| `TEST_ENDPOINTS_SECRET` | Unique staging secret | unset/blank | Build Team | Before E2E runs | Required `X-Test-Secret` header for `/api/test/*` |
| `NUDGE_CRON_ENABLED` | `false` until QA signoff | `true` | Build Team | Before cron run | Prevent accidental nudge sends |
| `CRON_SECRET` | Unique staging secret | Unique production secret | Amit | Before cron setup | Required for protected cron routes |
| `LOG_REDACTION_ENABLED` | `true` | `true` | Build Team | Before auth/email test | Prevent token/email leakage in logs |
