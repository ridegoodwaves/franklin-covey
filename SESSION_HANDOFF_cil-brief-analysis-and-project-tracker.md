# Session Handoff - CIL Brief Analysis & Project Tracker Setup

**Date**: 2026-02-11
**Branch**: main
**Repo**: https://github.com/ridegoodwaves/franklin-covey
**Status**: 🟡 In Progress

---

## Accomplished This Session

### Google Sheet Tracker (Complete)
- Created 3 CSV files ready to import into Google Sheets (`google-sheets/` directory):
  - `1-questions-decisions.csv` — 40 questions (Q1-Q40) with category, priority, owner, status
  - `2-requirements-log.csv` — 17 requirements with implementation notes
  - `3-action-items.csv` — 13 action items with dependencies mapped
- Created `SETUP-INSTRUCTIONS.md` with import guide and formatting tips

### Calendly Miscommunication Resolution (Complete)
- Client thought we were removing Calendly entirely; clarified we removed API only, link-based scheduling retained
- Updated PRD (4 edits), CLAUDE.md, and tracker with clarified language
- Key pattern: every "removed" must be paired with what "remains"
- Documented the miscommunication as first solution in `docs/solutions/integration-issues/calendly-api-scope-miscommunication.md`
- Created `docs/solutions/README.md` knowledge base index

### Stakeholder Pre-Flight Reviewer Agent (Complete)
- Created `.claude/agents/stakeholder-preflight-reviewer.md` — reviews architecture decisions before sending to non-technical stakeholders
- Catches ambiguous removal language using a 5-step review process with stakeholder lens test

### CIL Brief Analysis (Complete)
- Ingested full CIL - FranklinCovey Coaching Portal Brief (Feb 2026)
- Created comprehensive delta analysis: `docs/CIL-BRIEF-DELTA-ANALYSIS.md`
- Identified **11 critical deltas** from current PRD (see below)
- Updated PRD with Strategic Context section including stakeholders, business context, timeline, and deltas table
- Added 10 new questions to tracker (Q31-Q40), resolved Q19 (participant auth = Option B)

### Strategic Pivot Documentation (Complete)
- Updated PRD with expanded strategic context from CIL Brief
- Greg Smith (VP) directive confirmed: "build the overall portal architecture for ALL engagements"
- Added R17 to requirements log (strategic vision requirement)

## Critical Deltas from CIL Brief (Must Resolve)

| # | Delta | Impact |
|---|-------|--------|
| 1 | **35 coaches, not 5-10** | Admin pages need search/filter/pagination |
| 2 | **4 programs from day 1** | `Program` model needed in MVP schema |
| 3 | **Coach Selector live March 2** | Top priority — ~2.5 weeks from brief |
| 4 | **Generic link + email lookup** | Confirmed Option B. Simpler auth. |
| 5 | **Filter by location/skills/language** | Different from shuffle+take 3. Needs clarification. |
| 6 | **20-min interview for 5-session cohort** | Chemistry interviews partially back. Needs scope clarification. |
| 7 | **Coach video on profile** | Add `videoUrl` to CoachProfile |
| 8 | **Sponsor teams** | New concept. MVP or future? |
| 9 | **Printable reports** | Back in MVP scope |
| 10 | **3 dashboard views by role** | Ops / Kari / Greg views |
| 11 | **Admin self-service for programs** | More admin functionality than designed |

## In Progress

- CLAUDE.md is modified but uncommitted in franklin-covey repo (Architecture Decisions updated with client confirmation, `docs/solutions/` added to Key Files)
- PRD changes are in parent `.cursor` repo at `prd_for_apps/franklincovey-coaching-platform-prd.md`
- Google Sheets CSVs need to be imported into actual Google Sheet and shared with client
- Kari's Lovable prototype has NOT been reviewed yet (browser extension wasn't connected)

## Next Steps (Priority Order)

