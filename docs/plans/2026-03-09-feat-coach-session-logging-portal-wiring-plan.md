---
title: "feat: Coach Session Logging API + Portal Wiring"
type: feat
date: 2026-03-09
deadline: 2026-03-16
slice: 3
---

# Coach Session Logging API + Portal Wiring

## Overview

Build the coach-facing API layer and wire the existing coach portal pages to real data. Coaches will be able to log sessions against their engagements, with auto-save, engagement status auto-transitions, and a real-time dashboard. This is Slice 3 of the MVP — scoped to coach session logging and portal wiring only. Bulk import, NeedsAttentionFlag cron, flag resolution UI, and admin engagement detail are deferred.

**Users**: Coaches (starting with ~15 MLP/ALP panel, scaling to all coaches)
**Deadline**: March 16, 2026

## Problem Statement

Coach portal pages (`/coach/dashboard`, `/coach/engagements`, `/coach/engagements/[id]`) exist with fully-built UI but are 100% hardcoded demo data. Zero `/api/coach/*` routes exist. Coaches cannot log sessions, view their real engagements, or track progress. The March 16 deadline requires coaches to begin logging sessions for active engagements.

## Proposed Solution

### Phase 1: Coach Scope Infrastructure (~3 hours)

Create the `resolveCoachScope` helper, shared types, and the `transitionEngagement` helper.

**Files:**
- `src/lib/server/coach-scope.ts` — new file
- `src/lib/types/coach.ts` — new file (coach-specific response types)
- `src/lib/server/engagement-transitions.ts` — extract from participant select route

#### 1.1 Coach Scope Helper

```typescript
// src/lib/server/coach-scope.ts
import 'server-only'

interface CoachScope {
  coachProfileId: string      // non-nullable
  organizationCoachId: string // non-nullable
  organizationId: string      // non-nullable
}

// resolveCoachScope(session: PortalSession): Promise<CoachScope>
// 1. Takes PortalSession (from readPortalSession)
// 2. Looks up CoachProfile by userId (unique) — throw if not found
// 3. Verifies CoachProfile.active === true — throw if deactivated
// 4. Looks up OrganizationCoach by coachProfileId + USPS org
// 5. Verifies OrganizationCoach.active === true and archivedAt === null
// 6. Returns the compound scope object
// Throws typed errors:
//   - COACH_PROFILE_NOT_FOUND => 500 (data integrity issue)
//   - COACH_ACCESS_DISABLED => 403 (coach inactive/archived)
// TODO: multi-org support
```

Returns a compound object (not just org ID like the admin helper) so ownership checks are one-liner queries. Liveness checks (active + not archived) are here because a deactivated coach's cookie remains valid for up to 12 hours.

Role check (`session.role !== UserRole.COACH` → 401) must happen BEFORE calling `resolveCoachScope`, matching the admin pattern. If scope resolution fails because the coach profile is missing, that's a 500 data integrity issue. If scope resolution fails because the coach is deactivated/archived, return 403 and clear portal session cookie.

**Ownership enforcement pattern** (used in every coach route):
```typescript
// Auth chain: readPortalSession → role check → resolveCoachScope → ownership
const session = await readPortalSession(request)
if (!session || session.role !== UserRole.COACH) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}
const scope = await resolveCoachScope(session)
const engagement = await prisma.engagement.findFirst({
  where: {
    id: engagementId,
    organizationCoachId: scope.organizationCoachId,
    archivedAt: null
  }
})
if (!engagement) return NextResponse.json({ error: "Not found" }, { status: 404 })
// Return 404 (not 403) for ownership failures — prevents leaking resource existence.
```

#### 1.2 Type Definitions

```typescript
// src/lib/types/coach.ts
export interface CoachSessionRow {
  id: string
  sessionNumber: number
  status: SessionStatus
  occurredAt: string | null
  topic: string | null
  outcome: string | null
  durationMinutes: number | null
  privateNotes: string | null  // coach-only — never include in admin types
  createdAt: string
}
```

When the admin engagement detail panel is built (deferred), create a separate `AdminSessionRow` type that deliberately excludes `privateNotes` as a compile-time boundary.

#### 1.3 Extract `transitionEngagement` Helper

