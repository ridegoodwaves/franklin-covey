# Status Note for Tim — MVP Implementation Readiness (Feb 18, 2026)

## Project Plan File You Asked About

The main project plan doc is:
- `franklin-covey/docs/plans/2026-02-18-fc-project-plan.md`

It matches the "tiered plan" format built for Tim (FC-shareable top section + internal action items at bottom).

## What Is Ready on Auth Scope (Decision-Ready and Frozen)

These are locked and ready for implementation:
- Participant access is fixed to USPS-sent coach-selector link + participant access code (no system-sent participant email in MVP).
- Coach/admin auth model is fixed to shared `/auth/signin` magic-link flow with fresh-link re-auth after timeout.
- Auth-related API contract paths are frozen for MVP.
- Participant flow is frozen: access code -> 3 coaches -> optional remix -> select -> confirmation (no return dashboard).
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
- Use-it-or-lose-it behavior confirmed as manual for ALP/MLP only: no auto-lock/forfeit; overdue Session 1/2 items should surface as "Needs Attention". EF/EL does not use this model.

Source refs:
- `franklin-covey/docs/plans/2026-02-18-fc-project-plan.md:4`
- `franklin-covey/docs/plans/2026-02-18-fc-project-plan.md:97`
- `franklin-covey/docs/plans/2026-02-18-fc-project-plan.md:105`
- `franklin-covey/docs/drafts/2026-02-18-mvp-contract-v1.md:80`

## Hard Must-Haves (ASAP) to Avoid Implementation Delay

These are critical-path items for Slice 1 timeline integrity:

1. FC coach data package by Feb 23, 2026
- Bios, photos, scheduling links for MLP/ALP panel.
- Coach bio videos are not required for MVP.
- Accept direct booking URLs from Calendly, Acuity, or equivalent.
- Send available batch now; remaining links due Monday, Feb 23, 2026.
- Without this, self-serve booking coverage drops and manual coach-outreach load increases in Slice 1.

2. First participant lists by Feb 24
- ALP-135 + MLP-80 with name/email/cohort code/cohort start date.
- Current confirmed count for each is 30 participants.
- Without this, access-code auth and cohort-based timing/flag logic cannot be validated on real data.

3. Sender domain decision by Feb 21
- Tim + Blaine to confirm sending identity (proposed `coaching@franklincovey.com`).
- Needed for launch-email trust/deliverability setup.

4. Communication tracker execution confirmation
- Confirm FC preference on whether CIL tracks participant/coach send status fields internally and FC only confirms exceptions.
- Needed for clean per-cohort comms accountability once windows open.

5. Keep MVP contract freeze in effect (no breaking scope churn)
- If edits are needed, constrain them to open-items/change-control sections only.
- Protects March 2 date from late API/state-model changes.

6. FC path decision by end of day Feb 23, 2026
- Explicitly choose between Path A (build directly in FC AWS from day one; higher March launch risk) and Path B (recommended: launch on Vercel + Supabase bridge with conditional controls while VSA is in progress, then migrate to FC AWS ~30 days post-launch, dependency-driven).
- Without this decision, launch-risk ownership remains ambiguous.

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
| **P0** | Blocking/critical issue that prevents launch-critical work or breaks core flow | Participants cannot complete access-code login, or coach selection API fails for all users | Immediate triage same day |
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

Decision scope is ready, but backend implementation foundation has not been scaffolded yet in this repo snapshot:
- `prisma/` missing
- `src/app/api/` missing
- `.env.example` missing

Meaning: requirements are sufficiently locked to start implementation now; remaining risk is mainly data/input timing, not product-definition ambiguity.

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
- Enforce hard recipient allowlist in staging before any send operation.
- Block (not queue) non-allowlisted recipients.
- Keep a visible staging banner that email sends are sandboxed.

### Release gates before production sends

1. Staging proves zero accidental sends to non-allowlisted recipients.
2. Participant access-code and coach/admin magic-link auth flows pass in staging.
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
| `ACCESS_CODE_MAX_ATTEMPTS` | `5` (default) | `5` (default) | Build Team | Auth setup | Lockout threshold for participant access code attempts |
| `MAGIC_LINK_TTL_MINUTES` | `30` (default) | `30` (default) | Build Team | Auth setup | Coach/admin auth behavior |
| `NUDGE_CRON_ENABLED` | `false` until QA signoff | `true` | Build Team | Before cron run | Prevent accidental nudge sends |
| `CRON_SECRET` | Unique staging secret | Unique production secret | Amit | Before cron setup | Required for protected cron routes |
| `LOG_REDACTION_ENABLED` | `true` | `true` | Build Team | Before auth/email test | Prevent token/email leakage in logs |
