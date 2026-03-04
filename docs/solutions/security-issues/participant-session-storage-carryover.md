---
title: "Stale Participant Session Carryover Across Users"
date: "2026-03-02"
category: security-issues
tags:
  - session-management
  - sessionStorage
  - identity-boundary
  - client-state
  - participant-flow
  - next-js
severity: high
component: participant-session
symptoms:
  - "Participant B opening a shared link in the same browser sees Participant A's selected coach on the confirmation page"
  - "Coach selection step is skipped entirely for a new participant when prior sessionStorage data exists"
  - "select-coach page redirects to /participant/confirmation without prompting coach selection"
  - "Confirmation page displays coach name and booking URL belonging to a different participant"
root_cause: >
  sessionStorage keyed by bare string literals ("selected-coach", "participant-email", "participant-verified")
  was never cleared on new email submission. When a second participant verified their email in the same
  browser tab, stale keys from the prior participant persisted. The select-coach guard checked
  only for key existence, not for email ownership, so it short-circuited to /participant/confirmation
  and rendered the previous participant's coach selection.
resolution_summary: >
  Introduced src/lib/participant-session.ts with PARTICIPANT_SESSION_KEYS constants,
  clearParticipantClientState() called at email submission before any new verification, and
  isStoredCoachOwnedByParticipant() which compares a normalized participantEmail embedded in the
  stored coach payload against the current session email. All three participant pages migrated
  to centralized key constants. Stale or unowned coach payloads are now removed rather than trusted.
prevention_tags:
  - clear-state-on-identity-change
  - ownership-check-before-trust
  - centralized-session-key-constants
  - normalize-email-before-compare
related_issues:
  - "Issue #6: Security and data hardening backlog (post-audit)"
  - "Issue #5: Returning participants - no booked-state tracking"
  - "docs/solutions/ui-bugs/coach-selector-session-state-refresh-reset.md (related split-brain state)"
  - "docs/research/participant-workflow-research.md (Section 4.3: coach selector flow)"
affected_files:
  - "src/app/participant/page.tsx"
  - "src/app/participant/select-coach/page.tsx"
  - "src/app/participant/confirmation/page.tsx"
  - "src/lib/participant-session.ts"
  - "src/lib/participant-session.test.ts"
---

# Stale Participant Session Carryover Across Users

## Problem Statement

When Participant A completes the full coach selection flow in a browser (enters email, verifies, selects a coach), and then Participant B opens the same URL in the same browser tab, the app immediately skips email entry and coach selection and drops Participant B directly onto the confirmation page — showing Participant A's selected coach.

This is a cross-user data exposure bug: Participant B can see Participant A's confirmed coach assignment and booking URL without authentication.

**How discovered:** Multi-user testing in a shared browser environment. The flow works correctly for a single user in isolation, but breaks when a second user begins the flow in the same browser session.

## Investigation Steps

1. Traced the three-page participant flow: `/participant` (email entry) -> `/participant/select-coach` -> `/participant/confirmation`
2. Identified all `sessionStorage` reads and writes across those three pages
3. Found that `sessionStorage` persists across all tab navigations within the same origin — it is NOT cleared by new page loads, only by the browser tab being closed
4. Found the early-exit guard on `select-coach/page.tsx`:

```typescript
// BEFORE — blind presence check, no ownership validation
if (sessionStorage.getItem("selected-coach")) {
  router.replace("/participant/confirmation");
  return;
}
```

5. Observed that `participant/page.tsx` `handleSubmit` wrote new `participant-email` and `participant-verified` keys but made **no attempt to clear** `selected-coach` from a prior user's session
6. Confirmed that `selected-coach` payloads contained no identity binding — no `participantEmail` field linking the coach choice to a specific participant

## Root Cause Analysis

Three cooperating defects produced this bug:

### Defect 1 — No identity binding in stored coach payload

The `selected-coach` sessionStorage key stored coach metadata (id, name, bio, bookingUrl, etc.) but no record of which participant made the selection. This made it impossible to validate ownership at read time.

### Defect 2 — No client-state teardown on new email verification

In `participant/page.tsx`, `handleSubmit` wrote two new keys (`participant-email`, `participant-verified`) on successful verification but never removed `selected-coach`. sessionStorage scope is the browser origin + tab — it does not reset when a new user begins the flow. The stale `selected-coach` from Participant A silently survived into Participant B's session.

### Defect 3 — Blind early-exit on select-coach page mount