```typescript
// src/lib/server/engagement-transitions.ts
// Extract from src/app/api/participant/coaches/select/route.ts (lines 112-135)
export async function transitionEngagement(
  tx: Prisma.TransactionClient,
  engagementId: string,
  targetStatus: EngagementStatus,
  currentStatusVersion: number
): Promise<{ newStatusVersion: number }> {
  const updated = await tx.engagement.updateMany({
    where: { id: engagementId, statusVersion: currentStatusVersion },
    data: {
      status: targetStatus,
      statusVersion: { increment: 1 },
      lastActivityAt: new Date(),
    },
  })
  if (updated.count === 0) {
    throw new Error('CONCURRENT_STATUS_CHANGE')
  }
  return { newStatusVersion: currentStatusVersion + 1 }
}
```

`updateMany` with version guard returns `{ count: 0 }` silently on stale version (no exception). The `count === 0` check and throw ensures the entire transaction rolls back.

#### 1.4 Conditional Validation Helper

```typescript
// src/lib/validation/session-validation.ts
// Rules-map keyed by session status — no Zod dependency
// COMPLETED requires: occurredAt, topic, outcome, durationMinutes
// FORFEITED_* requires: only status
// Topic validation: (SESSION_TOPICS_BY_PROGRAM[code] as readonly string[]).includes(topic)
```

Note: `as const` arrays need an explicit cast for `.includes()`. Extract `isValidTopicForProgram(programCode: ProgramCode, topic: string): boolean` into `src/lib/config.ts`.

---

### Phase 2: Session Logging API (~2-3 days)

**Route conventions** (all 6 routes must include):
- `export const dynamic = "force-dynamic"` on every GET route
- `Cache-Control: no-store` response header on all responses
- `archivedAt: null` in all Prisma where clauses
- Success response: `{ item: CoachSessionRow }` for POST/PATCH, `{ items: [...] }` for GET lists
- Error response: `{ error: "message" }` with appropriate status code

#### 2.1 Create Session — `POST /api/coach/sessions/route.ts`

**Request**: `{ engagementId, occurredAt?, topic?, outcome?, durationMinutes?, privateNotes?, status }`

**Success Response**: `{ item: CoachSessionRow }` with status 201

