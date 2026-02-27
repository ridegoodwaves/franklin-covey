---
title: Coach Selector State Not Persisting Across Browser Refreshes
date: 2026-02-27
category: ui-bugs
tags:
  - split-brain-state
  - session-persistence
  - coach-selector
  - participant-portal
  - next-js
  - state-management
symptoms:
  - Browser refresh shows different coaches each time instead of the same pinned 3
  - Remix limit resets on browser refresh despite being already consumed
  - Participants could access unlimited new coaches via repeated refresh
  - Each browser refresh effectively acted as a free remix
components:
  - src/app/api/participant/coaches/route.ts
  - src/app/api/participant/coaches/remix/route.ts
  - src/app/participant/select-coach/page.tsx
  - src/lib/server/session.ts
  - src/lib/api-client.ts
related_issues: []
severity: high
---

# Coach Selector State Not Persisting Across Browser Refreshes

## Problem

Participants on the coach selector screen (`/participant/select-coach`) could refresh their browser to:

1. **See a completely different set of 3 coaches** — bypassing the intended one-time pinned batch
2. **Reset the "No More Refreshes Available" state** — re-enabling the one-time remix button

This allowed participants to view unlimited coach options and unlimited remixes simply by hitting browser refresh, directly violating the MVP requirement of "3 coaches shown, 1 remix allowed."

## Root Cause

**Split-brain state management.** The server session cookie held correct authoritative state (`remixUsed`, `shownCoachIds`), but two things were missing:

**1. `GET /api/participant/coaches` always re-randomized.**
On every request it called `pickCoachBatch()`, returning a new random selection from unseen coaches. There was no "pin" concept — the server had no way to know which coaches it had already shown to this participant in their current session. Each refresh consumed 3 more unseen coaches from the pool.

**2. `remixUsed` was never returned to the client.**
The backend session tracked the flag correctly, but it was not included in the API response. The client's `useState(false)` reset on every page load, always showing the remix button as available.

Combined: every browser refresh effectively performed a free remix and advanced the coach pool pointer.

## Fix

Five targeted changes across the state management stack. Build verified (`tsc --noEmit` passes).

### 1. Add `currentBatchIds` to `ParticipantSession`

`src/lib/server/session.ts`

```typescript
export interface ParticipantSession {
  participantId: string;
  engagementId: string;
  organizationId: string;
  cohortId: string;
  email: string;
  shownCoachIds: string[];
  remixUsed: boolean;
  /** IDs of the coaches currently displayed to this participant. Pinned until remix or selection. */
  currentBatchIds: string[];
}
```

### 2. Add `remixUsed` to `CoachesResponse`

`src/lib/api-client.ts`

```typescript
export interface CoachesResponse {
  coaches: ParticipantCoachCard[];
  allAtCapacity: boolean;
  /** True when this participant has already used their one remix. Drives client UI state. */
  remixUsed: boolean;
}
```

### 3. Pin-first logic in `GET /api/participant/coaches`

`src/app/api/participant/coaches/route.ts`

```typescript
const COACH_BATCH_SIZE = 3;

// Pin-first: if this participant already has a batch assigned, return those same coaches.
// Re-fetch from the pool so capacity data stays current, but never re-randomize.
const currentBatchIds: string[] = participantSession.currentBatchIds ?? [];
if (currentBatchIds.length > 0) {
  const coachById = new Map(coaches.map((c) => [c.id, c]));
  const pinnedCoaches = currentBatchIds
    .map((id) => coachById.get(id))
    .filter((c): c is NonNullable<typeof c> => c !== undefined);
  if (pinnedCoaches.length >= COACH_BATCH_SIZE) {
    const cards = await toParticipantCoachCards(pinnedCoaches, false);
    const response = NextResponse.json({
      coaches: cards,
      allAtCapacity: false,
      remixUsed: participantSession.remixUsed,
    });
    // Refresh cookie TTL without changing any state.
    writeParticipantSession(response, { ...participantSession, currentBatchIds });
    return response;
  }
}

// No pinned batch yet (or batch is incomplete) — pick a fresh one and pin it.
const batch = pickCoachBatch({
  coaches,
  shownCoachIds: participantSession.shownCoachIds,
  count: COACH_BATCH_SIZE,
});
const cards = await toParticipantCoachCards(batch.selected, false);
const batchIds = cards.map((coach) => coach.id);
const nextShownIds = Array.from(
  new Set([...participantSession.shownCoachIds, ...batchIds])
);

const response = NextResponse.json({
  coaches: cards,
  allAtCapacity: false,
  remixUsed: participantSession.remixUsed,
});

writeParticipantSession(response, {
  ...participantSession,
  shownCoachIds: nextShownIds,
  currentBatchIds: batchIds,
});
```