The guard checked only for the presence of `selected-coach`, not its ownership. With `selected-coach` left behind from the previous user and `participant-verified` freshly set for the new user, the condition evaluated to true and redirected Participant B to confirmation without ever reaching coach selection.

**The root pattern:** sessionStorage is tab-scoped and sticky. Any flow that reuses an existing tab for a new "identity" must proactively clear all client state belonging to the prior identity before writing the new one.

## Working Solution

The fix introduced a centralized participant session library and applied it at three points.

### New file: `src/lib/participant-session.ts`

```typescript
export const PARTICIPANT_SESSION_KEYS = {
  email: "participant-email",
  verified: "participant-verified",
  selectedCoach: "selected-coach",
} as const;

export function normalizeParticipantEmailForClient(email: string): string {
  return email.trim().toLowerCase();
}

export function clearParticipantClientState(storage: RemovableStorage): void {
  storage.removeItem(PARTICIPANT_SESSION_KEYS.selectedCoach);
  storage.removeItem(PARTICIPANT_SESSION_KEYS.verified);
  storage.removeItem(PARTICIPANT_SESSION_KEYS.email);
}

export function isStoredCoachOwnedByParticipant(
  rawSelectedCoach: string | null,
  participantEmail: string | null
): boolean {
  if (!participantEmail) return false;
  const storedMeta = readStoredCoachSessionMeta(rawSelectedCoach);
  if (!storedMeta?.participantEmail) return false;
  return storedMeta.participantEmail === normalizeParticipantEmailForClient(participantEmail);
}
```

### Change 1 — Clear all client state before writing new identity

`src/app/participant/page.tsx`:

```typescript
// BEFORE
async function handleSubmit(e: React.FormEvent) {
  // ...wrote new keys without clearing stale ones
  sessionStorage.setItem("participant-email", email.trim());
  sessionStorage.setItem("participant-verified", "true");

// AFTER
async function handleSubmit(e: React.FormEvent) {
  const trimmedEmail = email.trim();
  clearParticipantClientState(sessionStorage);  // wipes ALL prior user state
  // ...then write new identity keys
  sessionStorage.setItem(PARTICIPANT_SESSION_KEYS.email, trimmedEmail);
  sessionStorage.setItem(PARTICIPANT_SESSION_KEYS.verified, "true");
```

### Change 2 — Bind email to stored coach and verify ownership before trusting

`src/app/participant/select-coach/page.tsx`:

At coach selection write time, stamp the payload with the participant's email:

```typescript
const participantEmail = sessionStorage.getItem(PARTICIPANT_SESSION_KEYS.email) ?? undefined;
const payload = {
  ...coach,
  participantEmail,  // identity binding
  bookingUrl: response.bookingUrl,
};
sessionStorage.setItem(PARTICIPANT_SESSION_KEYS.selectedCoach, JSON.stringify(payload));
```

At mount-time guard, replace blind presence check with ownership check:

```typescript
// BEFORE
if (sessionStorage.getItem("selected-coach")) {
  router.replace("/participant/confirmation");
  return;
}

// AFTER
const storedEmail = sessionStorage.getItem(PARTICIPANT_SESSION_KEYS.email);
const storedCoach = sessionStorage.getItem(PARTICIPANT_SESSION_KEYS.selectedCoach);
if (storedCoach) {
  if (isStoredCoachOwnedByParticipant(storedCoach, storedEmail)) {
    router.replace("/participant/confirmation");
    return;
  }
  sessionStorage.removeItem(PARTICIPANT_SESSION_KEYS.selectedCoach);  // discard stale
}
```

### Change 3 — Validate ownership before rendering coach data

`src/app/participant/confirmation/page.tsx`:

```typescript
// AFTER — ownership check at every read site
const raw = sessionStorage.getItem(PARTICIPANT_SESSION_KEYS.selectedCoach);
const participantEmail = sessionStorage.getItem(PARTICIPANT_SESSION_KEYS.email);
if (raw) {
  if (!isStoredCoachOwnedByParticipant(raw, participantEmail)) {
    sessionStorage.removeItem(PARTICIPANT_SESSION_KEYS.selectedCoach);
    // fall through to error state
  } else {
    const parsed = JSON.parse(raw) as StoredCoach;
    setCoach(parsed);
  }
}
```

### Test coverage: `src/lib/participant-session.test.ts`

Unit tests covering: email normalization, metadata read from stored payload, legacy payload without `participantEmail` treated as unowned, malformed JSON returning null, ownership matching with case/whitespace variants, and `clearParticipantClientState` key sweep.

## Verification Method

Multi-user scenario test:

