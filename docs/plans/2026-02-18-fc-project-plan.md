# FranklinCovey Coaching Platform — Project Plan

**Date**: 2026-02-18
**Last Updated**: 2026-02-18 (P0 updates: Vercel/Supabase confirmed, contract signed, 24-hour decision owner confirmed, coach panel split clarified, session status policy + forfeiture labels clarified, nudge Day 0 anchor clarified, pre-training coach selection timing clarified, operating cadence + feedback process added)
**Status**: Active Build — Phase 0 starting today

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
| **Participant portal** | ~400 participants across all cohorts (coach selection starts March 2, before in-person week) | OTP access → browse 3 coaches → select → book via Calendly |
| **Coach portal** | 31 coaches (15 MLP/ALP panel + 16 EF/EL panel) | Log session notes, view assigned participants, track session status |
| **Admin portal** | Kari, Andrea (FC Ops) | Bulk participant import, nudge email automation, KPI dashboard, CSV export |

**Participant flow is intentionally simple:** one visit, one decision, done. Participants do not return to the platform after selecting a coach. Re-engagement for participants who haven't selected is handled by automated nudge emails at Day 5, Day 10, and auto-assignment at Day 15. **Day counters are measured from cohort start date (Day 0).**

---

## Key Milestones

| Date | Milestone | Status |
|------|-----------|--------|
| Feb 17 | Workshop — all product decisions locked | ✅ Complete |
| **Feb 26** | Beta test with Kari on staging | 🔜 Committed |
| **Mar 2** | **Slice 1 live** — participant auth + coach selection + Calendly booking | 🎯 Hard deadline |
| **Mar 9** | **Slice 2 live** — coach portal: session logging + engagement tracking | 🎯 Hard deadline |
| **Mar 12** | ALP-135 first participants access platform (earliest cohort) | 🎯 Must be live |
| **Mar 16** | **Slice 3 live** — admin portal: import, nudge emails, KPI dashboard | 🎯 Hard deadline |
| Mar 16 | MLP-80 + EF-1 in-person training begins (coaching window opens after) | FC milestone |
| Mar 23 | ALP-136 + EF-2 in-person training begins | FC milestone |
| Mar 27+ | EF-1 coaching begins | FC milestone |
| Apr 6 | ALP-137 + EL-1 in-person training begins | FC milestone |
| Apr 10+ | EL-1 coaching begins | FC milestone |
| Apr 20 | MLP-81 + EF-2 in-person training begins | FC milestone |

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
| **138** | 6/1 – 6/3 | **6/4 – 7/31** | 8/3 – 8/6 | **8/7 – 11/6** ⚠️ |

> ⚠️ ALP-138 Session 2 start date in source doc shows 8/4, which conflicts with Week 2 ending 8/6. Assumed 8/7 (day after Week 2 ends). **Confirm with Kari.**

*MLP/ALP: Session 1 occurs between Week 1 and Week 2. Session 2 occurs within 3 months following Week 2 completion.*

### EF Cohorts — 5 sessions per participant (coaching window TBD)

| Cohort | In-Person Training | Coaching Starts |
|--------|--------------------|----------------|
| **1** | 3/23 – 3/26 | After 3/26 |
| **2** | 4/20 – 4/23 | After 4/23 |
| **3** | 6/8 – 6/11 | After 6/11 |
| **4** | 6/22 – 6/25 | After 6/25 |
| **5** | 8/3 – 8/6 | After 8/6 |

### EL Cohorts — 5 sessions per participant (coaching window TBD)

| Cohort | In-Person Training | Coaching Starts |
|--------|--------------------|----------------|
| **1** | 4/6 – 4/9 | After 4/9 |
| **2** | 5/11 – 5/14 | After 5/14 |
| **3** | 6/1 – 6/4 | After 6/4 |

*EF/EL: Coaching can start any time after in-person session ends. Coaching window close date still being determined by FC.*

---

## Confirmed P0 Decisions (Locked)

