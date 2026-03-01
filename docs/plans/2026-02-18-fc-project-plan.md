# FranklinCovey Coaching Platform — Project Plan

**Date**: 2026-02-18
**Last Updated**: 2026-02-28 (Slice 2/3 reorder locked; March 9 admin visibility prioritized; coach portal moved to March 16)
**Status**: Active Build — Slice 1 staging flow live with launch-safety controls

---

<!-- ════════════════════════════════════════════════════════
     FC-SHAREABLE SECTION
     Tim: everything above the internal divider is safe to forward
     ════════════════════════════════════════════════════════ -->

## Project Overview

CIL is building a custom coaching platform for FranklinCovey's leadership development programs. The platform enables ~400 USPS participants across four programs (MLP, ALP, EF, EL) to browse a curated panel of 35+ coaches, select their coach, and book their first session — all in a single, guided flow. Coaches log session notes through a dedicated portal; program ops manages participant data and outcomes through an admin dashboard.

The platform ships in three milestones between now and March 16, aligned to the cohort launch schedule confirmed in the Feb 17 workshop.

---

## What We're Building

| Portal | Who Uses It | Key Capabilities |
|--------|-------------|-----------------|
| **Participant portal** | ~400 participants across all cohorts (coach selection starts March 2, before in-person week) | USPS-sent cohort welcome email -> participant enters roster-matched email -> browse 3 coaches -> select -> book via coach scheduling link when available (Calendly/Acuity/etc.), otherwise receive coach outreach follow-up |
| **Coach portal** | 31 coaches (15 MLP/ALP panel + 16 EF/EL panel) | Log session notes, view assigned participants, track session status |
| **Admin portal** | Kari, Andrea (FC Ops) | Bulk participant import, needs-attention monitoring, KPI dashboard, CSV export |

**Participant flow is intentionally simple:** one visit, one decision, done. Participants do not return to the platform after selecting a coach. In MVP, USPS/FC Ops own reminder communications; CIL system emails are limited to coach/admin magic-link access and do not include participant reminders.

---

## Key Milestones

| Date | Milestone | Status |
|------|-----------|--------|
| Feb 17 | Workshop — all product decisions locked | ✅ Complete |
| **Feb 26** | Beta test with Kari on staging | 🔜 Committed |
| **Mar 2** | **Slice 1 live** — participant auth + coach selection + scheduling-link booking | 🎯 Hard deadline |
| **Mar 9** | **Slice 2 live** — admin dashboard visibility (KPIs, engagement reporting, coach roster, CSV export) | 🎯 Hard deadline |
| **Mar 12** | ALP-135 first participants access platform (earliest cohort) | 🎯 Must be live |
| **Mar 16** | **Slice 3 live** — coach portal: session logging + engagement tracking (+ bulk import execution) | 🎯 Hard deadline |
| Mar 16 | MLP-80 + EF-1 in-person training begins (coaching window opens after) | FC milestone |
| Mar 23 | ALP-136 + EF-2 in-person training begins | FC milestone |
| Mar 27+ | EF-1 coaching begins | FC milestone |
| Apr 6 | ALP-137 + EL-1 in-person training begins | FC milestone |
| Apr 10+ | EL-1 coaching begins | FC milestone |
| Apr 20 | MLP-81 + EF-2 in-person training begins | FC milestone |

---

## Implementation Update (Completed — Feb 25, 2026)

- Staging Supabase schema applied and migration recorded (`20260225_init_multi_org`).
- USPS baseline seed loaded in staging: 4 programs, 14 cohorts, 32 coach memberships, 175 participants, 175 engagements.
- Admin users seeded in staging: Amit + Tim (Kari/Andrea pending email addresses).
- Multi-org-ready foundation is now in schema (single DB with strict org scoping).
- Staging email safety controls hardened:
  - `EMAIL_OUTBOUND_ENABLED=false` default in staging
  - shared email guard required for all send paths
  - allowlist + sandbox mode still required
- Normalized import artifacts are generated from source files for repeatable staging imports (`npm run data:build:staging`).
- Slice 1 participant route wiring shipped:
  - `POST /api/participant/auth/verify-email`
  - `GET /api/participant/coaches`
  - `POST /api/participant/coaches/remix`
  - `POST /api/participant/coaches/select`
- Coach/admin magic-link request + consume flow shipped on live API routes.
- Headshot pipeline repaired for canonical + legacy storage folder names; signed URL path fixed.
- Targeted staging bio backfill script added and executed against current coach set.
- Selection/auth security hardening shipped:
  - `WINDOW_CLOSED` lock behavior normalized in participant flow
  - coach selection concurrency lock to reduce over-assignment races
  - one-time-use magic-link consume
  - per-email participant auth lockout (in addition to per-IP limiter)
