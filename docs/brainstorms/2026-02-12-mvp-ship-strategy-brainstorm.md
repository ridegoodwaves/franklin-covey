# MVP Ship Strategy Brainstorm

**Date**: 2026-02-12 (updated 2026-02-13 with Tim call decisions, 2026-02-17 with workshop resolutions)
**Status**: Complete — all open questions resolved
**Participants**: Amit + Claude
**Next Step**: `/workflows:plan` to break into implementation tasks

---

## What We're Building

Ship the FranklinCovey Coaching Platform MVP by connecting the existing polished frontend (~60% built, hardcoded demo data) to a real backend, hitting two hard deadlines:

- **March 2**: Coach Selector live (~60 USPS participants, first cohort — 400 total across all programs over 6 months)
- **March 16**: Full portal (coach + admin dashboards) live

The platform serves three portals (Participant, Coach, Admin) for a government coaching engagement program scaling to ~30 coaches (MLP/ALP shared panel) and 4 programs.

## Why This Approach: Vertical Slices

We chose **vertical slices** over backend-first or progressive enhancement because:

1. **Deadline alignment** — Slice 1 (coach selector) maps directly to the March 2 deadline. We don't need the full backend to ship the first milestone.
2. **Risk containment** — Each slice is independently deployable. If Slice 3 runs late, Slices 1 and 2 are already live.
3. **Existing frontend advantage** — Pages are already built with polished UX. Each slice replaces hardcoded data with real API calls, so we see results fast.

### The Three Slices

**Slice 1 — Coach Selector (target: March 2)**
- Prisma schema initialization (full schema, not just what Slice 1 needs)
- Participant OTP auth (generic link + email + one-time code)
- Coach pool API (capacity-aware, 3 randomized coaches — no filters per Feb 17 workshop)
- Wire `/participant/select-coach` to real data
- Email provider setup (for OTPs — reused later for nudges)
- Deploy to production (Docker standalone, PostgreSQL)

**Slice 2 — Coach Engagement (target: March 9)**
- Session logging API (structured dropdowns: topics, outcomes, duration, private notes)
- "Book Next Session" button with real `meetingBookingUrl`
- Coach dashboard with live engagement data
- Wire `/coach/dashboard` and `/coach/engagement` to real data
- Coach auth (Auth.js magic links)

**Slice 3 — Admin Portal (target: March 16)**
- Ops dashboard with real KPI queries (cached 60s)
- Executive summary view (aggregated metrics for Carrie/Greg)
- Bulk participant import (two-phase: atomic DB transaction + email batch)
- Automated nudge emails (Day 5 reminder, Day 10 reminder, Day 15 auto-assign) + nudge cron (`/api/cron/nudges`, daily 9am ET)
- Wire `/admin/dashboard`, `/admin/coaches`, `/admin/import` to real data
- Admin auth (Auth.js magic links, role-based)

## Key Decisions

### 1. Participant Auth: Hybrid Generic Link + OTP
- **What**: One generic URL shared with all 400 participants. They enter their email, receive a one-time code, verify identity.
- **Why**: Easy distribution (1 URL, not 400 unique links) + verified identity (OTP proves email ownership). Avoids both the security weakness of email-only lookup and the distribution complexity of HMAC tokens.
- **Implication**: Email provider (Resend or AWS SES) needed from Slice 1. OTP table in schema. 5-minute expiry, 3-attempt limit.

### 2. Dashboard Views: Ops + Executive Summary
- **What**: Two admin views instead of three. Full Ops dashboard for Andrea's daily workflow. Simplified executive summary for Carrie (coaching director) and Greg (VP).
- **Why**: 2x is buildable by March 16. Three bespoke dashboards would push past deadline. Executive summary can evolve into separate Carrie/Greg views post-launch.
- **Implication**: Admin portal needs a view toggle or tab. Executive summary = completion rates, program health, coach utilization — no drill-down.

### 3. Multi-Program: Soft Support (Schema-Ready, UI-Later)
- **What**: Add `Program` model to Prisma schema. Tag every engagement with a `programId`. But don't build program-scoped admin UX for MVP.
- **Why**: CIL Brief says 4 programs from day 1, but only the USPS engagement needs full UI for March. Schema migration later is painful; adding a model now is cheap.
- **Implication**: Seed script creates 4 programs. All engagements belong to a program. Dashboard queries can filter by program when UI is ready.

### 5. Multi-Organization Architecture: Infrastructure from Day 1 (added 2026-02-13)
- **What**: Add `Organization` model as the top-level tenant. Programs belong to Organizations. The current government coaching contract is one Organization among potentially many. Greg explicitly requires "infrastructure for the full platform up front."
- **Why**: FC's existing portal already has multiple clients (shown in their current screenshots — Abit, ABD, Associate Bank, etc.). This government contract would be one dropdown among many. If we don't build the org layer now, a painful multi-tenant migration is needed when the next client onboards — and the next client (USPS, ~$6M contract) depends on this platform demonstrating outcomes.
- **Implication**: `Organization` model in schema. `Program.organizationId` FK. All queries scoped to org. MVP UI shows only one org (hardcoded or session-derived). No org-switching admin UI for MVP — that's future roadmap. This is the "shadow deliverable" Tim identified: the three visible deliverables (coach selector, coach portal, ops dashboard) all sit on top of multi-org plumbing.
- **Schema impact**: New `Organization { id, name, slug, active, createdAt }` model. `Program` gets `organizationId` FK. Potentially `User` gets org scope for future.