**Transaction flow** (with advisory lock):
```typescript
await prisma.$transaction(async (tx) => {
  // 0. Advisory lock — serialize all session ops for this engagement
  //    Prevents count-then-create race under Read Committed.
  //    Transaction-scoped (xact) locks are PgBouncer-safe.
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${engagementId}))`

  // 1. Load engagement + verify ownership + check status
  const engagement = await tx.engagement.findFirst({
    where: {
      id: engagementId,
      organizationCoachId: scope.organizationCoachId,
      archivedAt: null,
    },
    select: {
      id: true, status: true, statusVersion: true, totalSessions: true,
      program: { select: { code: true } },
    },
  })
  if (!engagement) throw new NotFoundError()
  if (!['COACH_SELECTED', 'IN_PROGRESS'].includes(engagement.status)) {
    throw new InvalidStatusError(engagement.status)
  }

  // 2. Count existing sessions
  const count = await tx.session.count({ where: { engagementId, archivedAt: null } })
  if (count >= engagement.totalSessions) {
    throw new AllSessionsCompletedError()
  }
  const sessionNumber = count + 1

  // 3. Validate fields based on status (via session-validation.ts)

  // 4. Create session — null out topic/outcome/duration for FORFEITED
  const isForfeited = ['FORFEITED_CANCELLED', 'FORFEITED_NOT_USED'].includes(status)
  const session = await tx.session.create({
    data: {
      engagementId,
      sessionNumber,
      status,
      occurredAt: isForfeited ? (occurredAt ?? null) : occurredAt,
      topic: isForfeited ? null : topic,
      outcome: isForfeited ? null : outcome,
      durationMinutes: isForfeited ? null : durationMinutes,
      privateNotes: privateNotes?.slice(0, 5000) ?? null,
    },
  })

  // 5. Auto-transition engagement (thread statusVersion between calls)
  let currentVersion = engagement.statusVersion
  if (count === 0 && engagement.status === 'COACH_SELECTED') {
    const result = await transitionEngagement(tx, engagementId, 'IN_PROGRESS', currentVersion)
    currentVersion = result.newStatusVersion
  }
  if (sessionNumber === engagement.totalSessions) {
    await transitionEngagement(tx, engagementId, 'COMPLETED', currentVersion)
  }

  // 6. Update lastActivityAt (if no status transition already did it)
  if (count > 0 && sessionNumber < engagement.totalSessions) {
    await tx.engagement.update({
      where: { id: engagementId },
      data: { lastActivityAt: new Date() },
    })
  }

  return session
}, {
  maxWait: 3000,
  timeout: 8000,
})
```

FORFEITED sessions have `topic`, `outcome`, and `durationMinutes` nulled server-side regardless of what the client sends. This prevents orphaned data in aggregate queries.

Strip control characters (`\u0000-\u001f` except `\n`, `\t`) from `privateNotes` on input. Validate `occurredAt` as valid ISO 8601 — `new Date("not-a-date")` yields `Invalid Date` silently.

**Validation rules by session status:**

| Field | COMPLETED | FORFEITED_CANCELLED | FORFEITED_NOT_USED |
|-------|-----------|--------------------|--------------------|
| `occurredAt` | Required (no future dates, ≥ 2026-01-01) | Optional | Optional |
| `topic` | Required (validated against program) | Ignored (nulled) | Ignored (nulled) |
| `outcome` | Required (validated against `SESSION_OUTCOMES`) | Ignored (nulled) | Ignored (nulled) |
| `durationMinutes` | Required (validated against `DURATION_OPTIONS`) | Ignored (nulled) | Ignored (nulled) |
| `privateNotes` | Optional (max 5000 chars, strip control chars) | Optional (max 5000 chars) | Optional (max 5000 chars) |

**Error responses:**
- 401 — not authenticated
- 403 — authenticated COACH user is deactivated/archived (scope disabled)
- 404 — engagement not found (also for ownership failures)
- 409 — all sessions already logged, engagement in invalid status, or concurrent status change
- 422 — validation error (invalid topic/outcome/duration, future date, malformed date)
- 500 — unexpected error

**Conflict/timeout mapping**:
- `CONCURRENT_STATUS_CHANGE`, `P2002`, `P2034` → 409 conflict (safe to retry once)
- Transaction timeout/closed transaction errors (`P2028`/timeout) → 503 with retry message

**Race condition handling**: Advisory lock is the primary guard. `@@unique([engagementId, sessionNumber])` is the backup. On `P2002` unique violation, retry once with a fresh transaction:

```typescript
for (let attempt = 0; attempt < 2; attempt++) {
  try {
    return await prisma.$transaction(async (tx) => { /* ... */ })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002' && attempt === 0) {
      continue
    }
    throw e
  }
}
```

#### 2.2 Update Session — `PATCH /api/coach/sessions/[id]/route.ts`

**Request**: `{ topic?, outcome?, durationMinutes?, privateNotes?, occurredAt? }`

**`status` is deliberately excluded from PATCH.** If PATCH accepted `status`, a coach could change FORFEITED_CANCELLED back to COMPLETED without going through the POST transaction logic. Use a whitelist pattern.

**Success Response**: `{ item: CoachSessionRow }` with status 200

- Verify coach owns engagement (via session → engagement → organizationCoachId)
- Whitelist fields: only `topic`, `outcome`, `durationMinutes`, `privateNotes`, `occurredAt`
- **No status transitions on PATCH** — PATCH is always a safe, idempotent field update
- Apply validation against the **stored** `session.status`:
  - `COMPLETED`: `occurredAt/topic/outcome/durationMinutes` must remain non-null and valid
  - `FORFEITED_*`: `topic/outcome/durationMinutes` must stay null (reject non-null payload values)
- `occurredAt` date validation: reject future dates, reject dates before 2026-01-01
- `privateNotes`: max 5000 chars, strip control characters
- No optimistic locking needed — last-write-wins is acceptable for single-coach auto-save

#### 2.3 Engagement Detail — `GET /api/coach/engagements/[id]/route.ts`

- Verify coach owns engagement
- Return participant/org/program/cohort metadata required by `/coach/engagements/[id]`
- Include current status, totalSessions, sessionsCompleted, and `bookingLinkPrimary` mapped to response `meetingBookingUrl`
- Filter: `archivedAt: null`
- Response: `{ item: CoachEngagementDetail }`

#### 2.4 List Sessions — `GET /api/coach/engagements/[id]/sessions/route.ts`

- Verify coach owns engagement
- Return all sessions ordered by `sessionNumber ASC`
- Include all fields (topic, outcome, duration, privateNotes, status, occurredAt)
- Filter: `archivedAt: null`
- Response: `{ items: CoachSessionRow[], engagementId, totalSessions }`

#### 2.5 Coach Engagements List — `GET /api/coach/engagements/route.ts`

- Scope to authenticated coach's `organizationCoachId`
- Query params: `?tab=active|completed` (active = COACH_SELECTED + IN_PROGRESS + ON_HOLD; completed = COMPLETED)
- Include: participant name/email, program name, cohort, session count (`_count`), last session date, engagement status, `meetingBookingUrl`
- DB field mapping: response `meetingBookingUrl` is sourced from `coachProfile.bookingLinkPrimary`
- Use `select` (not `include`) for lean responses — Prisma resolves nested `select` as lateral JOINs (no N+1)
- Batch needs-attention as a secondary `WHERE id IN (...)` query, matching admin engagements pattern
- Pagination: `PAGE_SIZE = 20`
- Response: `{ items: EngagementListItem[], page, pageSize, totalItems, totalPages, tab }`

#### 2.6 Coach Dashboard Stats — `GET /api/coach/dashboard/route.ts`

- Scope to authenticated coach
- **Use `Promise.all` for 3 independent queries** (~150ms warm vs ~450ms sequential):

```typescript
const [statusCounts, sessionsThisWeek, needsAttention] = await Promise.all([
  // 1. Single groupBy covers activeCount, completedCount, completionRate
  prisma.engagement.groupBy({
    by: ['status'],
    where: { organizationCoachId: scope.organizationCoachId, archivedAt: null },
    _count: true,
  }),
  // 2. Sessions in rolling 7 days (based on occurredAt)
  prisma.session.count({
    where: {
      engagement: { organizationCoachId: scope.organizationCoachId },
      occurredAt: { gte: sevenDaysAgo },
      archivedAt: null,
    },
  }),
  // 3. Needs-attention (coach-scoped only)
  getCoachNeedsAttentionEngagements({
    organizationId: scope.organizationId,
    organizationCoachId: scope.organizationCoachId,
  }),
])
```

- Response: `{ activeCount, completedCount, sessionsThisWeek, completionRate, needsAttention: NeedsAttentionEngagement[], coachName, coachRole }`
- Include `coachName` and `coachRole` to replace the hardcoded `"Dr. Sarah Chen"` in the dashboard

---

### Phase 3: Wire Coach Portal Frontend (~2-3 days)

#### 3.0 Data Fetching Pattern

Use existing `useEffect + fetch + AbortController` pattern (matching admin dashboard), not SWR. This avoids a new dependency and maintains codebase consistency. The admin pattern already handles tab-switching races correctly via AbortController.

#### 3.1 Dashboard — `src/app/coach/dashboard/page.tsx`

- Replace hardcoded stats with `useEffect + fetch('/api/coach/dashboard')` + AbortController
- Replace hardcoded engagement list with `useEffect + fetch('/api/coach/engagements?tab=active')`
- Wire needs-attention section from dashboard API
- Resolve coach name/role from dashboard API response (remove hardcoded `"Dr. Sarah Chen"`) and pass into `PortalShell` props (do not rely on static `COACH_PORTAL.userName/userRole`)
- Initialize ALL state from API response, never from `useState` defaults. Use loading skeletons, not hardcoded defaults that could be mistaken for real data. (Lesson from: `docs/solutions/ui-bugs/coach-selector-session-state-refresh-reset.md`)
- Remove "Upcoming Sessions" section for Slice 3 MVP (no scheduling source-of-truth yet)

#### 3.2 Engagements List — `src/app/coach/engagements/page.tsx`

- Replace hardcoded engagements with `useEffect + fetch + AbortController`
- Wire Active/Completed tabs to `tab` query param
- Track loading state per tab (not a shared boolean) to avoid flicker on tab switch
- Click-through to `/coach/engagements/[id]`
- Remove "Next session" display from list rows for Slice 3 MVP (no scheduled-session source in current schema/API)

#### 3.3 Engagement Detail — `src/app/coach/engagements/[id]/page.tsx`

**This page exists with full UI (session form, timeline, participant info) — needs API wiring.**

**Auto-save lifecycle — "Local-until-submit" model:**

```
COMPOSING → (coach fills form, all state is local) → SUBMIT (POST creates session, returns ID)
             → SUBMITTED(sessionId) → (subsequent edits auto-save via PATCH)
