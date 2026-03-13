# Session Handoff - MVP Full Launch Plan & Brainstorm

**Date**: 2026-03-12
**Branch**: `feat/admin-dashboard-slice2` (PR #21)
**Status**: 🟡 In Progress

---

## Accomplished This Session
- Brainstormed full MVP launch checklist with 4 phases (pre-launch technical, pre-launch ops, launch day, post-launch monitoring)
- Resolved all 6 open questions from brainstorm (EF/EL interview flow, Wistia, invitation comms, roster format, Lona Miller, demo accounts)
- Documented EF/EL interview manual workflow in CLAUDE.md as architecture decision
- Ran spec flow analysis that surfaced 3 critical code gaps:
  1. `coachSelectionStart` not enforced — EF-1 participants could select before March 16
  2. EF/EL interview info card not implemented — coach selector has no program awareness
  3. Resend domain verification for production not confirmed
- Wrote comprehensive launch plan at `docs/plans/2026-03-11-chore-mvp-full-launch-plan.md`
- Completed 2 rounds of structured document review, fixing ambiguities (production data commands, enforcement points, step numbering, coordination gaps)

## In Progress
- No code changes made yet — this session was planning only
- Code gaps identified but not implemented

## Next Steps (Priority Order)
1. **Fix Gap 1: `coachSelectionStart` enforcement** (~2-3 hours)
   - `src/lib/server/participant-coach-service.ts` — add `coachSelectionStart <= now` check
   - `src/lib/api-client.ts` — add `WINDOW_NOT_OPEN` error code
   - `src/app/participant/page.tsx` — handle new error with date-specific message
2. **Fix Gap 2: EF/EL interview info card** (~2-3 hours)
   - Existing plan at `docs/plans/2026-03-09-feat-ef-el-interview-info-card-plan.md`
   - Add `programCode` to coaches GET response
   - New `InterviewInfoCard.tsx` component, conditional on EF/EL
   - Client-approved message text in the launch plan
3. **Fix Gap 5: Verify returning participant confirmation flow** (~1-2 hours)
   - Test on staging: close browser → reopen → enter same email → does confirmation load?
   - Likely needs server-fetch fallback for `alreadySelected` participants
4. **Verify Gap 3: Resend domain verification** (~30 min, non-code)
5. **Data pipeline: import new rosters** (ALP-136, EF-1, refreshed MLP-80/ALP-135) — blocked on roster file receipt from FC
6. **Write manual match runbook** for Andrea's EF/EL interview workflow (~1 hour)
7. **Run staging smoke tests** — after code gaps fixed and data imported
8. **Coach onboarding prep** — written guide + schedule walkthroughs
9. **Merge PR #21 + deploy** — target March 15

## Key Files Modified
- `CLAUDE.md` — Added EF/EL interview workflow architecture decision (lines 193-211)
- `docs/brainstorms/2026-03-11-mvp-launch-checklist-brainstorm.md` — New: launch checklist brainstorm with resolved questions
- `docs/plans/2026-03-11-chore-mvp-full-launch-plan.md` — New: comprehensive 4-phase launch plan with code gaps, checklists, task summary

## Blockers / Decisions Needed
- **Roster files from FC**: ALP-136, EF-1, refreshed MLP-80/ALP-135 not yet received. Data pipeline blocked until these arrive.
- **ALP-136 participant count**: Listed as TBD in the plan — need the roster to know.
- **Resend production domain**: Needs manual verification (log into Resend, check SPF/DKIM).

## Quick Start Next Session
```
Read docs/plans/2026-03-11-chore-mvp-full-launch-plan.md and begin implementing the critical code gaps. Start with Gap 1 (coachSelectionStart enforcement) since Gap 2 (interview info card) shares the same API route change. Use /workflows:work to execute.
```

---
**Uncommitted Changes:** Yes — CLAUDE.md edit (EF/EL workflow), 3 new docs (brainstorm, launch plan, EF/EL brainstorm), plus other untracked files from prior sessions
**Tests Passing:** Unknown (not run this session — planning only)