- Supabase pooler safety enforced:
  - `DATABASE_URL` must include `?pgbouncer=true`
  - `DIRECT_URL` retained for direct Postgres migration/admin use

Detailed commit changelog:
- `docs/briefings/2026-02-25-shipped-changelog.md`

---

## Cohort Schedule (Source: FY26 Coaching Timelines — Kari Sadler, 2026-02-18)

### MLP Cohorts — 2 sessions per participant

| Cohort | Week 1 In-Person | Session 1 Coaching Window | Week 2 In-Person | Session 2 Coaching Window |
|--------|-----------------|--------------------------|-----------------|--------------------------|
| **80** | 3/9 – 3/11 | **3/16 – 5/15** | 5/18 – 5/20 | **5/21 – 8/20** |
| **81** | 4/20 – 4/22 | **4/27 – 6/19** | 6/22 – 6/24 | **6/25 – 9/24** |

### ALP Cohorts — 2 sessions per participant

| Cohort | Week 1 In-Person | Session 1 Coaching Window | Week 2 In-Person | Session 2 Coaching Window |
|--------|-----------------|--------------------------|-----------------|--------------------------|
| **135** | 3/9 – 3/11 | **3/12 – 5/8** | 5/11 – 5/14 | **5/15 – 8/14** |
| **136** | 3/23 – 3/25 | **3/26 – 5/15** | 5/18 – 5/21 | **5/22 – 8/21** |
| **137** | 4/6 – 4/8 | **4/9 – 6/5** | 6/8 – 6/11 | **6/12 – 9/11** |
| **138** | 6/1 – 6/3 | **6/4 – 7/31** | 8/3 – 8/6 | **8/7 – 11/6** |

> ALP-138 Session 2 start date is confirmed as **8/7/2026** (Kari update, Feb 20, 2026).

*MLP/ALP: Session 1 occurs between Week 1 and Week 2. Session 2 occurs within 3 months following Week 2 completion.*

### EF Cohorts — 5 sessions per participant (flexible pacing)

| Cohort | In-Person Training | Coaching Starts |
|--------|--------------------|----------------|
| **1** | 3/23 – 3/26 | After 3/26 |
| **2** | 4/20 – 4/23 | After 4/23 |
| **3** | 6/8 – 6/11 | After 6/11 |
| **4** | 6/22 – 6/25 | After 6/25 |
| **5** | 8/3 – 8/6 | After 8/6 |

### EL Cohorts — 5 sessions per participant (flexible pacing)

| Cohort | In-Person Training | Coaching Starts |
|--------|--------------------|----------------|
| **1** | 4/6 – 4/9 | After 4/9 |
| **2** | 5/11 – 5/14 | After 5/14 |
| **3** | 6/1 – 6/4 | After 6/4 |

*EF/EL: Coaching can start any time after in-person session ends. Kari confirmed these cohorts are not complete by Nov 6, 2026 and are expected to have about 9 months to use 5 sessions; reporting anchor is confirmed as coach-selection-window start + 9 months.*

---

## Confirmed P0 Decisions (Locked)