```

- **New sessions**: Coach fills the form locally. No server calls until "Log Session" is clicked (POST). Auto-save is disabled.
- **After POST**: The returned `sessionId` enables auto-save. Subsequent edits trigger debounced PATCH.
- **Editing existing sessions**: Auto-save is enabled immediately (session already has an ID).

This eliminates the "PATCH to undefined" bug and the "double-POST" race.

**Wiring checklist:**
- Fetch engagement + sessions: `useEffect + fetch` with AbortController
- Data sources:
  - `GET /api/coach/engagements/[id]` for participant + engagement metadata
  - `GET /api/coach/engagements/[id]/sessions` for timeline + current draft/edit target
- **Fix topic dropdown**: Replace hardcoded `MLP_SESSION_TOPICS` with `SESSION_TOPICS_BY_PROGRAM[engagement.program.code]`
- Wire session form submit → `POST /api/coach/sessions`
- **Cancel pending debounce on Submit** — fold unsaved state into the POST payload
- Wire auto-save → `PATCH /api/coach/sessions/${id}` with **5s** debounce + dirty-checking
- Wire session timeline from API data
- **"Book Next Session" button**: Show when `meetingBookingUrl` is non-null. Hide with message "Contact your program administrator" when null.
- **Conditional form fields**: When status is FORFEITED_*, hide topic, outcome, duration fields
- Show last-saved timestamp for auto-save feedback
- Toast notification on save failure with retry
- Reduce animation stagger on form cards (current 50-450ms is excessive for a page coaches visit dozens of times per week — reduce to 0-30ms or remove)

#### 3.4 Auto-save Implementation

Create a custom `useAutoSave` hook:

```typescript
// src/hooks/use-auto-save.ts
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