- MVP deployment target is **Vercel + Supabase**.
- FC confirmed a **24-hour turnaround owner** for blocking decisions through March 16.
- Contract status: **signed**.
- Coach pools are **separate by track family**: MLP/ALP panel and EF/EL panel are distinct pools (no cross-pool matching in MVP).
- Session outcomes are **coach-entered only** (`COMPLETED`, `FORFEITED_CANCELLED`, `FORFEITED_NOT_USED`). For forfeited Session 1, coaches log either **"Session forfeited - canceled within 24 hours"** or **"Session forfeited - not taken advantage of"**. No automatic Session 1 lock/expiry by May window deadlines in MVP.
- Nudge timing anchor is locked: **Day 0 = cohort start date**.
- Capacity counting rule is locked: count participants in `COACH_SELECTED`, `IN_PROGRESS`, and `ON_HOLD`; exclude `INVITED`, `COMPLETED`, and `CANCELED`.

---

## Open Questions (Pending Kari/FC)

| Question | Impact |
|----------|--------|
| **ALP-138 Session 2 start date** — source shows 8/4 but Week 2 ends 8/6; assumed 8/7 | Minor date correction only |
| **Participant counts per cohort (final)** | Required to validate capacity holds across overlapping cohorts (MLP/ALP panel locked at 15 coaches; EF/EL panel locked at 16) |
| **EF/EL coaching window close** — "still determining" | Needed for ops reporting/calendar views; does not drive automatic session status changes in MVP |

---

## What FC Needs to Provide

These inputs are on the critical path. Delays here delay the March 2 launch.

| Item | Owner | Needed By | Notes |
|------|-------|-----------|-------|
| Coach bios + photos + scheduling links (MLP/ALP panel) | Kari Sadler | Feb 21 | CSV format; includes Calendly/meeting booking links |
| ALP-135 participant list (first coach selection window starts March 2) | Kari Sadler | Feb 24 | Name + email + cohort code + cohort start date (Day 0 for nudges); platform must be live by 3/2 |
| MLP-80 participant list | Kari Sadler | Feb 24 | Name + email + cohort code + cohort start date (Day 0 for nudges); coaching window opens 3/16 |
| Beta testing time — Kari + 1-2 staff | Kari Sadler | Feb 26 (full day) | Verbally confirmed at workshop |
| Email sender domain decision | Tim + Blaine | Feb 21 | Proposed: `coaching@franklincovey.com` |
| IT approval (Blaine) | Tim to facilitate | ASAP | Required for production infrastructure; not MVP blocker |

---

## What CIL Delivers

| Slice | Delivery Date | What Ships |
|-------|--------------|-----------|
| Staging environment | Feb 25 | Full Slice 1 on Vercel + Supabase; smoke-tested |
| **Slice 1** | March 2 | Participant OTP auth, coach selector (3 capacity-weighted coaches, 1 remix), confirmation + Calendly link |
| **Slice 2** | March 9 | Coach magic-link auth, session logging (topic + outcome), engagement tracking |
| **Slice 3** | March 16 | Admin CSV import, nudge emails (Day 5/10/auto-assign Day 15, measured from cohort start date), KPI dashboard, CSV export |

---

## Working Cadence and Feedback Process

### Meeting Cadence (every other day)

| Cadence | Participants | Focus |
|---------|--------------|-------|
| Every other day (30 minutes) | Tim + Amit (+ FC stakeholders as needed) | Progress updates, blocking issues, confusing items to brainstorm together |

### Feedback Priority System