- MVP deployment target is **Vercel + Supabase**.
- FC confirmed a **24-hour turnaround owner** for blocking decisions through March 16.
- Contract status: **signed**.
- Coach pools are **separate by track family**: MLP/ALP panel and EF/EL panel are distinct pools (no cross-pool matching in MVP).
- All coach capacity confirmed at **20 participants per coach** across all pools (MLP/ALP updated from 15 to 20; Kari confirmed 2026-02-24).
- MVP planning baseline is confirmed at **400 total participants** across cohorts.
- Session outcomes are **coach-entered only** (`COMPLETED`, `FORFEITED_CANCELLED`, `FORFEITED_NOT_USED`). For forfeited Session 1, coaches log either **"Session forfeited - canceled within 24 hours"** or **"Session forfeited - not taken advantage of"**. No automatic Session 1 lock/expiry by May window deadlines in MVP.
- Nudge timing anchor is locked: **Day 0 = cohort start date**.
- Capacity counting rule is locked: count participants in `COACH_SELECTED`, `IN_PROGRESS`, and `ON_HOLD`; exclude `INVITED`, `COMPLETED`, and `CANCELED`.
- Coach booking is **link-based and tool-agnostic** for MVP: direct coach scheduling URLs are accepted (Calendly, Acuity, or equivalent). Coaches without an active link may still be selected; confirmation should show "Your coach will reach out within 2 business days" and coach outreach follow-up is required, surfaced via "Needs Attention" if delayed.
- Coach bio **videos are de-scoped from MVP** for the coach selector experience.
- ALP-138 Session 2 date is confirmed: **Aug 7, 2026**.
- Participant comms owner confirmed: **USPS** sends welcome email on each cohort's coach-selection window start date.
- Coach access comms owner confirmed: **Andrea and/or Kari**, sent once coach session logging is active (**March 16**).
- Participant communication boundary is confirmed: **USPS sends participant access communications; CIL system does not send participant emails in MVP**.
- Participant entry model confirmed by Kari: **email-entry only** for MVP (no participant access code), aligned to USPS cohort group-email workflow and FC sender restrictions.
- Participant auth safeguards for MVP: roster-only allowlist + active cohort-window gating + rate limiting + generic auth errors + audit logging.
- Coach/admin auth architecture for MVP remains custom magic-link + signed portal session + Resend delivery. Supabase Auth migration is explicitly post-MVP.
- Coach/admin magic-link throttles are locked for MVP: 60s resend cooldown, 6/hour per email, 30/hour per IP (plus optional 10/10min IP burst guard).
- Admin role remains global-capable, but MVP reporting scope is USPS-only.
- Dashboard activity semantics are locked for MVP: activity begins at coach selection; `coachSelectedAt` and `lastActivityAt` are tracked separately from session counts.
- Use-it-or-lose-it handling confirmed as **manual for ALP/MLP only**: no automatic lock/forfeit; use dashboard "Needs Attention" for ops follow-up when Session 1/2 is not scheduled by deadline. **EF/EL does not use this model**.

---

## Security + Platform Baseline (MVP)

To reduce launch risk and keep security posture aligned with client delivery expectations, the MVP baseline is:

- **Vercel Pro** (not Hobby) for commercial deployment and team operations.
- **Supabase Pro** for launch with:
  - daily backups with 7-day restore window
  - Row Level Security (RLS) enforcement on user-facing tables
  - 7-day log retention (current Pro plan) for launch debugging and auditability
- **Environment separation required**: distinct staging and production projects in both Vercel and Supabase, with separate secrets/keys.

Reference docs:
- Vercel security/firewall: https://vercel.com/docs/security#multi-layered-protection
- Supabase backups: https://supabase.com/docs/guides/platform/backups
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase logs: https://supabase.com/docs/guides/telemetry/logs

---

## Open Questions (Pending Kari/FC)

| Question | Impact |
|----------|--------|
| **Participant counts per cohort (final distribution)** | Total baseline is locked at 400, but cohort-by-cohort allocations are still needed for overlap validation and load-test realism |
| **EF/EL coach-selection end dates** | Currently missing in timeline source; staging uses temporary default (`selection start + 19 days`) until final dates are confirmed |
| **Kari + Andrea admin launch emails** | Needed to complete admin access seed in staging and run full magic-link acceptance test |
| **Greg admin launch email** | Needed to seed Greg as full ADMIN for launch-period validation |
| **Cohort comms tracking fields** — participant send date, coach send date, owner, status | Needed for clean execution tracking across later cohorts |
| **FC path choice (Path A vs Path B)** — explicit decision required | Needed by EOD Feb 23, 2026 to keep March 2 launch planning stable; Path A implies March 2 rebaseline risk |

---

## What FC Needs to Provide

These inputs are on the critical path. Delays here delay the March 2 launch.

