# FranklinCovey Coaching Platform — Project Plan

**Date**: 2026-02-18
**Last Updated**: 2026-02-18
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
| **Participant portal** | ~60 participants (first cohort) | Magic-link access → browse 3 coaches → select → book via Calendly |
| **Coach portal** | 35+ coaches | Log session notes, view assigned participants, track session status |
| **Admin portal** | Kari, Andrea (FC Ops) | Bulk participant import, nudge email automation, KPI dashboard, CSV export |

**Participant flow is intentionally simple:** one visit, one decision, done. Participants do not return to the platform after selecting a coach. Re-engagement for participants who haven't selected is handled by automated nudge emails at Day 5, Day 10, and auto-assignment at Day 15.

---

## Key Milestones

| Date | Milestone | Status |
|------|-----------|--------|
| Feb 17 | Workshop — all product decisions locked | ✅ Complete |
| **Feb 26** | Beta test with Kari on staging | 🔜 Committed |
| **Mar 2** | **Slice 1 live** — participant auth + coach selection + Calendly booking | 🎯 Hard deadline |
| **Mar 9** | **Slice 2 live** — coach portal: session logging + engagement tracking | 🎯 Hard deadline |
| **Mar 16** | **Slice 3 live** — admin portal: import, nudge emails, KPI dashboard | 🎯 Hard deadline |

---

## What FC Needs to Provide

These inputs are on the critical path. Delays here delay the March 2 launch.

| Item | Owner | Needed By | Notes |
|------|-------|-----------|-------|
| Coach bios + photos + scheduling links (~35 coaches) | Kari Sadler | Feb 21 | CSV format; includes Calendly/meeting booking links |
| First cohort participant list (~60 participants) | Kari Sadler | Feb 24 | Name + email; used for OTP invitations |
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
| **Slice 3** | March 16 | Admin CSV import, nudge emails (Day 5/10/auto-assign Day 15), KPI dashboard, CSV export |

---

## Top Risks

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **Coach data late from Kari** | Blocks seed database and beta testing | Feb 21 deadline set; chase proactively after Feb 21 |
| **Blaine approval not received pre-launch** | Blocks production infrastructure; MVP uses Vercel/Supabase so March 2 is not affected | MVP does not require Blaine sign-off; production migration is post-launch |
| **Contract not signed before March 2** | Risk of building without a signed agreement | Tim to drive; building in good faith per Greg's direction |

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
| Session logging API (COMPLETED, FORFEITED_CANCELLED, FORFEITED_NOT_USED) | Amit | Topic + Outcome dropdowns; private notes |
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

5. **Contract follow-up** — Greg confirmed we should build. Ensure Blaine sign-off is tracked as a parallel workstream. Tim owns the relationship path.

6. **Chase coach data from Kari if not received by Feb 21** — Coach bios + photos + Calendly links are on the critical path for March 2. Text Kari if no response by end of Feb 21.