| Priority | Definition | Expected Turnaround |
|----------|------------|---------------------|
| **P0** | Blocking/critical issue that prevents launch-critical work or breaks core flow | Immediate triage same day |
| **P1** | Urgent fix needed for upcoming milestone quality or timeline protection | Prioritize in next build window (typically within 24 hours) |
| **P2** | Nice-to-have or non-blocking enhancement | Backlog and schedule against milestone capacity |

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
| **Coach data late from Kari** | Blocks seed database and beta testing | Feb 21 deadline set; chase proactively after Feb 21 |
| **Blaine approval not received pre-launch** | Blocks production infrastructure; MVP uses Vercel/Supabase so March 2 is not affected | MVP does not require Blaine sign-off; production migration is post-launch |
| **Participant counts by cohort not finalized** | Capacity model could still be wrong during overlap windows | Keep panel split fixed at 15 (MLP/ALP) and 16 (EF/EL); lock per-cohort counts with Kari and rerun capacity checks before final Slice 1 load tests |
| **Coach session logging lag** | Ops visibility can drift if coaches delay status entry | Use dashboard "Needs Attention" monitoring and ops follow-up cadence; no auto-forfeiture mutations in MVP |

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
| Install Prisma, iron-session, Auth.js, Resend, React Email | Amit | `npm install` + `npx prisma init` |
| Write full Prisma schema (11 models, all enums + indexes) | Amit | ERD finalized in vertical slices plan |
| Create Supabase project, run first migration | Amit | Needs Supabase account setup |
| docker-compose.yml (PostgreSQL + Mailpit) | Amit | Local dev email interception |
| Dockerfile — 3-stage build, ECS-ready | Amit | Design-for-portability requirement |
| Seed script — 1 org, 4 programs, 5 sample coaches, 8 test participants | Amit | Uses anonymized data; real coaches imported separately |
| `.env.example` with all required vars documented | Amit | |

### Slice 1: Participant Coach Selector (Feb 22 – Mar 2)

| Task | Owner | Notes |
|------|-------|-------|
| OTP auth endpoints (request + verify) | Amit | HMAC 6-digit, 5-min expiry, rate-limited |
| Iron-session participant session | Amit | |
| React Email OTP template | Amit | Sent via Resend |
| Coach selection API (capacity-weighted randomization) | Amit | 3 coaches shown, 1 remix, row-level locking |
| Participant frontend wiring (remove hardcoded data, remove filters) | Amit | Flow ends at confirmation page |
| Coach CSV import script | Amit | Sanitize-by-default; real data via `--raw` flag |
| Deploy to Vercel staging | Amit | Feb 25 |
| Beta test with Kari | Kari + Amit | Feb 26 — full day |
| Bug fixes + load test + production deploy | Amit | Feb 27 – Mar 2 |

### Slice 2: Coach Engagement Portal (Mar 3 – 9)

| Task | Owner | Notes |
|------|-------|-------|
| Auth.js magic-link auth for coaches + admins | Amit | 30-min idle timeout; dual-auth routing |
| Session logging API (COMPLETED, FORFEITED_CANCELLED, FORFEITED_NOT_USED) | Amit | Topic + Outcome dropdowns; forfeiture labels: "canceled within 24 hours" / "not taken advantage of"; private notes |
| Coach dashboard + engagement detail + session logging form | Amit | Auto-save on form |

### Slice 3: Admin Portal (Mar 10 – 16)

| Task | Owner | Notes |
|------|-------|-------|
| Admin KPI dashboard (enrollment rate, session completion, forfeiture rate) | Amit | |
| Bulk CSV import + validation | Amit | Atomic Phase A (validate) + async Phase B (email invitations) |
| Nudge system — Day 5, Day 10 emails + Day 15 auto-assign cron | Amit | Idempotent; dashboard flags |
| CSV export + printable reports | Amit | Browser print-to-PDF via `@media print` |

---

## Tim's Action Items [INTERNAL]

These are the blockers **Tim** needs to drive. Amit handles everything on the build side.

1. **Email `datasecurity@franklincovey.com`** — kicks off NDA + IT procurement with Blaine. Do this week.

2. **Introduce Amit to Blaine** — IT approval is needed for production infrastructure (AWS ECS, SendGrid, Okta). Not blocking March 2, but a delay here pushes the production migration.

3. **Propose email sender address to Blaine** — Suggested: `coaching@franklincovey.com`. Blaine explicitly asked about this; needs an answer before production email goes live.

4. **Request `coaching.franklincovey.com` from Blaine/DNS team** — Can do after March 2 MVP is validated; needs lead time.

5. **Contract status** — Signed (closed). If scope expands, route through change-order approval path.

6. **Chase coach data from Kari if not received by Feb 21** — Coach bios + photos + Calendly links are on the critical path for March 2. Text Kari if no response by end of Feb 21.