1. Open the app. Enter Participant A's email, verify, select a coach, land on confirmation showing A's coach.
2. Navigate back to `/participant` in the same tab.
3. Enter Participant B's email and submit.
4. Confirm: Participant B lands on the coach selection page (NOT confirmation), sees a fresh set of coaches, has no visibility into Participant A's selection.
5. Verify the reverse: re-entering Participant A's email after Participant B completes their flow also routes correctly.

**Edge case handled:** If `selected-coach` exists in storage but contains no `participantEmail` field (legacy payload from before this fix), `isStoredCoachOwnedByParticipant` returns `false` — the stale data is discarded rather than trusted.

## Key Technical Insights

### 1. Identity change = clear all client state

sessionStorage is scoped to the browser origin and tab, not to a user identity. Any application that allows multiple distinct user identities to flow through the same tab must treat the moment of identity change as a hard reset of all client-side state.

### 2. Clear before write, not after

The teardown call goes at the top of `handleSubmit`, before the API call that establishes the new identity. State is always wiped even if the API call later fails.

### 3. Bind stored data to the identity that created it

Any sessionStorage payload that encodes user-specific state should include a normalized identity token (`participantEmail`) so downstream consumers can validate ownership rather than trust presence alone.

### 4. Validate ownership at every read site

Both `select-coach` and `confirmation` independently validate ownership when reading `selected-coach`. Defense in depth: even if the write-time clearing fails, the read-time check prevents the wrong user from seeing wrong data.

### 5. Email normalization for comparison

Participant emails arrive from form input with potential leading/trailing whitespace or inconsistent casing. `normalizeParticipantEmailForClient` applies `trim().toLowerCase()` before any comparison.

### 6. Centralize sessionStorage key names

The `PARTICIPANT_SESSION_KEYS` constant object eliminates scattered string literals across three files, making future key renames and audits a single-file change.

## Prevention: The Universal Pattern

### All storage mechanisms to clear on identity change

| Mechanism | Scope | How to Clear |
|---|---|---|
| sessionStorage | Tab + origin | `sessionStorage.clear()` or key-by-key |
| localStorage | Origin (all tabs) | `localStorage.clear()` or key-by-key |
| Cookies | Domain/path scoped | Set `Max-Age=0` server-side |
| React state / context | Component tree | Unmount via `key` prop change on userId |
| URL params | Current URL | `router.replace(pathname)` without query |
| IndexedDB | Origin | `indexedDB.deleteDatabase(name)` |

### Reusable cleanup utility pattern

```typescript
export async function clearAllClientState(): Promise<void> {
  // 1. sessionStorage — highest risk, most common carryover vector
  sessionStorage.clear();

  // 2. localStorage — clear only app-namespaced keys
  const appPrefix = 'fc:';
  Object.keys(localStorage)
    .filter(key => key.startsWith(appPrefix))
    .forEach(key => localStorage.removeItem(key));

  // 3. URL params — strip query string
  window.history.replaceState(null, '', window.location.pathname);
}
```

**Calling convention:** Call `clearAllClientState()` BEFORE establishing the new identity, not after.

### Code review checklist for auth/session PRs

- [ ] Does the auth flow clear `sessionStorage` before establishing the new session?
- [ ] Does every `sessionStorage.getItem` validate that the data belongs to the current user?
- [ ] Are sessionStorage keys namespaced or identity-bound?
- [ ] Are there `useEffect` hooks that read storage on mount without checking user identity?
- [ ] Does the sign-out handler clear ALL storage mechanisms (not just cookies)?

### Testing pattern for multi-user session isolation

```typescript
test('sessionStorage does not carry over between users', async ({ page }) => {
  // User A completes flow
  await authenticateAs(page, 'user-a@example.com');
  await selectCoach(page);

  // User B starts flow in same tab
  await page.goto('/participant');
  await page.fill('[data-testid="email"]', 'user-b@example.com');
  await page.click('[data-testid="submit"]');
  await page.waitForURL('/participant/select-coach');

  // Assert: User B sees coach selection, NOT User A's confirmation
  const storedForB = await page.evaluate(() =>
    sessionStorage.getItem('selected-coach')
  );
  expect(storedForB).toBeNull();
});
```

## Applicability

This pattern affects any web application where:
1. Multiple users may authenticate in the same browser tab (shared links, kiosk scenarios)
2. Client-side storage (sessionStorage, localStorage) holds user-specific state
3. Navigation guards rely on storage presence rather than ownership validation

The fix principle is universal: **never trust client-side stored state without verifying it belongs to the current authenticated identity**.
