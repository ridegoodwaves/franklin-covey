---
title: "feat: EF/EL Coach Interview Info Card"
type: feat
date: 2026-03-09
brainstorm: docs/brainstorms/2026-03-09-ef-el-interview-message-brainstorm.md
deadline: March 15, 2026 (EF-1 coach selection opens March 16)
---

# EF/EL Coach Interview Info Card

## Overview

Add a conditional info card on the coach selector page for EF/EL (5-session program) participants, informing them they can contact Andrea Sherman to schedule a coach interview before selecting. MLP/ALP participants see no change. This is a lightweight workaround — the full interview scheduling feature is deferred to Phase 2.

## Problem Statement

Kari Sadler requested that EF/EL participants have the option to interview coaches before committing to a selection. The 5-session programs have a longer coaching engagement, making coach fit more important. Rather than building interview scheduling into the platform (Phase 2 scope), we show a message directing participants to contact Andrea for scheduling.

## Proposed Solution

Three-file change:
1. Add `programTrack` to the coaches API response (data is already available server-side)
2. Add `programTrack` to the `CoachesResponse` type
3. Conditionally render an info card on the select-coach page when `programTrack === "FIVE_SESSION"`

### Data Flow

```
getSessionContext() → engagement.program.track (Prisma ProgramTrack enum: "TWO_SESSION" | "FIVE_SESSION")
       ↓
GET /api/participant/coaches → { ..., programTrack: "FIVE_SESSION" }
       ↓
select-coach page state: setProgramTrack(result.programTrack)  ← set once on initial load
       ↓
{programTrack === "FIVE_SESSION" && ...} → renders info card
```

**Key invariant:** `programTrack` is set once from `fetchCoaches()` and persists in React state across remix. The remix endpoint (`POST /api/participant/coaches/remix`) does NOT need to return `programTrack` — its `RemixResponse` type has a different shape (`coaches` + `poolExhausted`), and the page state already holds the track from the initial load.

**Type safety:** The Prisma `ProgramTrack` enum values (`TWO_SESSION`, `FIVE_SESSION`) match the TypeScript string union exactly — no runtime mapping needed. `context.program.track` returns the enum value directly.

## Implementation

### Task 1: Add `programTrack` to coaches API response

**File:** `src/app/api/participant/coaches/route.ts`

Add `programTrack: context.program.track` to all `NextResponse.json()` calls. The `context.program.track` value is already available from `getSessionContext()` — no new DB queries needed.

There are three success response points in this route (lines 43, 66, 90 — corresponding to the allAtCapacity early return, the remix response, and the main coach batch response). Add `programTrack` to each.

The four error responses (401 `INVALID_SESSION`, 409 `ALREADY_SELECTED`, 409 `WINDOW_CLOSED`) do NOT need `programTrack` — they trigger redirects or error states, not page renders.

### Task 2: Update `CoachesResponse` type

**File:** `src/lib/api-client.ts`

Add `programTrack` to the `CoachesResponse` interface:

```typescript
export interface CoachesResponse {
  coaches: ParticipantCoachCard[];
  allAtCapacity: boolean;
  remixUsed: boolean;
  programTrack: "TWO_SESSION" | "FIVE_SESSION";  // ← add
}
```

### Task 3: Wire `programTrack` into select-coach page state

**File:** `src/app/participant/select-coach/page.tsx`

- Add `const [programTrack, setProgramTrack] = useState<"TWO_SESSION" | "FIVE_SESSION" | null>(null);`
- In `loadInitialCoaches()`, set `setProgramTrack(result.programTrack)` from the API response (follow server-authoritative pattern — never from `useState` defaults)
- **Error paths do NOT set `programTrack`** — this is correct. On `WINDOW_CLOSED`, `selectionDisabled` becomes `true` which suppresses the info card. On `INVALID_SESSION` / `ALREADY_SELECTED`, the page redirects. On generic error, the info card is hidden because `programTrack` remains `null`.

**Dead code removal (full scope):**

| Line(s) | Code | Action |
|---------|------|--------|
| 51 | `type ProgramTrack = "TWO_SESSION" \| "FIVE_SESSION";` | Remove — type now inferred from `CoachesResponse["programTrack"]` |
| 53–57 | `const CURRENT_PARTICIPANT = { name: ..., initials: ..., programTrack: ... };` | Remove entire object |
| 197 | `useState<string>(CURRENT_PARTICIPANT.name)` | Change default to `""` — overridden by email-derived name in useEffect (line 219) |
| 198 | `useState<string>(CURRENT_PARTICIPANT.initials)` | Change default to `""` — overridden by email-derived initial in useEffect (line 223) |
| 223 | `CURRENT_PARTICIPANT.initials` fallback in `setParticipantInitials` | Change to `"?"` — only fires if email has no characters (defensive) |

