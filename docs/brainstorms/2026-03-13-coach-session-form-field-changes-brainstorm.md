---
title: Coach Session Logging Form — Field Changes
date: 2026-03-13
type: brainstorm
status: decided
stakeholders: Kari Sadler, Andrea Sherman
---

# Coach Session Logging Form — Field Changes

## What We're Building

Restructure the coach session logging form based on client feedback. Two priority changes + two deferred changes + one visibility change.

### Priority (ship before coach onboarding)

**1. Session Outcomes → multi-select with new values**

Replace current single-select dropdown (6 values) with multi-select (5 new values):
- Action plan created
- Action plan updated
- Resources provided
- Participant committed to an action
- Engagement concluded / final session

Storage: JSON string array in existing `outcome` column (renamed to `outcomes`), kept as `String?` storing serialized JSON. Example: `'["Action plan created","Resources provided"]'`. Not JSONB — keeps Prisma schema simple and avoids type-layer complexity for a bounded 5-value set.

**2. Next Steps → new single-select field (replaces Duration)**

Remove `durationMinutes` field entirely. Add `nextSteps` in its place:
- Next session scheduled
- Next session not scheduled
- Program concluded, no next session

Storage: Rename `durationMinutes` column to `nextSteps` via migration, change type from `Int?` to `String?`.

**3. Private Notes → Public Notes (label + visibility change)**

Rename "Private Notes" label to "Notes" in the UI. Make notes visible to the ops team in admin dashboard views. Column name `privateNotes` stays in DB (rename is cosmetic risk for zero benefit). Admin API returns notes when listing sessions.

### Deferred (ship post-launch)

**4. Participant Engagement Level → new single-select (Likert 1-5)**

New field, integer 1-5:
- 1 – Disengaged
- 2 – Partially engaged
- 3 – Moderately engaged
- 4 – Highly engaged
- 5 – Exceptionally engaged

Storage: New `engagementLevel Int?` column via migration.

**5. Action-Commitment Tracking → new single-select**

New field:
- Last session's action(s) completed
- Last session's action(s) partially completed
- Last session's action(s) not completed
- No actions were committed to in the last session
- Not applicable (first session / no prior session)

Storage: New `actionCommitment String?` column via migration.

## Why This Approach

**Approach B chosen:** Proper migration with column rename/restructure. Rationale:

1. **Zero sessions exist in production** — this is the ideal (and last safe) time to restructure columns without data migration complexity
2. **No one-off solutions** — column names should match their semantic meaning for long-term maintainability
3. **JSON array for multi-select outcomes** — a join table is overkill for 5 bounded values that are always read/written together. JSON in a string column is the standard pattern for small fixed multi-select fields.
4. **Column rename over reuse** — `durationMinutes` storing "next steps" would confuse future developers. Rename to `nextSteps` while the table is empty.

## Key Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Multi-select outcomes storage | JSON string array in `outcome` column (renamed `outcomes`) | Bounded values, always read/written together, no join table overhead |
| Duration field | **Remove entirely** — client no longer wants it | Replaced by Next Steps |
| Next Steps storage | Rename `durationMinutes` → `nextSteps`, change type `Int?` → `String?` | Column swap while table is empty |
| Private notes visibility | Change UI label only; expose in admin API | DB column name stays `privateNotes` to avoid unnecessary rename risk |
| Priority split | Outcomes + Next Steps + Notes visibility first; Engagement Level + Action Tracking deferred | Client confirmed priorities |
| Validation approach | Application-layer validation against config constants (existing pattern) | Consistent with current topic/outcome validation pattern |
| Existing session data | No existing sessions to migrate | Confirmed: no coaches have logged sessions yet |
| Column type change strategy | Drop `durationMinutes` + add new `nextSteps String?` (not ALTER TYPE) | Safer than in-place type change; zero rows means no data loss |
| Forfeited session handling | `outcomes` and `nextSteps` forced to null for forfeited sessions | Consistent with existing pattern: forfeited sessions null out topic, outcome, durationMinutes |

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Column rename migration fails | Low | Zero rows in Session table; migration is trivial |
| Outcome JSON parsing errors on read | Medium | `mapSessionRow` must parse JSON with try/catch fallback; admin dashboard must handle both old string and new array format defensively |
| Admin dashboard breaks if it reads `durationMinutes` | Low | Grep all references before migration; update in same PR |
| Old config constants referenced elsewhere | Medium | Full codebase grep for `SESSION_OUTCOMES`, `DURATION_OPTIONS`, `durationMinutes` |
| Auto-save sends partial multi-select state | Low | Debounce already handles this; multi-select state is atomic |
| Validation tests break | Expected | Update all session validation tests with new values |

## Schema Changes Summary

```
Migration: rename_session_fields_for_client_feedback

1. Rename column: outcome → outcomes (String?, stores JSON array)
2. Rename column: durationMinutes → nextSteps (Int? → String?)
   -- Requires drop + add since type changes
3. (Deferred) Add column: engagementLevel Int?
4. (Deferred) Add column: actionCommitment String?
```

## Files That Need Changes (Priority Items Only)

| Layer | File | Change |
|---|---|---|
| Schema | `prisma/schema.prisma` | Rename fields, update types |
| Migration | `prisma/migrations/YYYYMMDD_*/migration.sql` | Column rename + type change |
| Config | `src/lib/config.ts` | New `SESSION_OUTCOMES` values, add `NEXT_STEPS_OPTIONS`, remove `DURATION_OPTIONS` |
| Validation | `src/lib/validation/session-validation.ts` | Multi-select outcome validation, nextSteps validation, remove duration validation |
| Types | `src/lib/types/coach.ts` | `CoachSessionRow`: outcome→outcomes (string[]), durationMinutes→nextSteps (string) |
| API POST | `src/app/api/coach/sessions/route.ts` | Accept outcomes array + nextSteps, remove durationMinutes |
| API PATCH | `src/app/api/coach/sessions/[id]/route.ts` | Same field changes |
| API GET | `src/app/api/coach/engagements/[id]/sessions/route.ts` | Parse JSON outcomes on read |
| Shared | `src/app/api/coach/_shared.ts` | Update `mapSessionRow` for new fields |
| Client API | `src/lib/coach-api-client.ts` | Update input/response types |
| UI | `src/app/coach/engagements/[id]/page.tsx` | Multi-select outcomes UI, nextSteps dropdown, rename "Private Notes" label |
| Tests | `src/app/api/coach/sessions/route.test.ts` | Update for new fields/values |
| Tests | `src/app/api/coach/sessions/[id]/route.test.ts` | Update for new fields/values |
| Tests | `src/lib/validation/session-validation.test.ts` | If exists, update validation tests |

## Open Questions

1. **Should "Engagement concluded / final session" outcome auto-set engagement status?** Or is that a manual ops decision? (Current behavior: engagement transitions to COMPLETED only when `sessionNumber === totalSessions`.)
2. **Admin dashboard session view:** Does it exist yet, or is notes visibility a future item? (Need to verify what admin routes expose session data.)