| Item | Owner | Needed By | Notes |
|------|-------|-----------|-------|
| Coach bios + photos + scheduling links (MLP/ALP panel) | Kari Sadler | Feb 23, 2026 | CSV format; direct booking links may be Calendly, Acuity, or equivalent. Coach bio videos are not required for MVP. Send available batch now, remaining by Monday, Feb 23, 2026. Missing links use coach-outreach fallback in MVP. |
| ALP-135 participant list (first coach selection window starts March 2) | Kari Sadler | Feb 24 | **Received (2026-02-24).** Name + email + cohort code + cohort start date (Day 0 for nudges); platform must be live by 3/2 |
| `FY26 ALP 136_EF 1 Coaching Bios.xlsx` (participant detail context file) | Kari Sadler | Post-MVP | Contains participant context for potential coach-facing visibility. Not required for random coach selection and not integrated into selector logic in MVP. |
| MLP-80 participant list | Kari Sadler | Feb 24 | Name + email + cohort code + cohort start date (Day 0 for nudges); coaching window opens 3/16 |
| Remaining March cohort counts (ALP-136, ALP-137, EF-1, EL-1) + cohort-level allocations | Kari / FC Ops | Feb 24, 2026 | Total planning baseline is now locked at 400; need per-cohort detail for overlap/load-test coverage |
| Beta testing time — Kari + 1-2 staff | Kari Sadler | Feb 26 (full day) | Verbally confirmed at workshop |
| Cohort communication tracking fields (participant send date, coach send date, owner, status) | Kari + Andrea | TBD (requested) | Needed to coordinate future cohort communications |
| Kari + Andrea admin launch emails | Kari + Andrea | ASAP | Required to finish full admin magic-link staging verification |
| Greg admin launch email | Greg / FC Ops | ASAP | Required to seed Greg as full admin and validate role parity with Kari/Andrea. |
| EF/EL coach-selection end dates (explicit) | Kari + Andrea | ASAP | Replaces temporary staging default (`selection start + 19 days`) for EF/EL cohorts |
| Path decision (A: AWS day one, B: Vercel+Supabase bridge + dependency-driven migration) | Blaine + FC stakeholders | EOD Feb 23, 2026 | Recommended Path B to protect March launch; Path A increases launch-date risk and requires timeline rebaseline |
| Email sender domain decision | Tim + Blaine | ASAP | Preferred sender domain: `onusleadership.com` (or approved verified fallback); confirm final `EMAIL_FROM` for launch communications. |
| Platform tier confirmation (Vercel Pro + Supabase Pro) | Amit + Tim | Feb 21 | Required for predictable launch capacity, backups, and production support posture |
| IT approval (Blaine) | Tim to facilitate | ASAP | Required for production infrastructure; not MVP blocker |

---

## What CIL Delivers

| Slice | Delivery Date | What Ships |
|-------|--------------|-----------|
| Staging environment | Feb 25 | Full Slice 1 on Vercel + Supabase; smoke-tested |
| **Slice 1** | March 2 | Participant roster-email entry auth (USPS-delivered cohort welcome email), coach selector (3 capacity-weighted coaches, 1 remix), confirmation + scheduling-link booking when available or coach-outreach fallback |
| **Slice 2** | March 9 | Admin dashboard visibility: KPI dashboard, engagement reporting, coach roster controls, CSV export, USPS-scoped needs-attention reporting |
| **Slice 3** | March 16 | Coach magic-link auth, session logging (topic + outcome), engagement tracking, and bulk import execution |

---

## Working Cadence and Feedback Process

### Meeting Cadence (every other day)

| Cadence | Participants | Focus |
|---------|--------------|-------|
| Every other day (30 minutes) | Tim + Amit (+ FC stakeholders as needed) | Progress updates, blocking issues, confusing items to brainstorm together |

### Feedback Priority System

| Priority | Definition | Example (FC MVP) | Expected Turnaround |
|----------|------------|------------------|---------------------|
| **P0** | Blocking/critical issue that prevents launch-critical work or breaks core flow | Participants cannot complete roster-email entry/login, or coach selection API fails for all users | Immediate triage same day |
| **P1** | Urgent fix needed for upcoming milestone quality or timeline protection | USPS participant access emails are delayed for a cohort, or coach session logging fails intermittently | Prioritize in next build window (typically within 24 hours) |
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

---

## Top Risks

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **Coach data late from Kari** | Blocks seed database and beta testing | Feb 23 deadline set; chase proactively after Feb 23 |
| **Blaine approval not received pre-launch** | Blocks production infrastructure; MVP uses Vercel/Supabase so March 2 is not affected | MVP does not require Blaine sign-off; production migration is post-launch |
| **Participant counts by cohort not finalized** | Capacity model could still be wrong during overlap windows | Use 400 planning assumption short-term; lock per-cohort counts with Kari and rerun capacity checks before final Slice 1 load tests |
| **Participant access-email execution timing** | Participant entry can fail if USPS sends are late or instructions are unclear | Share USPS send checklist and include clear "look for coach-selector site link" text in each welcome send |
| **FC path decision delayed (Path A vs Path B)** | Can create scope/schedule churn and blur launch-risk ownership | Secure explicit FC path decision by EOD Feb 23, 2026; if Path A, immediately rebaseline March 2 as at-risk with revised timeline |
| **March 12–16 coach logging gap (portal live Mar 16)** | Session activity exists before portal logging is available | FC/USPS manual tracking during Mar 12–16, then retroactive coach entry after Mar 16. Track as accepted launch-window process risk. |
| **Magic-link email deliverability readiness (sender domain + DNS)** | Coach/admin login blocked if sender is not production-ready | Complete Resend domain verification + SPF/DKIM + `EMAIL_FROM` alignment before enabling live outbound. |

