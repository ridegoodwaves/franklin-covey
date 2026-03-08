---
status: done
priority: p3
issue_id: pr4
tags: [cleanup, frontend, demo-data, select-coach]
---

# select-coach/page.tsx Retains Large Hardcoded Demo Coach Array

## Problem Statement

`src/app/participant/select-coach/page.tsx` contains a full 15-coach `ALL_COACHES` array (lines 50-254) with fabricated demo data — names, bios, Calendly links, credentials, etc. This array is no longer used in the actual load path: `loadInitialCoaches()` now calls `fetchCoaches()` (the live API), and `handleRemix` calls `remixCoaches()`.

The dead code adds ~200 lines of noise to the file and contains fake Calendly URLs (e.g., `https://calendly.com/dr-whitfield/30min`) that could confuse reviewers or be accidentally re-wired. The `pickCoaches` function defined in the file (lines 264-278) is also unused dead code — the server-side `pickCoachBatch` in `participant-coach-service.ts` performs this logic now.

Additionally, `CURRENT_PARTICIPANT` stub data remains (lines 258-262) and is referenced as the default participant display name/initials fallback, which is appropriate, but it should not require a full named constant.

## Findings

File: `/Users/amitbhatia/.cursor/franklin-covey/src/app/participant/select-coach/page.tsx`

- Lines 50-254: `ALL_COACHES` array — unused, dead code
- Lines 256: `COACHES_PER_PAGE = 3` — unused constant (batch size now controlled server-side as `COACH_BATCH_SIZE`)
- Lines 258-262: `CURRENT_PARTICIPANT` — partially used as display name fallback
- Lines 264-278: `pickCoaches()` function — unused, dead code

The page still imports `ParticipantCoachCard` from `api-client.ts` and correctly uses `apiCoachToLocal()` to adapt live API responses. The live flow is functional.

## Proposed Solutions

- Remove `ALL_COACHES`, `COACHES_PER_PAGE`, and `pickCoaches()` entirely
- Inline the `CURRENT_PARTICIPANT` defaults as literal fallback values where used
- The `Coach` local interface can remain as it drives component props

This is a cleanup-only change with no behavior impact. The live API path is already wired and tested.

## Acceptance Criteria

- [ ] `ALL_COACHES` array removed
- [ ] `COACHES_PER_PAGE` constant removed
- [ ] `pickCoaches()` function removed
- [ ] `CURRENT_PARTICIPANT` inlined or removed
- [ ] Build passes after removal
- [ ] Live coach load and remix flows continue to work

## Work Log

- 2026-02-25: Identified during PR #4 review — dead code left over from stub-first approach