### 6. Nudge Strategy: Email Reminders + Dashboard Flags (updated 2026-02-17 — REVERSED from 2026-02-13)
- **What**: Automated email nudges for stalled participants + dashboard flags for ops visibility. Three escalation levels: Day 5 gentle reminder email, Day 10 second reminder email, Day 15 auto-assign coach (system assigns, no more participant choice).
- **Why**: Feb 17 workshop confirmed FC needs proactive participant outreach. Dashboard-only flags (2026-02-13 decision) don't reach participants who never log in — the exact population that needs nudging. Email infrastructure already exists for OTP auth, so incremental cost of 2-3 email templates is low.
- **Implication**: Slice 3 needs email templates for nudge reminders. `NudgeLog` table tracks both dashboard flags AND email sends. Auto-assignment at Day 15 requires new logic: system selects coach (capacity-weighted) and creates engagement without participant input. Initial access link still sent by USPS internally (not from FC/CIL domain — spam filter risk).
- **History**: De-scoped to dashboard-only on 2026-02-13 (Tim call). Re-scoped to emails on 2026-02-17 (workshop). FC explicitly wants automated re-engagement, not manual ops follow-up.

### 4. Backend Stack: Next.js API Routes + Prisma (Same Repo)
- **What**: Server actions + API routes in the existing Next.js 15 app. Prisma ORM with PostgreSQL.
- **Why**: Fastest path to March deadlines. No cross-repo coordination, no separate deployment pipeline. The frontend is already here.
- **Implication**: `/src/app/api/` for API routes. Prisma client in `/src/lib/prisma.ts`. Server actions where appropriate for form mutations.

## Open Questions — ALL RESOLVED (2026-02-17 workshop)

1. **Email provider**: ~~Resend vs AWS SES~~ — Decision still pending, but now more urgent: nudge emails are back in scope (Day 5, Day 10, Day 15). Need provider for OTP + magic links + nudge emails. **Status: pick before Slice 1 starts.**
2. **Deployment target**: ~~Docker on which cloud?~~ CIL builds on own Dockerized infrastructure. Migration to FC later (pending Blaine/IT). **RESOLVED.**
3. **Coach filtering**: ~~Participant-driven or system-driven?~~ **RESOLVED: No filters.** Participants see 3 capacity-weighted randomized coaches. Bio + video drive selection. Filters removed entirely.
4. **20-minute intro interviews**: ~~Calendly link or tracked feature?~~ **RESOLVED: Deferred.** EF/EL (5-session programs) launch later with separate coach panel. Not in March 2 scope.
5. **Sponsor teams**: ~~MVP or post-launch?~~ **RESOLVED: Deferred.** Not discussed in workshop. Remains future roadmap.
6. **Multi-org depth**: ~~Schema-only or UI too?~~ **RESOLVED: Schema-only for MVP.** Organization model in schema, programs belong to orgs. No org-switching admin UI. Greg confirmed scalable platform vision.
7. **Nudge mechanism**: ~~Dashboard flags vs emails?~~ **RESOLVED: BOTH.** Email nudges (Day 5 reminder, Day 10 reminder, Day 15 auto-assign coach) + dashboard flags. Reverses 2026-02-13 de-scoping. FC explicitly wants automated re-engagement.
8. **Admin filter/report categories**: ~~TBD in workshop~~ **RESOLVED:** Filtering by status and coach for MVP. Org/program filtering deferred. "Needs Attention" as default dashboard view (top of page).

## Pre-Development Checklist

Before starting Slice 1:
- [ ] Confirm email provider choice (Resend vs SES — now more urgent with nudge emails back in scope)
- [x] ~~Confirm deployment target / cloud provider~~ — CIL Dockerized infrastructure (resolved Feb 17)
- [ ] Initialize Prisma schema with full model set (including Program, Organization)
- [ ] Set up PostgreSQL (local dev + staging)
- [x] ~~Resolve participant auth flow at Feb 18 workshop~~ — Generic link + OTP confirmed (resolved Feb 17)
- [ ] Complete visual QA of brand refresh (from previous session handoff)
- [x] ~~Receive competency list from Carrie~~ — received Feb 17. MLP: 7 managerial competencies. ALP/EF/EL: 7 executive competencies. Implemented in `src/lib/config.ts`.
- [ ] Receive coach data from Carrie (bios, videos, participant list) — expected Feb 17-18

---

*Generated from brainstorm session. Next: `/workflows:plan` to create detailed implementation tasks per slice.*