function useAutoSave<T>({
  data: T,
  onSave: (data: T) => Promise<void>,
  debounceMs?: number, // default: 5000
  enabled?: boolean,   // false until session has an ID
}): { saveStatus: SaveStatus, flush: () => Promise<void> }
```

- Skip auto-save on initial mount (don't save unchanged data)
- Track dirty state via serialized comparison, not boolean flag
- `flush()` method: cancel timer, execute save immediately (used before navigation and before Submit)
- Cleanup on unmount: fire final save if pending

#### 3.5 Unsaved Changes Warning

```typescript
// src/hooks/use-unsaved-changes-warning.ts
// Two mechanisms needed:
// 1. window.addEventListener('beforeunload') — covers browser close/refresh
// 2. guardedPush wrapper around router.push — covers programmatic navigation
```

`beforeunload` does NOT fire on Next.js client-side navigation. Use `guardedPush` for all back/nav buttons on the form page. For sidebar links, add a minimal `PortalShell` extension (`onNavigate?: (href: string) => Promise<boolean> | boolean`) so nav clicks can be blocked on unsaved changes. Track "unsaved" with a `useRef` covering: debounce pending, PATCH in-flight, and PATCH failed.

---

## Key Decisions & Assumptions

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | **Forfeited sessions count toward `totalSessions`** | A 2-session engagement with 1 forfeit + 1 completed = COMPLETED. Coaches explicitly log forfeits as accountability tracking. |
| 2 | **Only COACH_SELECTED and IN_PROGRESS allow new sessions** | ON_HOLD is admin-managed; COMPLETED/CANCELED are terminal. Return 409. |
| 3 | **No `completedAt` field on Session** | Schema doesn't have it. Derive from `occurredAt` + `status`. No migration needed. |
| 4 | **No session deletion** | Prevents engagement status rollbacks and audit trail tampering. Ops handles mistakes. |
| 5 | **Coach needs-attention uses dynamic query** | Reuses `buildNeedsAttentionWhere` scoped to coach. Sufficient for ≤20 engagements per coach. |
| 6 | **resolveCoachScope hardcodes USPS** | Matches admin pattern. TODO for multi-org. |
| 7 | **PATCH does not accept `status` field** | Prevents bypassing POST transition logic. Whitelist pattern only. |
| 8 | **"Other" topic creates session with topic = "Other"** | Static message is display-only guidance, not a blocker. |
| 9 | **`useEffect + fetch + AbortController` (not SWR)** | Matches admin pattern. No new dependency. |
| 10 | **"Local-until-submit" auto-save** | No server calls until POST. Eliminates PATCH-to-undefined and double-POST races. |
| 11 | **Advisory lock on session creation** | `pg_advisory_xact_lock(hashtext(engagementId))` serializes per-engagement. PgBouncer-safe. |
| 12 | **404 for ownership failures** | Does not leak resource existence. |
| 13 | **FORFEITED: null out topic/outcome/duration server-side** | Prevents orphaned data in aggregate queries. |
| 14 | **`meetingBookingUrl` is response-only naming** | Persisted DB field remains `bookingLinkPrimary`; API maps to stable frontend naming. |
| 15 | **No "Upcoming Sessions"/"Next Session" in Slice 3 MVP** | Scheduling provider is external; no canonical "scheduled next" source in current schema. |

## Acceptance Criteria

### API
- [x] `POST /api/coach/sessions` creates session with auto-assigned sessionNumber
- [x] Advisory lock serializes session creation per engagement
- [x] First session on COACH_SELECTED engagement transitions to IN_PROGRESS
- [x] Final session (sessionNumber === totalSessions) transitions to COMPLETED
- [x] statusVersion threaded correctly; failed transition rolls back entire transaction
- [x] Coach ownership verified on every endpoint (not just role check)
- [x] Topic validated against program-specific list (server-side)
- [x] FORFEITED sessions: topic/outcome/duration nulled server-side
- [x] 409 returned when all sessions logged or engagement in invalid status
- [x] `PATCH /api/coach/sessions/:id` accepts only whitelisted fields (no `status`)
- [x] `PATCH /api/coach/sessions/:id` enforces status-aware invariants (COMPLETED required fields remain non-null; FORFEITED fields remain null)
- [x] `GET /api/coach/engagements/:id` returns engagement detail for coach detail page
- [x] `GET /api/coach/engagements` returns paginated list with session counts
- [x] `GET /api/coach/engagements/:id/sessions` returns ordered session list
- [x] `GET /api/coach/dashboard` returns real stats via `Promise.all`
- [x] `export const dynamic = "force-dynamic"` on all GET routes
- [x] POST returns `{ item }` with 201; PATCH returns `{ item }` with 200

### Frontend
- [x] Dashboard shows real engagement count, sessions this week, completion rate
- [x] All state initialized from API response, not `useState` defaults
- [x] Engagement list shows real data with Active/Completed tabs
- [x] Session form uses "local-until-submit" model (POST first, PATCH after)
- [x] Auto-save fires on 5s debounce with "Saved" indicator
- [x] Pending debounce canceled on Submit
- [x] Topic dropdown is program-aware (MLP vs ALP/EF/EL topics)
- [x] Dashboard and engagements list no longer show hardcoded scheduled-session UI (`Upcoming Sessions` / `Next session`) in Slice 3
- [x] "Book Next Session" hidden when meetingBookingUrl is null
- [x] Forfeited session form hides topic/outcome/duration fields
- [x] `beforeunload` + `guardedPush` for unsaved changes warning
- [x] Coach identity in `PortalShell` is API-driven (not static constants)

### Security
- [x] Every coach API route checks ownership (not just COACH role)
- [x] Private notes never exposed outside coach's own requests
- [x] Private notes capped at 5000 characters with control char stripping
- [x] Future dates rejected for occurredAt
- [x] `status` field not accepted on PATCH
- [x] resolveCoachScope verifies coach active + not archived
- [x] Deactivated/archived coach scope returns 403 and session is cleared

## Technical Considerations

**Concurrency**: Advisory lock (`pg_advisory_xact_lock`) is the primary guard. `@@unique([engagementId, sessionNumber])` is the backup with single P2002 retry. Always use `xact` lock variants (transaction-scoped, PgBouncer-safe). Never use `pg_advisory_lock` (session-scoped) in this codebase.

**Performance**: Dashboard uses `Promise.all` for 3 parallel queries (~150ms warm). Auto-save at 5s debounce + dirty-checking reduces serverless invocations by 60-80%. At 20 engagements per coach, all queries are O(1) via `organizationCoachId` index. No additional indexes needed for MVP.

**Testing**: Follow existing Vitest pattern. Priority test cases:
- Session creation (first, middle, final session)
- Advisory lock + P2002 retry
- statusVersion threading — failed transition rolls back
- Forfeited session with nulled fields
- Ownership enforcement (coach A can't access coach B)
- All sessions logged → 409
- Invalid engagement status → 409
- Topic validation against program
- PATCH rejects `status` field
- PATCH enforces status-aware invariants for existing COMPLETED vs FORFEITED sessions
- `GET /api/coach/engagements/:id` ownership and shape tests
- Transaction timeout / lock-contention error mapping (409 vs 503)
- Manual real-Postgres validation of advisory-lock serialization (mocked Prisma tests cannot prove DB locking behavior)

**Schema**: No migration needed. No `completedAt`, `SessionNote`, or `isDraft` in the schema.

**PgBouncer**: `?pgbouncer=true` required. Transactions hold one pooled connection. Keep transactions <100ms. Set `maxWait: 3000, timeout: 8000`.

## Dependencies & Risks

| Risk | Mitigation |
|------|-----------|
| Topic dropdown bug (hardcoded MLP topics) | Fix as part of wiring |
| Some coaches may not have `meetingBookingUrl` | Hide button with admin contact message (`meetingBookingUrl` mapped from `bookingLinkPrimary`) |
| Auto-save failures could lose notes | Client retains state, shows error, retries on recovery |
| PgBouncer pool pressure from concurrent auto-save | 5s debounce + dirty-check. Monitor after launch. |
| `beforeunload` doesn't cover client-side navigation | `guardedPush` wrapper + onClick interceptors |
| Sidebar links bypass unsaved-change guard | Add `PortalShell` navigation interception hook in this slice |
| Dashboard/list imply scheduled sessions we do not track | Remove `Upcoming Sessions`/`Next session` UI in Slice 3 |
| **7-day estimate for 7-day window (no buffer)** | Parallelize Phase 2c + 3a to recover 0.5 days. Consider cutting animation work if behind. |

## Implementation Order

- [x] **Phase 1a**: `resolveCoachScope` helper + `CoachScope` type (~1 hour)
- [x] **Phase 1b**: Extract `transitionEngagement` helper (~1 hour)
- [x] **Phase 1c**: Session validation helper + coach type definitions (~1 hour)
- [x] **Phase 2a**: `POST /api/coach/sessions` + `PATCH /api/coach/sessions/[id]` (~1 day)
- [x] **Phase 2b**: `GET /api/coach/engagements/[id]` + `GET /api/coach/engagements` + `GET /api/coach/engagements/[id]/sessions` + `GET /api/coach/dashboard` (~1 day)
- [x] **Phase 2c**: Tests for all API routes (~0.5 day) ← **run in parallel with 3a**
- [x] **Phase 3a**: `useAutoSave` + `useUnsavedChangesWarning` hooks + `PortalShell` nav interception hook (~0.5 day) ← **run in parallel with 2c**
- [x] **Phase 3b**: Wire dashboard + engagement list pages (~1 day)
- [x] **Phase 3c**: Wire engagement detail + session form + auto-save (~1 day)
- [x] **Smoke test**: End-to-end coach flow verification completed via automated API + app build validation in this session

**Total estimate**: ~6.5 days with parallelization

## Deferred to Post-March 16

- [ ] Bulk import (CSV validate + advisory lock atomic execution)
- [ ] NeedsAttentionFlag cron (flag table + Vercel cron)
- [ ] Flag resolution UI (RESOLVED/IGNORED states)
- [ ] Engagement detail panel (admin drill-down)
- [ ] Cohort-level KPI filter
- [ ] Coach "Needs Attention" badge
- [ ] Coach profile page
- [ ] Slice 2 next-pass cleanup (filter extraction, type consolidation, AbortController, Dialog)
- [ ] Rate limiting on coach API routes (POST: 30/hr, PATCH: 120/hr, GET: 300/hr per userId)
- [ ] `onDelete: Restrict` on Session→Engagement (prevent cascade delete)
- [ ] `CHECK ("sessionNumber" >= 1)` database constraint
- [ ] `@@index([engagementId, occurredAt])` on Session for reporting
- [ ] `AdminSessionRow` type (when admin engagement detail is built)

## Files to Create

| File | Purpose |
|------|---------|
| `src/lib/server/coach-scope.ts` | Coach scope resolver (mirrors admin-scope.ts) |
| `src/lib/server/engagement-transitions.ts` | Shared status transition helper |
| `src/lib/types/coach.ts` | Coach response types (CoachSessionRow) |
| `src/lib/validation/session-validation.ts` | Conditional validation rules by session status |
| `src/app/api/coach/sessions/route.ts` | POST — create session |
| `src/app/api/coach/sessions/[id]/route.ts` | PATCH — update session fields |
| `src/app/api/coach/engagements/[id]/route.ts` | GET — engagement detail for coach detail page |
| `src/app/api/coach/engagements/route.ts` | GET — coach engagement list |
| `src/app/api/coach/engagements/[id]/sessions/route.ts` | GET — sessions for engagement |
| `src/app/api/coach/dashboard/route.ts` | GET — coach dashboard stats |
| `src/hooks/use-auto-save.ts` | Auto-save hook with debounce + flush |
| `src/hooks/use-unsaved-changes-warning.ts` | beforeunload + guardedPush |

## Files to Modify

| File | Purpose |
|------|---------|
| `src/components/navigation.tsx` | Add optional navigation interception hook for unsaved-changes protection on sidebar nav |
| `src/app/coach/dashboard/page.tsx` | Remove scheduled-session UI sections that lack backend source; consume API-driven coach identity |
| `src/app/coach/engagements/page.tsx` | Remove `nextSession` display and wire list rows to available API data only |

## References

### Internal
- Master plan (Session Logging spec): `docs/plans/2026-02-12-feat-mvp-backend-vertical-slices-plan.md:611-735`
- Slice 3 backlog: `docs/plans/2026-02-27-feat-admin-dashboard-slice-2-reorder-plan.md:863-873`
- Slice 2 completion handoff: `docs/handoffs/20260304-2230-slice2-complete-slice3-ready.md`
- Admin API pattern reference: `src/app/api/admin/dashboard/kpis/route.ts`
- Participant select (advisory lock + statusVersion pattern): `src/app/api/participant/coaches/select/route.ts`
- Admin scope helper: `src/lib/server/admin-scope.ts`
- Needs-attention logic: `src/lib/needs-attention.ts`
- Domain constants: `src/lib/config.ts`
- Session state solution: `docs/solutions/ui-bugs/coach-selector-session-state-refresh-reset.md`
- Coach portal pages: `src/app/coach/dashboard/page.tsx`, `src/app/coach/engagements/page.tsx`, `src/app/coach/engagements/[id]/page.tsx`

### Prisma Schema
- Session model: `prisma/schema.prisma:315-333`
- Engagement model: `prisma/schema.prisma:286-313`
- NeedsAttentionFlag model: `prisma/schema.prisma:335-352`

### External
- [Prisma Interactive Transactions](https://www.prisma.io/docs/orm/prisma-client/queries/transactions)
- [Prisma Error Reference (P2002, P2034)](https://www.prisma.io/docs/orm/reference/error-reference)
- [Prisma with PgBouncer](https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections/pgbouncer)
- [PostgreSQL Advisory Locks](https://www.postgresql.org/docs/current/explicit-locking.html#ADVISORY-LOCKS)
- [Next.js App Router Navigation Guards (Discussion #47020)](https://github.com/vercel/next.js/discussions/47020)
