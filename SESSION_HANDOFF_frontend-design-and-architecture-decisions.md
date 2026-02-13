# Session Handoff - Frontend Design & Architecture Decisions

**Date**: 2026-02-10
**Branch**: main
**Repo**: https://github.com/ridegoodwaves/franklin-covey
**Status**: 🟡 In Progress

---

## Accomplished This Session

### Frontend Design (Complete)
- Scaffolded full Next.js 15 + shadcn/ui project with "Quiet Luxury" design system (Cormorant Garamond + Plus Jakarta Sans, navy/gold/sage palette)
- Built 8 production-grade pages across 3 portals (6,450 lines total):
  - Landing page with portal selection
  - Participant: coach selection (3-card with remix), engagement dashboard (progress ring + timeline)
  - Coach: dashboard (3-section layout), session logging (multi-select checkboxes, auto-save)
  - Admin: dashboard (KPI sparklines + sortable table), coach capacity management, bulk import wizard
- Created 9 shared components (8 shadcn-style UI primitives + PortalShell navigation shell)
- Pushed to GitHub: `ridegoodwaves/franklin-covey`

### Architecture Decision: Calendly Removal (Complete)
- Ran 3-reviewer parallel analysis (DHH-style, Kieran-style, Simplicity) on proposed built-in scheduler + Google Meet architecture
- All 3 unanimously agreed: remove Calendly
- Selected **Option B** (Simplicity reviewer): coach-managed scheduling via `meetingBookingUrl` field, no built-in scheduler, no Google Meet API
- This eliminates ~70% of the system's accidental complexity, the FedRAMP blocker, and saves 7-15 dev days

### Documentation Updates (Complete)
- Updated PRD: marked Calendly section as SUPERSEDED, updated Tech Stack, Deployment secrets, Verification Plan
- Added 15 IT infrastructure questions (Q13-Q27) to PRD Open Questions section
- Updated CLAUDE.md with Architecture Decisions section
- Formulated client-facing questions for non-technical stakeholders (Calendly alternatives, coaching workflow)
- Formulated IT team questions for hosting, database, email, DNS, secrets, monitoring

## In Progress
- PRD has been updated but the changes to the PRD are in the **parent** `.cursor` repo, not the `franklin-covey` repo. The PRD lives at `/Users/amitbhatia/.cursor/prd_for_apps/franklincovey-coaching-platform-prd.md`.
- CLAUDE.md update is uncommitted in the franklin-covey repo (shows as untracked file).

## Next Steps (Priority Order)

1. **Commit CLAUDE.md update** - Stage and commit the updated CLAUDE.md to the franklin-covey repo (~2 min)
2. **Await client responses** - 15 IT infrastructure questions and 4 stakeholder questions are pending. Prioritize Q13-Q17 (cloud provider, deployment model, database, container service, DNS) as everything else depends on them.
3. **Update Prisma schema** - Apply Option B schema changes: remove `calendlyUrl` from CoachProfile, remove `calendlyEventUri` from Session, add `meetingBookingUrl: String?` to CoachProfile (~30 min)
4. **Update frontend pages** - Participant engagement page needs "Book Next Session" to link to `meetingBookingUrl` instead of Calendly embed. Coach session logging needs a date/time entry field for when the session occurred (~1-2 hours)
5. **Build backend** - All pages currently have hardcoded demo data. Next major milestone is connecting to Prisma + PostgreSQL with real auth flows (~2-3 weeks)
6. **Set up Google Sheet** - Create shared tracking sheet for client questions/decisions with columns: #, Question, Priority, Asked Date, Owner, Status, Decision, Decision Date, PRD Updated?

## Key Files Modified
- `franklin-covey/CLAUDE.md` - Added Architecture Decisions section (Option B documentation)
- `prd_for_apps/franklincovey-coaching-platform-prd.md` - Calendly section superseded, IT questions added, Tech Stack updated, Verification Plan updated, Resolved items updated

## Blockers / Decisions Needed
- **Waiting on client**: Cloud provider (AWS/Azure/GCP), deployment model, database provisioning, DNS/domain, email provider (Resend vs AWS SES)
- **Waiting on client**: What booking tools do coaches currently use? (needed to populate `meetingBookingUrl`)
- **Waiting on client**: Section 508 / WCAG 2.1 AA requirement confirmation
- **Waiting on client**: Participant auth model (unique link vs generic link + email lookup)

## Quick Start Next Session
```
Read the PRD at prd_for_apps/franklincovey-coaching-platform-prd.md and the project CLAUDE.md at franklin-covey/CLAUDE.md. Key context: Calendly has been removed from scope (see "SUPERSEDED" section in PRD). Option B was selected — coach-managed scheduling via meetingBookingUrl field. 15 IT infrastructure questions are pending client response (Q13-Q27 in PRD Open Questions). Next priority: commit the CLAUDE.md update, then begin Prisma schema work to reflect the Option B decision (remove calendlyUrl, remove calendlyEventUri, add meetingBookingUrl).
```

---
**Uncommitted Changes:** Yes - CLAUDE.md is untracked in franklin-covey repo. PRD changes are in parent .cursor repo.
**Tests Passing:** N/A - No test suite configured yet
**Dev Server:** Was running on port 3847 (may need restart: `cd franklin-covey && npm run dev`)
