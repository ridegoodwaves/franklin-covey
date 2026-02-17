# MVP Ship Strategy Brainstorm

**Date**: 2026-02-12 (updated 2026-02-13 with Tim call decisions)
**Status**: Complete
**Participants**: Amit + Claude
**Next Step**: `/workflows:plan` to break into implementation tasks

---

## What We're Building

Ship the FranklinCovey Coaching Platform MVP by connecting the existing polished frontend (~60% built, hardcoded demo data) to a real backend, hitting two hard deadlines:

- **March 2**: Coach Selector live for 400 USPS participants
- **March 16**: Full portal (coach + admin dashboards) live

The platform serves three portals (Participant, Coach, Admin) for a government coaching engagement program scaling to 35 coaches and 4 programs.

## Why This Approach: Vertical Slices

We chose **vertical slices** over backend-first or progressive enhancement because:

1. **Deadline alignment** — Slice 1 (coach selector) maps directly to the March 2 deadline. We don't need the full backend to ship the first milestone.
2. **Risk containment** — Each slice is independently deployable. If Slice 3 runs late, Slices 1 and 2 are already live.
3. **Existing frontend advantage** — Pages are already built with polished UX. Each slice replaces hardcoded data with real API calls, so we see results fast.

### The Three Slices

**Slice 1 — Coach Selector (target: March 2)**
- Prisma schema initialization (full schema, not just what Slice 1 needs)
- Participant OTP auth (generic link + email + one-time code)
- Coach pool API (capacity-aware, filtered by location/language/specialty/credential)
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
- Executive summary view (aggregated metrics for Kari/Greg)
- Bulk participant import (two-phase: atomic DB transaction + email batch)
- Automated nudge cron (`/api/cron/nudges`, daily 9am ET)
- Wire `/admin/dashboard`, `/admin/coaches`, `/admin/import` to real data
- Admin auth (Auth.js magic links, role-based)

## Key Decisions

### 1. Participant Auth: Hybrid Generic Link + OTP
- **What**: One generic URL shared with all 400 participants. They enter their email, receive a one-time code, verify identity.
- **Why**: Easy distribution (1 URL, not 400 unique links) + verified identity (OTP proves email ownership). Avoids both the security weakness of email-only lookup and the distribution complexity of HMAC tokens.
- **Implication**: Email provider (Resend or AWS SES) needed from Slice 1. OTP table in schema. 5-minute expiry, 3-attempt limit.

### 2. Dashboard Views: Ops + Executive Summary
- **What**: Two admin views instead of three. Full Ops dashboard for Andrea's daily workflow. Simplified executive summary for Kari (coaching director) and Greg (VP).
- **Why**: 2x is buildable by March 16. Three bespoke dashboards would push past deadline. Executive summary can evolve into separate Kari/Greg views post-launch.
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

### 6. Nudge Strategy: Dashboard Flags, Not Email (added 2026-02-13)
- **What**: Automated escalation for stalled engagements shows as dashboard flags/notifications in the ops portal, NOT as automated emails. OTP emails (participant auth) and magic links (coach/admin auth) are still email-based.
- **Why**: FC's infrastructure is a significant unknown — their system may be "very closed" and not recognize external emails. Email delivery adds complexity (provider setup, deliverability, DPA). The ops team will be using their dashboard daily (possibly multiple times per day), so in-dashboard flags may be sufficient. Additionally, with 400 engagements, automated emails could mean 15+ emails/day flooding inboxes.
- **Implication**: Slice 3 simplifies significantly. The nudge cron becomes a flag-setter that marks overdue engagements in the database, not an email sender. `NudgeLog` table retained for tracking when flags were set. Dashboard shows "Needs Attention" with overdue flags prominently. Email nudges move to a workshop trade-off conversation — if FC decides they want emails after understanding the complexity, we can add them post-MVP or in a Slice 3 extension.
- **Complexity trigger**: Tim confirmed FC's contact explicitly requested emails. But they may not realize the development/testing cost or the alternative (dashboard visibility). This is a key workshop conversation.

### 4. Backend Stack: Next.js API Routes + Prisma (Same Repo)
- **What**: Server actions + API routes in the existing Next.js 15 app. Prisma ORM with PostgreSQL.
- **Why**: Fastest path to March deadlines. No cross-repo coordination, no separate deployment pipeline. The frontend is already here.
- **Implication**: `/src/app/api/` for API routes. Prisma client in `/src/lib/prisma.ts`. Server actions where appropriate for form mutations.

## Open Questions

1. **Email provider**: Resend (simpler DX, needs DPA for gov) vs AWS SES (cheaper, more config). Decision needed before Slice 1. *Note (2026-02-13): Email still needed for OTP + magic links. Nudge emails de-scoped to dashboard flags — email provider decision less urgent but still needed for auth.*
2. **Deployment target**: ~~Docker on which cloud?~~ Vercel for hosting, Supabase for database (managed PostgreSQL). Proposal says "web hosted, can be migrated to FC infrastructure." *Resolved 2026-02-13 — pending clarity on FC infrastructure by Tuesday.*
3. **Coach filtering**: Current UI has participant-facing filters. CIL Brief is ambiguous on whether matching is participant-driven or system-driven. Clarify at Feb 18 workshop.
4. **20-minute intro interviews**: CIL Brief mentions this for 5-session cohort. Is this just a Calendly link or a tracked feature? Clarify with stakeholders. *Confirmed optional in transcript — "select or request" language in infographic.*
5. **Sponsor teams**: ~~CIL Brief mentions "coachee, leader, HR/talent partner" as a team. Is this MVP or post-launch?~~ Removed from MVP scope per Tim call 2026-02-13. Not enough info on what the role does.
6. **Multi-org depth** (added 2026-02-13): Greg wants "infrastructure for the full platform" — how deep does the org-scoping go for MVP? Just the schema model + programId FK, or do we need org-scoped auth, org-scoped admin views? Recommend schema-only for MVP, UI-later. Workshop conversation.
7. **Nudge mechanism** (added 2026-02-13): FC contact explicitly requested emails for escalation. Workshop trade-off: dashboard flags (simpler, reliable, no infra risk) vs emails (their stated preference, but significant complexity). Need to present options with trade-offs.
8. **Admin filter/report categories** (added 2026-02-13): Specific categories TBD in workshop. Cap at ~5 parameters for MVP to manage complexity.

## Pre-Development Checklist

Before starting Slice 1:
- [ ] Confirm email provider choice with client
- [ ] Confirm deployment target / cloud provider
- [ ] Initialize Prisma schema with full model set (including Program)
- [ ] Set up PostgreSQL (local dev + staging)
- [ ] Resolve participant auth flow at Feb 18 workshop
- [ ] Complete visual QA of brand refresh (from previous session handoff)

---

*Generated from brainstorm session. Next: `/workflows:plan` to create detailed implementation tasks per slice.*
