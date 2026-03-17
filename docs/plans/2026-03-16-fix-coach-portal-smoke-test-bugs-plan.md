---
title: "fix: Coach Portal Smoke Test Bugs — UX + State Management"
type: fix
date: 2026-03-16
priority: P0 — blocks coach onboarding (2000+ form entries expected)
branch: feat/session-form-field-restructure (PR #22)
status: completed
---

# fix: Coach Portal Smoke Test Bugs — UX + State Management

## Overview

Smoke testing of the coach session logging portal revealed 5 bugs and 1 design concern. These must be fixed before coach onboarding — over 2,000 session entries will be logged through this form, so the UX must be clean, intuitive, and reliable.

## Bugs Found

| # | Bug | Severity | Category |
|---|---|---|---|
| 1 | Navigation says "Coaching Program Overview" instead of "Coach's Portal" | Low | Copy/config |
| 2 | Auto-save "Saving..." blinks continuously even when form is idle | High | State management bug |
| 3 | Progress header (e.g., "0/2") doesn't update after logging sessions | Medium | Stale state |
| 4 | Completed engagement doesn't appear in "Completed" tab until manual refresh | Medium | Stale list data |
| 5 | "Log Session 2" tab shows on a completed engagement where all sessions are logged | High | Logic error |
| 6 | Form spacing: Topic and Session Outcomes too cramped, overall form needs polish | Medium | Design/UX |

---

## Bug 1: Navigation Label

**File:** `src/lib/nav-config.tsx:70`

**Problem:** The coach sidebar nav item label is "Coaching Program Overview" but the portal header says "Coach's Portal."

**Fix:** Change the nav item label at line 70 from `"Coaching Program Overview"` to `"Coach's Portal"`.

**Effort:** 1 minute.

---

## Bug 2: Auto-Save "Saving..." Blinks Continuously (P0)

**Files:**
- `src/hooks/use-auto-save.ts` (save loop logic)
- `src/app/coach/engagements/[id]/page.tsx` (AutoSaveText component + onSave callback)

**Problem:** The "Saving..." indicator blinks continuously even when the coach is not interacting with the form. This creates anxiety and distraction.

**Root cause (confirmed via deep research — 4 contributing bugs):**

| Bug | Location | Severity |
|---|---|---|
| `onSave` callback not memoized in consumer | page.tsx line 253 | **Primary cause** — unstable function reference recreated every render |
| `executeSave` in useEffect deps | hook line 134 | **Amplifier** — any change to `executeSave` identity restarts the debounce |
| `useMemo(() => JSON.stringify(data), [data])` uses object as dep | hook line 42 | **Contributing** — `useMemo` does `Object.is` on `data` (new ref each render), so memo always recomputes |
| Post-save re-queue path | hook lines 73-79 | **Secondary loop** — creates a second trigger independent of the change-detection effect |

**The loop chain:**
1. `setSaveStatus("saving")` triggers re-render
2. Re-render produces new `onSave` closure (not memoized)
3. New `onSave` invalidates `executeSave` (it's a useCallback dep)
4. `executeSave` is in the useEffect deps → effect fires → new debounce timer
5. Timer fires → save → back to step 1

**Fix — three structural changes:**

### Fix 2a: Store callbacks in refs (hook)

Remove `onSave` from `executeSave`'s useCallback dependencies. Store it in a ref instead:

```typescript
const onSaveRef = useRef(onSave);
onSaveRef.current = onSave;

const executeSave = useCallback(async () => {
  // ... use onSaveRef.current instead of onSave
}, []);  // empty deps — stable forever
```

### Fix 2b: Use serialized string as effect dependency (hook)

Replace `useMemo(() => JSON.stringify(data), [data])` with unconditional serialization:

```typescript
const serialized = JSON.stringify(data);  // no useMemo wrapper
const lastSavedSerializedRef = useRef(serialized);

useEffect(() => {
  if (!enabled || serialized === lastSavedSerializedRef.current) return;
  const id = window.setTimeout(() => void executeSave(), debounceMs);
  return () => window.clearTimeout(id);
}, [serialized, enabled, debounceMs, executeSave]);
// executeSave has stable identity (empty deps) — effect only fires when serialized string changes
```

### Fix 2c: Remove the post-save re-queue path (hook)

Delete the re-queue logic at lines 73-79. The change-detection `useEffect` is the single source of truth. If data changes during a save, the effect will fire naturally after the save's state updates settle. Two trigger pathways = infinite loop risk.

### Fix 2d: Memoize onSave in consumer (page)

```typescript
const handleAutoSave = useCallback(
  async (payload: UpdateCoachSessionInput) => {
    if (!selectedSessionId) return;
    const response = await updateCoachSession(selectedSessionId, payload);
    setSessions((prev) => prev.map((r) => (r.id === response.item.id ? response.item : r)));
    setLastSavedAt(response.item.updatedAt);
    setSubmitError(null);
  },
  [selectedSessionId]  // state setters are stable by React guarantee
);
```

### Fix 2e: Derive `hasPendingChanges` instead of storing in state

Replace `const [hasPendingChanges, setHasPendingChanges] = useState(false)` with:

```typescript
const hasPendingChanges = serialized !== lastSavedSerializedRef.current;
```

One fewer state update = one fewer re-render trigger.

**Effort:** 45 min (refactoring the hook is the bulk of the work; consumer change is 5 min).

---

## Bug 3: Progress Header Not Updating in Realtime

**File:** `src/app/coach/engagements/[id]/page.tsx`

**Problem:** After logging session 1, the header still shows "Progress: 0/2" instead of "1/2". The `engagement` state is fetched once on mount (line 171-201) and never updated after session creation.

**Root cause:** The POST `/api/coach/sessions` response (line 348 of route.ts) returns only the created session, not the updated engagement. The client adds the session to the local array but never updates `engagement.sessionsCompleted`.

**Fix approach:**

Option A (simplest): Derive progress from the local `sessions` array instead of the stale `engagement` object:

```typescript
// Replace engagement.sessionsCompleted with computed value
const sessionsCompleted = sessions.length;
const totalSessions = engagement?.totalSessions ?? 0;
```

This is immediately reactive — as soon as `setSessions` adds the new session, the progress updates.

Option B (richer): Include updated engagement data in the POST response. This is more work and changes the API contract.

**Recommendation:** Option A. It's a 2-line change with zero API impact.

Also update the engagement status badge: if `sessionsCompleted === totalSessions`, show "Completed" badge instead of the stale status from the initial fetch.

**Effort:** 15 min.

---

## Bug 4: Completed Engagement Not Showing in List

**File:** `src/app/coach/engagements/page.tsx`

**Problem:** After logging the final session (which transitions the engagement to COMPLETED on the server), navigating back to the engagements list still shows the engagement under "Active." It only appears under "Completed" after manually clicking the Completed tab, which triggers a fresh fetch.

**Root cause:** The engagements list re-fetches only when the tab or page changes (useEffect dependency: `[tab, tabs[tab].page]`). Navigating back from the detail page to the list page re-mounts the component and fetches the current tab — but the user is typically on the "Active" tab, which no longer includes the completed engagement.

**Fix approach:**

The simplest fix: **force a data refetch when the list page mounts.** The current `useEffect` already does this — the issue is that the Active tab fetch returns stale data if the server hasn't fully propagated the status change, or more likely, the user navigates back before the fetch completes and lands on a cached view.

Add a cache-busting mechanism:
1. When navigating back from a detail page where a session was logged, pass a query param or use `sessionStorage` flag: `"engagement-list-stale": "true"`
2. On list mount, if the flag is set, clear it and refetch all tabs

Or simpler: just always refetch on mount (which it already does — verify this is actually working correctly with the AbortController cleanup).

**Effort:** 20 min.

---

## Bug 5: "Log Session 2" Tab on Completed Engagement

**File:** `src/app/coach/engagements/[id]/page.tsx:452-456, 152-155`

**Problem:** When all sessions are logged (e.g., 2/2 completed), the tab still shows "Log Session 2" with an empty form. The submit button is disabled but the form is visible and confusing.

**Root cause:** The tab label uses `nextSessionNumber` which computes `Math.min(sessions.length + 1, totalSessions)`. When `sessions.length === totalSessions`, this returns `totalSessions` (e.g., 2), showing "Log Session 2" even though session 2 was already logged.

**Fix:** Hide the "Log Session" tab entirely when all sessions are logged. Default to "Session History" tab.

```typescript
const allSessionsLogged = sessions.length >= (engagement?.totalSessions ?? 0);

// In the tab rendering:
<TabsList>
  {!allSessionsLogged && (
    <TabsTrigger value="log">Log Session {nextSessionNumber}</TabsTrigger>
  )}
  <TabsTrigger value="history">Session History ({sessions.length})</TabsTrigger>
</TabsList>

// Default tab value:
<Tabs defaultValue={allSessionsLogged ? "history" : "log"}>
```

When `allSessionsLogged` is true:
- Only "Session History" tab is visible
- Coach can view and edit past sessions via the Edit buttons in history
- No empty form, no confusion

**Effort:** 15 min.

---

## Bug 6: Form Spacing, Design Polish, and Accessibility Hardening

**File:** `src/app/coach/engagements/[id]/page.tsx`

**Problem:** From screenshots + frontend design review:
- Topic dropdown and Session Outcomes checkboxes are visually cramped — no clear separation
- The form feels like a dense vertical wall of 8+ fields with uniform 16px gaps
- Field labels use blue text (`text-fc-800` = #2336ab) which looks like clickable links
- Labels are `text-xs` (12px) — too small for a professional coaching audience
- Checkbox group floats freely with no visual boundary
- Engagement level radio cards take ~250px of vertical space
- Auto-save "Saving..." indicator is blue (looks interactive)
- Accessibility gaps on dropdown error states

### 6a. Label Styling (High Impact, Low Effort)

Change ALL form labels from `text-fc-800 text-xs` to `text-fc-950 text-sm font-medium`:
- `text-fc-950` (#141928, Cool Black) — clearly a label, not a link
- `text-sm` (14px) — readable for the coaching audience
- Apply to lines 469, 509, 526, 599, 636, 716

```tsx
// Before
className="mb-1 block text-xs font-medium text-fc-800"

// After
className="mb-1.5 block text-sm font-medium text-fc-950"
```

### 6b. Section Grouping with Dividers (High Impact)

Replace single `space-y-4` container with three visual sections separated by `<hr>`:

```tsx
<CardContent className="space-y-6">
  {/* Section 1: Session Basics */}
  <div className="space-y-4">
    {/* Status, Date, Topic */}
  </div>

  <hr className="border-border/60" />

  {/* Section 2: Session Assessment */}
  <div className="space-y-5">
    <h4 className="text-xs font-bold text-fc-800 uppercase tracking-wider">
      Session Assessment
    </h4>
    {/* Outcomes, Next Steps, Engagement Level, Action-Commitment */}
  </div>

  <hr className="border-border/60" />

  {/* Section 3: Notes */}
  <div className="space-y-3">
    {/* Notes textarea + auto-save indicator */}
  </div>
</CardContent>
```

**Field order update (design reviewer recommendation):** Swap Engagement Level and Action-Commitment. Engagement level is an in-session observation ("how engaged was this person today?"); action-commitment is a between-session tracker ("did they do what they said?"). Observation before tracking maps to the coach's recall sequence.

New order within Section 2: Outcomes → Next Steps → Engagement Level → Action-Commitment

### 6c. Checkbox Group Container (High Impact, Low Effort)

Wrap the 5 outcome checkboxes in a bordered/shaded container for visual grouping:

```tsx
<div className="mt-2 space-y-2 rounded-md border border-border/60 bg-muted/30 p-3">
  {SESSION_OUTCOMES.map((value, index) => (
    <label key={value} className="flex cursor-pointer items-center gap-2.5 text-sm text-fc-900">
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-gray-300 text-fc-600 focus:ring-fc-500"
        // ... existing props
      />
      {value}
    </label>
  ))}
</div>
```

### 6d. Engagement Level — Compact Horizontal Scale (Design Choice)

The bordered radio cards take ~250px of vertical space. For a form used 2000+ times, coaches will internalize the scale quickly. Two options:

**Option A (recommended for repeat use):** Compact horizontal 1-5 buttons with descriptions as helper text below:

```tsx
<fieldset>
  <legend className="text-sm font-medium text-fc-950">Participant Engagement Level</legend>
  <p className="mt-1 text-xs text-muted-foreground">
    1 = Disengaged, 3 = Moderately engaged, 5 = Exceptionally engaged
  </p>
  <div className="mt-3 flex items-center gap-2">
    {ENGAGEMENT_LEVEL_OPTIONS.map(({ value }) => (
      <label
        key={value}
        className={cn(
          "flex h-10 w-full cursor-pointer items-center justify-center rounded-md border text-sm font-medium transition-colors",
          form.engagementLevel === value
            ? "border-fc-600 bg-fc-50 text-fc-700"
            : "border-border text-muted-foreground hover:border-fc-300 hover:bg-fc-50/50"
        )}
      >
        <input type="radio" className="sr-only" /* ... */ />
        {value}
      </label>
    ))}
  </div>
</fieldset>
```

Reduces ~250px → ~60px. Descriptions condensed to single helper line.

**Option B:** Keep vertical cards but tighten padding (`p-2.5` instead of `p-3`).

### 6e. Auto-Save Indicator Polish

Change "Saving..." from blue (`text-fc-600`) to muted gray with subtle animation:

```tsx
if (status === "saving") {
  return (
    <p className="flex items-center gap-1.5 text-xs text-muted-foreground animate-pulse-subtle">
      <span className="h-1.5 w-1.5 rounded-full bg-fc-400" />
      Saving...
    </p>
  );
}
if (status === "saved") {
  return (
    <p className="flex items-center gap-1.5 text-xs text-emerald-700">
      {/* checkmark icon */}
      Saved
    </p>
  );
}
```

Blue = interactive. Status indicators should be neutral/muted.

### 6f. Completion Banner

When all sessions are logged, show a success banner at the top of Session History:

```tsx
{sessions.length >= engagement.totalSessions && (
  <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3">
    <p className="text-sm font-medium text-emerald-800">
      All {engagement.totalSessions} sessions have been logged for this engagement.
    </p>
  </div>
)}
```

### 6g. Accessibility Hardening

Add missing attributes to dropdown fields:

- **Next Steps select:** Add `aria-required="true"`, `aria-invalid={nextStepsError || undefined}`, `aria-describedby={nextStepsError ? "next-steps-error" : undefined}`
- **Action-Commitment select:** Add `aria-required="true"`, `aria-invalid={actionCommitmentError || undefined}`, `aria-describedby={actionCommitmentError ? "action-commitment-error" : undefined}`
- **Error divs:** Add matching `id` attributes (`id="next-steps-error"`, `id="action-commitment-error"`)
- **All checkboxes:** Add `className="h-4 w-4"` for consistent cross-browser sizing

### 6h. Mobile Responsiveness

Top action bar should stack on mobile:

```tsx
// Before
<div className="mb-6 flex items-center justify-between">

// After
<div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
```

**Total effort for Bug 6:** 1.5 hours (increased from 45 min due to design depth).

---

## Acceptance Criteria

### Bug fixes
- [x] Sidebar nav label reads "Coach's Portal" (not "Coaching Program Overview")
- [x] Auto-save does NOT blink "Saving..." when form is idle
- [x] Auto-save shows "All changes saved" as steady state after successful save
- [x] Progress counter updates immediately after logging a session (e.g., 0/2 → 1/2)
- [x] Engagement status badge updates after final session is logged (IN_PROGRESS → Completed)
- [x] Completed engagement appears in "Completed" tab on engagements list without manual refresh
- [x] "Log Session" tab is hidden when all sessions are logged
- [x] Session History is the default tab for completed engagements
- [x] Coach can still edit past sessions via "Edit" buttons in Session History

### Design polish
- [x] All field labels use `text-fc-950 text-sm font-medium` (dark, readable — not blue links)
- [x] Form divided into 3 visual sections with `<hr>` dividers (Basics / Assessment / Notes)
- [x] Section header "Session Assessment" above the assessment fields
- [x] `space-y-6` between sections, `space-y-4` within sections
- [x] Checkbox group wrapped in bordered/shaded container (`bg-muted/30`)
- [x] Checkboxes have consistent `h-4 w-4` sizing
- [x] Engagement level uses compact horizontal scale OR tightened cards (design choice)
- [x] Auto-save "Saving..." is muted gray (not blue), "Saved" has checkmark icon
- [x] Completion banner shown when all sessions logged ("All N sessions have been logged")
- [x] Field order: Outcomes → Next Steps → Engagement Level → Action-Commitment → Notes
- [x] Top action bar stacks vertically on mobile (`flex-col sm:flex-row`)

### Accessibility
- [x] Next Steps and Action-Commitment selects have `aria-required`, `aria-invalid`, `aria-describedby`
- [x] Error divs have matching `id` attributes
- [x] All required fields have `aria-required="true"`

---

## Files Changed

| # | File | Changes |
|---|---|---|
| 1 | `src/lib/nav-config.tsx` | Change nav label to "Coach's Portal" |
| 2 | `src/hooks/use-auto-save.ts` | Fix save loop: stable serialization comparison, skip no-op saves |
| 3 | `src/app/coach/engagements/[id]/page.tsx` | Derive progress from sessions array, hide Log tab when complete, form spacing, label colors, section grouping, auto-save status text |
| 4 | `src/app/coach/engagements/page.tsx` | Force refetch on mount when returning from detail page |

---

## Estimated Effort

| Bug | Time |
|---|---|
| 1. Nav label | 1 min |
| 2. Auto-save loop fix | 45 min |
| 3. Progress header | 15 min |
| 4. Completed in list | 20 min |
| 5. Hide Log tab + completion banner | 20 min |
| 6a. Label styling | 10 min |
| 6b. Section grouping + dividers + field reorder | 30 min |
| 6c. Checkbox container | 10 min |
| 6d. Engagement level compact scale | 20 min |
| 6e. Auto-save indicator polish | 15 min |
| 6f. Completion banner | 10 min |
| 6g. Accessibility hardening | 15 min |
| 6h. Mobile responsiveness | 10 min |
| **Total** | **~3.5 hours** |

---

## Implementation Order

1. **Bug 1 (nav label)** — trivial, 1 min, get it out of the way
2. **Bug 2 (auto-save loop)** — highest impact, most complex, fix before design work
3. **Bug 5 (hide Log tab + completion banner)** — quick win, high visibility
4. **Bug 3 (progress header)** — quick win, improves feedback loop
5. **Bug 6a-6h (design + accessibility)** — visual polish, do as a batch after bugs are fixed
6. **Bug 4 (completed in list)** — state management, verify last

---

## References

- **Coach engagement detail page:** `src/app/coach/engagements/[id]/page.tsx`
- **Auto-save hook:** `src/hooks/use-auto-save.ts`
- **Nav config:** `src/lib/nav-config.tsx`
- **Engagements list:** `src/app/coach/engagements/page.tsx`
- **Session POST route:** `src/app/api/coach/sessions/route.ts`
- **Session form restructure plan:** `docs/plans/2026-03-13-feat-session-form-field-restructure-plan.md`