**Why remove the full `CURRENT_PARTICIPANT` object:** `participantDisplayName` and `participantInitials` state use it as initial defaults (lines 197–198), but those are immediately overwritten by the email-derived values in the session `useEffect` (lines 216–224). Keeping the stub creates the false impression that "Sarah Mitchell" is a real default rather than dead demo data.

### Task 4: Render conditional info card

**File:** `src/app/participant/select-coach/page.tsx`

Render the info card **between the remix section and the HelpFooter**, gated by:

```typescript
{programTrack === "FIVE_SESSION" && !allAtCapacity && !selectionDisabled && (
  <InterviewInfoCard />
)}
```

**Suppression rules:**
- `allAtCapacity === true` → suppress (HelpFooter already shows Andrea's contact; interviewing full coaches makes no sense)
- `selectionDisabled === true` (WINDOW_CLOSED) → suppress ("return later" contradicts window-closed state)
- `programTrack !== "FIVE_SESSION"` → suppress (MLP/ALP)

**Component approach:** Inline JSX block — no extracted `<InterviewInfoCard />` component needed. The block is ~10 lines of JSX with a single gating condition. Extracting to a separate file adds indirection for no reuse benefit. If a future Phase 2 interview feature needs a richer component, extract at that time.

**Visual style:** Use the neutral `fc-50/fc-200` info card pattern from the confirmation page:

```tsx
<div
  className="mx-auto mt-8 max-w-lg rounded-xl border border-fc-200 bg-fc-50 p-5 text-center"
  role="note"
  aria-label="Coach interview option"
>
  <p className="font-medium text-fc-800">{/* heading */}</p>
  <p className="mt-2 text-sm text-muted-foreground">
    {/* body text */}
    Contact{" "}
    <span className="font-semibold text-foreground">{PROGRAM_ADMIN.name}</span>
    {" at "}
    <a
      href={`mailto:${PROGRAM_ADMIN.email}`}
      className="text-fc-600 underline underline-offset-2 hover:text-fc-700 transition-colors"
    >
      {PROGRAM_ADMIN.email}
    </a>
    {/* ... */}
  </p>
</div>
```

**Implementation details:**
- Import `PROGRAM_ADMIN` from `src/lib/config.ts` for Andrea's name and email — do NOT hardcode contact info
- Use `mailto:` link for the email address — matches the `HelpFooter` pattern (line 28–31 of `HelpFooter.tsx`)
- Use `role="note"` for accessibility — this is informational content, not a footer or alert
- Semantic distinction from `HelpFooter` (which uses `<footer>`) is intentional — the info card is contextual guidance, not site-level help

### Task 5: Message copy — REQUIRES CLIENT APPROVAL

**Content rule (CLAUDE.md):** Never author participant-facing content without explicit user approval.

Draft copy for Kari/Andrea review:

> **Want to meet your coach first?**
> You have the option to schedule a brief introductory call with a coach before making your selection. Contact [Andrea Sherman] at [andrea.sherman@franklincovey.com] to arrange an interview. You can return to this page anytime to make your final selection.

**Action required:** Get copy approved before shipping. The draft is a starting point — exact wording should be confirmed with Kari/Andrea.

### Task 6: Tests

**File:** `src/app/api/participant/coaches/route.test.ts` — **new file** (no existing test file for this route)

**Required mocks** (all from `@/lib/server/participant-coach-service` and `@/lib/server/session`):
- `readParticipantSession` — returns participant session cookie data
- `writeParticipantSession` — no-op (cookie writing)
- `getSessionContext` — returns engagement with `program.track`, `program.pool`, `cohort.coachSelectionEnd`, `status`
- `listCoachPool` — returns coach pool array
- `pickCoachBatch` — returns `{ selected, poolExhausted }`
- `toParticipantCoachCards` — returns `ParticipantCoachCard[]`

**Test cases:**
1. `programTrack` is included in success response for main coach batch (FIVE_SESSION program)
2. `programTrack` is included in success response for allAtCapacity early return
3. `programTrack` is included in success response for pinned-batch return
4. `programTrack` value matches `context.program.track` (not hardcoded)
5. TWO_SESSION program returns `programTrack: "TWO_SESSION"` (verify no EF/EL-only gating on backend)
6. Error responses (401, 409) do NOT include `programTrack` (verify shape)

**No frontend unit tests** for the conditional render — the gating logic is a single boolean expression with no branching. Covered by browser smoke test.

**Browser smoke test addition** (add to `docs/checklists/pre-deploy-smoke-test.md`):
- EF/EL participant: verify interview info card appears below coach cards, above HelpFooter
- EF/EL participant: verify `mailto:` link in info card opens email compose
- MLP/ALP participant: verify info card does NOT appear
- EF/EL participant with all coaches at capacity: verify info card does NOT appear

## Edge Cases (Resolved)

| Scenario | Behavior | Rationale |
|----------|----------|-----------|
| All coaches at capacity | Info card suppressed | HelpFooter already shows Andrea's contact; interviewing full coaches is pointless |
| Selection window closed | Info card suppressed | "Return later" contradicts window-closed state; `selectionDisabled` gates it |
| Participant already selected | Never seen | Redirect to confirmation fires before page renders (409 → `router.replace`) |
| After remix | Info card unchanged | `programTrack` state persists — set once from initial `fetchCoaches()`, not re-fetched on remix |
| Return after interview (different coaches) | Accepted limitation | Coach randomization may show different batch; participant can remix once or contact Andrea |
| Return after cookie expires | Fresh session, info card shows normally | New session starts clean; remix also resets; `programTrack` re-fetched from API |
| API error on initial load | Info card hidden | `programTrack` remains `null` (initial state); generic error banner shown instead |
| `programTrack` is `null` (loading) | Info card hidden | Gating condition `programTrack === "FIVE_SESSION"` is false when `null` — no flash of content |

## Acceptance Criteria

- [ ] EF/EL participants see the interview info card below coach cards on the select-coach page
- [ ] MLP/ALP participants do NOT see the info card
- [ ] Info card uses `PROGRAM_ADMIN` from `config.ts` for contact details (not hardcoded)
- [ ] Info card email is a `mailto:` link (matches HelpFooter pattern)
- [ ] Info card has `role="note"` for accessibility
- [ ] Info card suppressed when `allAtCapacity` is true
- [ ] Info card suppressed when selection window is closed
- [ ] Info card hidden during loading (`programTrack` is `null` until API responds)
- [ ] `programTrack` included in all three coaches API success responses (allAtCapacity, pinned, fresh batch)
- [ ] `programTrack` value matches participant's actual program track (not hardcoded)
- [ ] `programTrack` NOT included in error responses (401, 409)
- [ ] Remix endpoint unchanged — does NOT return `programTrack`
- [ ] Message copy approved by Kari/Andrea before deploy
- [ ] All dead code removed: `CURRENT_PARTICIPANT` object, `ProgramTrack` type alias, stub defaults in `useState`
- [ ] API route test file created with programTrack coverage

## Files Changed

| File | Change | LOC |
|------|--------|-----|
| `src/app/api/participant/coaches/route.ts` | Add `programTrack` to 3 success responses | ~3 |
| `src/lib/api-client.ts` | Add `programTrack` to `CoachesResponse` | ~1 |
| `src/app/participant/select-coach/page.tsx` | State, conditional render, dead code removal | ~30 (+15 add, -15 remove) |
| `src/app/api/participant/coaches/route.test.ts` | **New file** — programTrack coverage | ~80 |
| `docs/checklists/pre-deploy-smoke-test.md` | Add EF/EL interview card smoke tests | ~6 |

**Total estimated change: ~120 lines across 5 files (including new test file). ~2-3 hours implementation + copy approval wait.**

## Non-Changes (Explicit)

These were evaluated and intentionally excluded:

| Item | Why excluded |
|------|-------------|
| Remix endpoint (`POST /api/participant/coaches/remix`) | `programTrack` state persists in React from initial load; remix has different response shape (`RemixResponse`) |
| `RemixResponse` type in `api-client.ts` | No `programTrack` field needed — see above |
| New component file for info card | ~10 lines of inline JSX; extraction adds indirection with no reuse benefit |
| `verify-email` endpoint | Auth response doesn't need `programTrack`; the coach page fetches it independently |

## Dependencies

- **Blocker:** Message copy approval from Kari/Andrea (can implement with placeholder, deploy after approval)
- No schema changes
- No new packages
- No new environment variables
- Prisma `ProgramTrack` enum already has `TWO_SESSION` and `FIVE_SESSION` — no migration needed

## References

- Brainstorm: `docs/brainstorms/2026-03-09-ef-el-interview-message-brainstorm.md`
- Coach selector page: `src/app/participant/select-coach/page.tsx`
- Coaches API: `src/app/api/participant/coaches/route.ts`
- API types: `src/lib/api-client.ts` → `CoachesResponse`
- Contact config: `src/lib/config.ts` → `PROGRAM_ADMIN`
- HelpFooter pattern: `src/components/participant/HelpFooter.tsx`
- Session state fix (server-authoritative pattern): `docs/solutions/ui-bugs/coach-selector-session-state-refresh-reset.md`
- Session carryover fix (sessionStorage safety): `docs/solutions/security-issues/participant-session-storage-carryover.md`
- EF/EL timeline: `fc-assets/cohort-timelines/FY26 Coaching Timelines_FranklinCovey-v3.md`