---

## Post-MVP

Phase 2 roadmap (April+) is available upon request — covers platform hardening, reporting workflow, and multi-client architecture.

---

<!-- ════════════════════════════════════════════════════════
     INTERNAL — DO NOT FORWARD
     Tim's action items and full build timeline below
     ════════════════════════════════════════════════════════ -->

---

## Full Build Timeline [INTERNAL]

### Phase 0: Foundation (Feb 18–21)

| Task | Owner | Notes |
|------|-------|-------|
| Install Prisma, session signing/auth helpers, Resend email plumbing | Amit | Keep existing custom magic-link auth model (no Auth.js migration in MVP) |
| Write full Prisma schema (11 models, all enums + indexes) | Amit | ERD finalized in vertical slices plan |
| Create Supabase project, run first migration | Amit | Needs Supabase account setup |
| docker-compose.yml (PostgreSQL + Mailpit) | Amit | Local dev email interception |
| Dockerfile — **post-launch (within 30 days of March 2)** | Amit | Not needed for Vercel launch; required before FC AWS migration. |
| Seed script — 1 org, 4 programs, 5 sample coaches, 8 test participants | Amit | Uses anonymized data; real coaches imported separately |
| `.env.example` with all required vars documented | Amit | |

### Slice 1: Participant Coach Selector (Feb 22 – Mar 2)

| Task | Owner | Notes |
|------|-------|-------|
| Participant access auth endpoints (verify roster email + cohort eligibility window) | Amit | No participant outbound email from system in MVP |
| Iron-session participant session | Amit | |
| Participant roster import validation + secure USPS handoff export | Amit | USPS sends participant access emails |
| Coach selection API (capacity-weighted randomization) | Amit | 3 coaches shown, 1 remix, row-level locking |
| Participant frontend wiring (remove hardcoded data, remove filters) | Amit | Flow ends at confirmation page |
| Coach CSV import script | Amit | Sanitize-by-default; real data via `--raw` flag |
| Deploy to Vercel staging | Amit | Feb 25 |
| Beta test with Kari | Kari + Amit | Feb 26 — full day |
| Bug fixes + load test + production deploy | Amit | Feb 27 – Mar 2 |

### Slice 2: Admin Visibility + Controls (Mar 3 – 9)

| Task | Owner | Notes |
|------|-------|-------|
| Admin auth middleware hardening + magic-link rate limiting | Amit | Keep custom portal-session auth; lock to 60s cooldown, 6/hour/email, 30/hour/IP |
| Admin KPI + engagement reporting + coach roster APIs | Amit | USPS-only MVP reporting scope; global-admin-ready foundation remains |
| Admin dashboard, coach roster, and CSV export wiring | Amit | Prioritize visibility/reporting for Mar 9; remove non-essential UI scope |

### Slice 3: Coach Engagement Portal + Import Execution (Mar 10 – 16)

| Task | Owner | Notes |
|------|-------|-------|
| Coach magic-link access + coach dashboard route enforcement | Amit | Coach access comms sent once session logging is active (Mar 16) |
| Session logging API (COMPLETED, FORFEITED_CANCELLED, FORFEITED_NOT_USED) | Amit | Topic + Outcome dropdowns; forfeiture labels preserved; private notes remain coach-only |
| Coach dashboard + engagement detail + session logging form | Amit | Supports retroactive entry for Mar 12–16 activity window |
| Bulk CSV import + execution | Amit | Import execution moved here from Mar 9 to protect admin visibility scope |

---

## Tim's Action Items [INTERNAL]

These are the blockers **Tim** needs to drive. Amit handles everything on the build side.

1. **Email `datasecurity@franklincovey.com`** — kicks off NDA + IT procurement with Blaine. Do this week.

2. **Introduce Amit to Blaine** — IT approval is needed for production infrastructure (AWS ECS, SendGrid, Okta). Not blocking March 2, but a delay here pushes the production migration.

3. **Confirm email sender address with Blaine** — Preferred domain is `onusleadership.com` (or approved verified fallback). Final `EMAIL_FROM` must match verified DNS/domain setup before production outbound goes live.

4. **Request `coaching.franklincovey.com` from Blaine/DNS team** — Can do after March 2 MVP is validated; needs lead time.

5. **Contract status** — Signed (closed). If scope expands, route through change-order approval path.

6. **Chase coach data from Kari if not received by Feb 23, 2026** — Coach bios + photos + scheduling links are on the critical path for smooth self-serve booking by March 2. Coaches without links use the coach-outreach fallback path and increase manual follow-up load.