1. **Review Kari's Lovable prototype** - Browse https://lovable.dev/projects/e91f5432-4586-4210-a51d-f66e8b54378a and document findings. Must complete before Feb 18 discovery workshop. (~1-2 hours)
2. **Commit all changes** - Stage and commit CLAUDE.md, docs/, google-sheets/ to franklin-covey repo (~5 min)
3. **Import CSVs into Google Sheet** - Create the actual Google Sheet and share with Tim/client (~10 min)
4. **Resolve CIL Brief deltas with Tim** - Align on Q31-Q40 before Feb 18 workshop. Key questions: coach filtering approach, interview scope, sponsor teams, dashboard views (~1 hour discussion)
5. **Prepare Feb 18 discovery workshop** - Mockups + recommended model for 9-11 AM CT session with FC team (~2-3 hours)
6. **Update Prisma schema** - Add Program model, update CoachProfile (videoUrl, rename calendlyUrl to meetingBookingUrl), simplify participant auth to email lookup (~1-2 hours)
7. **Build Coach Selector (March 2 deadline)** - This is the critical path. Participant email verification → 3-coach display → Calendly link. (~1 week)

## Key Files Modified

- `franklin-covey/CLAUDE.md` — Architecture Decisions updated with client confirmation, docs/solutions/ added to Key Files
- `prd_for_apps/franklincovey-coaching-platform-prd.md` — Strategic Context section rewritten with CIL Brief data, stakeholders, deltas table, timeline
- `franklin-covey/docs/CIL-BRIEF-DELTA-ANALYSIS.md` — Full delta analysis (11 critical deltas, new questions, confirmed alignments)
- `franklin-covey/docs/CIL-FranklinCovey-Coaching-Portal-Brief.pdf` — Archived CIL Brief
- `franklin-covey/docs/solutions/integration-issues/calendly-api-scope-miscommunication.md` — Documented miscommunication pattern
- `franklin-covey/docs/solutions/README.md` — Solutions knowledge base index
- `franklin-covey/google-sheets/1-questions-decisions.csv` — 40 questions (Q1-Q40)
- `franklin-covey/google-sheets/2-requirements-log.csv` — 17 requirements
- `franklin-covey/google-sheets/3-action-items.csv` — 13 action items
- `franklin-covey/google-sheets/SETUP-INSTRUCTIONS.md` — Import guide
- `.claude/agents/stakeholder-preflight-reviewer.md` — Pre-flight review agent for client-facing docs

## Blockers / Decisions Needed

- **Browser extension**: Not connecting — needed to review Kari's Lovable prototype
- **Tim alignment (Feb 13)**: Need to resolve CIL Brief deltas before Feb 18 workshop
- **Blaine (CTO) response**: Technical infrastructure questions sent, awaiting response
- **NDA/IT procurement**: May block access to FC infrastructure
- **March 9 gap**: Amit at Mayo Clinic — need continuity plan for development
- **Feb 18 workshop prep**: Need mockups + recommended model ready by Tuesday 9 AM CT

## Key Stakeholders (from CIL Brief)

- **Greg Smith** — VP, budget authority. "Do more with less."
- **Kari Saddler** — Director of Coaching. Built Lovable prototypes. "Stability → space to disrupt."
- **Andrea Sherman** — Director of Operations. "Proactive instead of reactive."
- **Blaine** — CTO (technical questions pending)
- **Tim** — CIL collaborator / project lead

## Quick Start Next Session
```
Read the PRD at prd_for_apps/franklincovey-coaching-platform-prd.md (focus on the "Strategic Context & CIL Brief" section and "CIL Brief Deltas from PRD" table). Read the delta analysis at franklin-covey/docs/CIL-BRIEF-DELTA-ANALYSIS.md. Read franklin-covey/CLAUDE.md for project conventions.

Key context:
- CIL Brief (Feb 2026) revealed 11 critical deltas from our PRD — biggest: 35 coaches (not 5-10), 4 programs from day 1, Coach Selector live March 2 (not March 16), participant auth = generic link + email lookup (Option B confirmed)
- Calendly miscommunication resolved — API removed, link-based scheduling retained, client confirmed
- 40 questions tracked in google-sheets/1-questions-decisions.csv (Q31-Q40 are new from CIL Brief)
- Kari's Lovable prototype needs review: https://lovable.dev/projects/e91f5432-4586-4210-a51d-f66e8b54378a
- Feb 18 discovery workshop with FC team (9-11 AM CT) — need mockups + recommended model

Priority: Review Kari's Lovable prototype via browser, then prepare for Feb 18 workshop.
```

---
**Uncommitted Changes:** Yes — CLAUDE.md modified, docs/ and google-sheets/ untracked in franklin-covey repo. PRD changes in parent .cursor repo. stakeholder-preflight-reviewer.md in .claude/agents/.
**Tests Passing:** N/A — No test suite configured yet
**Dev Server:** Not running (start with `cd franklin-covey && npm run dev`)