**Key guard:** `pinnedCoaches.length >= COACH_BATCH_SIZE` — if any pinned coach was removed from the pool (deactivated, capacity-full removal), the partial set falls through to a fresh pick-and-repin rather than returning an incomplete batch to the participant.

### 4. Update `currentBatchIds` on remix

`src/app/api/participant/coaches/remix/route.ts`

```typescript
writeParticipantSession(response, {
  ...participantSession,
  shownCoachIds: nextShownIds,
  currentBatchIds: cards.map((coach) => coach.id), // ← pin the new batch
  remixUsed: true,
});
```

### 5. Client syncs `remixUsed` from server on every load

`src/app/participant/select-coach/page.tsx`

```typescript
async function loadInitialCoaches() {
  const result = await fetchCoaches();
  // Sync remix state from server — prevents browser refresh from resetting the limit.
  setRemixUsed(result.remixUsed);
  // ... rest of load logic
}
```

### Also: Initialize `currentBatchIds` in session creation

`src/app/api/participant/auth/verify-email/route.ts` — required by the updated interface:

```typescript
writeParticipantSession(response, {
  participantId: match.participantId,
  engagementId: match.engagementId,
  organizationId: match.organizationId,
  cohortId: match.cohortId,
  email: match.email,
  shownCoachIds: [],
  remixUsed: false,
  currentBatchIds: [], // ← added
});
```

## Prevention

### Rule

> **Any UI state that must survive browser refresh must be initialized from the server, not from React state defaults.**

This applies to: selected options in wizard flows, capacity-limited resources (remix usage), pinned batch assignments, and any session metadata that affects rendering.

The anti-pattern: `React useState(default)` → browser refresh → state resets → UI diverges from server truth.

### Warning Signs in Code Review

| Warning Sign | What It Means | Fix |
|---|---|---|
| `useState(false)` for a server-enforced limit | No server backing; resets on refresh | Return the flag from the API; `setFlag(result.flag)` on load |
| `useState([])` for a randomized batch | Batch re-randomizes on every mount | Server pins the batch; API returns `currentBatchIds` |
| API route calls shuffle/randomize on every request | No persistence between requests | Add pin-first logic: check session before randomizing |
| Limit checked only on client | Server never enforced; trivially bypassable | Server returns and enforces the limit; client is a display layer only |
| `setRemixUsed(true)` only on user action, never on load | Resets to `false` on refresh | Also call `setRemixUsed(result.remixUsed)` in the fetch-on-mount handler |

### Code Review Checklist (Participant Portal)

- [ ] Does this state need to survive browser refresh? If yes: is it initialized from the API response, not from `useState(defaultValue)`?
- [ ] Does the GET endpoint include all server-authoritative flags (`remixUsed`, `currentBatchIds`) in the response body?
- [ ] For limited actions (remix, selection): does the server enforce the limit AND return current limit state?
- [ ] If a coach/item can be removed from the pool, does the pin-first guard require a full batch (`>= BATCH_SIZE`) before trusting the pin?

### Correct Pattern: Server-Authoritative State in Next.js

```
Server session cookie = Source of Truth
       ↓
GET /api/participant/coaches returns {
  coaches: [...],          ← pinned batch
  remixUsed: false,        ← consumption flag
  allAtCapacity: false
}
       ↓
React component fetches on mount (useEffect)
       ↓
setRemixUsed(result.remixUsed)       ← sync from server
setDisplayedCoaches(result.coaches)  ← sync from server
       ↓
UI renders from synced state (never from defaults)
```

### Test Scenario

1. Land on `/participant/select-coach`, note the 3 coach IDs shown
2. **Refresh browser** → same 3 coaches must appear (batch pinned)
3. **Use remix** → note new 3 coaches shown
4. **Refresh after remix** → same remixed 3 coaches; remix button disabled ("No More Refreshes Available")
5. Navigate away and return → same state preserved

**Failure criterion:** Different coaches on refresh, or remix button re-enabled after refresh.

## Related

- `docs/research/participant-workflow-research.md` — Section 4.3 documents the coach selector flow and remix behavior; Section 3 has the complete participant flow map
- `docs/plans/2026-02-12-feat-mvp-backend-vertical-slices-plan.md` — Slice 1.2 spec for participant auth and coach selection APIs (remix tracking, `SELECT FOR UPDATE` for race condition guard)
- GitHub issue #6 — Deferred hardening backlog (middleware auth enforcement, DB index/check-constraint hardening)
