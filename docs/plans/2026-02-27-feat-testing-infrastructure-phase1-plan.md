---
title: "feat: Testing Infrastructure Phase 1 — Vitest + Unit & API Route Tests"
type: feat
date: 2026-02-27
deepened: 2026-02-27
brainstorm: docs/brainstorms/2026-02-27-testing-strategy-brainstorm.md
---

# Testing Infrastructure — Phase 1: Vitest Setup + Unit & API Route Tests

## Enhancement Summary

**Deepened on:** 2026-02-27
**Research agents used:** Security Sentinel, Architecture Strategist, Performance Oracle, TypeScript Reviewer, Simplicity Reviewer, Best Practices Researcher, Framework Docs Researcher, Context7 (Vitest)

### Key Improvements from Research

1. **Critical correction:** Route handlers use `NextRequest` (not `Request`) — update all test construction to use `NextRequest` from `next/server`, or use `next-test-api-route-handler`
2. **Critical security gap:** `.env.test` and `.env.staging.secrets` are NOT covered by current `.gitignore` — fix before creating any env files
3. **Scope refined by Simplicity Reviewer:** Cut `utils.test.ts` (tests stdlib wrappers, not your logic), but keep participant coaches route contract tests in Phase 1 (recent regressions happened there)
4. **Two separate rate limiters discovered:** In-memory IP-based + DB-backed email-based — must reset `globalThis.__rateLimitBuckets` in `beforeEach` or tests bleed
5. **8 missing security test cases** added: magic-link POST path, cross-scope token misuse, cookie security attributes, `WINDOW_CLOSED` cookie clearing, email normalization
6. **CI workflow file** added to implementation file list
7. **`next-test-api-route-handler` + `vitest-mock-extended`** added as devDeps — both are community-standard for this pattern
8. **Prisma mocking strategy clarified:** `vitest-mock-extended` for unit/route tests; real DB only for advisory lock paths (`consumeMagicLinkOneTime`, `consumeParticipantEmailRateLimit`)
9. **`pickCoachBatch` is non-deterministic** (Fisher-Yates shuffle) — assert structural invariants, not ordering
10. **Participant coaches routes** (`coaches`, `coaches/remix`, `coaches/select`) added to Phase 1 coverage for flow-state persistence and one-way-door protections
11. **Phase boundary clarified:** DB-concurrency tests move to **Phase 1.5** (real Postgres), while browser E2E remains Phase 2

---

## Overview

The platform currently has zero tests and no testing framework. This plan establishes Phase 1 of a layered test pyramid: Vitest for unit tests and API route handler tests. Phase 1.5 covers real-DB concurrency tests. Phase 2 covers browser-level E2E strategy.

**Scope:** Pure function unit tests + participant/auth API route handler tests (with Prisma mocked), including participant coaches GET/remix/select contract tests.

**Not in scope:** Component rendering tests, admin/coach portal tests, and broad UI E2E coverage. DB-concurrency validation is deferred to Phase 1.5.

---

## Problem Statement / Motivation

The only quality gate today is a pre-push build check. We're heading into launch with no regression safety net. The highest-risk code — auth token signing/verification, email guard decision tree, magic-link one-time consume — has never been exercised by automated tests. A bug in any of these is a security issue or means the product doesn't work for users.

Phase 1 addresses the highest-risk areas with fast, stable tests that run in seconds.

---

## Proposed Solution

Install Vitest. Write ~40 tests covering:
1. Auth token lifecycle (custom HMAC-SHA256, not JWT) — security-critical
2. Email guard logic (7 env-driven code paths) — highest branch complexity
3. Rate limiter (in-memory, resettable) — IP blocking behavior
4. Coach batch selection logic (capacity counting + panel filtering) — pure function with real business rules
5. Auth API route handlers (mock Prisma, call with `NextRequest`) — verify-email + magic-link/consume + magic-link/request
6. Participant coaches routes (GET pin-first, remix one-way door, select contract behavior)
7. Remix state persistence on refresh (`remixUsed` returned from server and honored by client)

Route tests mock Prisma with `vitest-mock-extended`. Advisory lock paths (`consumeMagicLinkOneTime`, `consumeParticipantEmailRateLimit`) are tested via route handlers with mocked Prisma for logic correctness in Phase 1, then verified for concurrency in Phase 1.5 with real Postgres.

### Research Insight — Simplicity Reviewer

> Cut `src/lib/utils.test.ts`. The functions it covers (`formatDate`, `formatRelativeTime`, `cn()`) wrap the JavaScript standard library and third-party packages — testing them is testing that those libraries work, not your business logic. `getInitials` is worth 2 test cases but not a separate file. The high-value targets are the auth, guard, and capacity logic with real branching complexity.

---

## Technical Considerations

### Vitest with Next.js App Router

**Critical correction from Architecture Strategist:** The plan originally stated `new Request(...)` but the actual route handlers use `NextRequest`:

```typescript
export async function POST(request: NextRequest): Promise<Response>
```

`NextRequest` extends `Request` and adds `.cookies`, `.nextUrl`, and `.headers` extensions that route handlers actively use. Tests must use `NextRequest` from `next/server` or `next-test-api-route-handler`.

**Pattern A — Direct import (simpler, covers most cases):**

```typescript
// @vitest-environment node
import { NextRequest } from 'next/server'
import { POST } from './route'

const req = new NextRequest('http://localhost/api/participant/auth/verify-email', {
  method: 'POST',
  headers: { 'content-type': 'application/json', cookie: `fc_participant_session=${signedToken}` },
  body: JSON.stringify({ email: 'user@usps.gov' }),
})
const response = await POST(req)
expect(response.status).toBe(200)
```

**Pattern B — `next-test-api-route-handler` (required for complex cookie/context cases):**

```typescript
import { testApiHandler } from 'next-test-api-route-handler' // MUST be first import
import * as appHandler from './route'

await testApiHandler({
  appHandler,
  requestPatcher(request) {
    request.headers.set('cookie', `fc_participant_session=${signedToken}`)
  },
  async test({ fetch }) {
    const res = await fetch({ method: 'POST', body: JSON.stringify({ email: 'user@usps.gov' }) })
    expect(res.status).toBe(200)
  },
})
```

**Important:** `next-test-api-route-handler` must be the first import in any test file that uses it (AsyncLocalStorage initialization order).

**`next/headers` mock — async in Next.js 15:** `cookies()` and `headers()` return Promises in Next.js 15. Mocks must be async:

```typescript
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn((name: string) => ({ name, value: 'mock' })),
    set: vi.fn(),
    delete: vi.fn(),
    has: vi.fn(() => false),
    getAll: vi.fn(() => []),
  })),
  headers: vi.fn(async () => ({ get: vi.fn(() => null) })),
}))
```

**`server-only` stub:** Some imports trigger `server-only` which throws outside Next.js runtime. Add to `vitest.setup.ts`:

```typescript
vi.mock('server-only', () => ({}))
```

### Test Database Strategy

**Research finding — Simplicity Reviewer + Architecture Strategist:**

Phase 1 route handler tests mock Prisma with `vitest-mock-extended`. The only paths that genuinely require real DB behavior are:
- `consumeMagicLinkOneTime` — advisory lock + AuditEvent row
- `consumeParticipantEmailRateLimit` — DB-backed sliding window

For Phase 1, test these paths via mocked Prisma (verifying correctness logic, not DB concurrency). Real DB + concurrency tests move to **Phase 1.5**:

- Concurrent consume race for magic-link one-time tokens (`Promise.all`, expect exactly one success)
- Concurrent participant email rate-limit checks (window + advisory lock correctness)
- Coach selection contention on same coach near capacity (transactional consistency)

`.env.test` only needs:
```bash
AUTH_SECRET=test-secret-minimum-32-characters-long-here
NODE_ENV=test
EMAIL_OUTBOUND_ENABLED=false
EMAIL_MODE=sandbox
NEXT_PUBLIC_SUPABASE_URL=   # empty — disables Supabase Storage HTTP calls in tests
MAGIC_LINK_TTL_MINUTES=30
```

No `DATABASE_URL` needed in Phase 1.

Phase 1.5 introduces `.env.test.db` with an isolated local/ephemeral Postgres URL and disposable test schema.

### Prisma Mocking — `vitest-mock-extended`

Use `vitest-mock-extended` for type-safe Prisma mocks. Mocks derive from the generated PrismaClient type — schema changes break tests at compile time, not runtime.

```typescript
// src/lib/__mocks__/db.ts
import { PrismaClient } from '@prisma/client'
import { mockDeep, mockReset } from 'vitest-mock-extended'

export const prismaMock = mockDeep<PrismaClient>()

// src/__tests__/setup.ts — reset between tests
import { beforeEach, vi } from 'vitest'
import { prismaMock } from '../lib/__mocks__/db'

vi.mock('@/lib/db', () => ({ prisma: prismaMock }))

beforeEach(() => {
  mockReset(prismaMock)
  globalThis.__rateLimitBuckets = undefined // reset IP rate limiter
  vi.unstubAllEnvs()
})
```

Mock `$transaction` pattern:

```typescript
prismaMock.$transaction.mockImplementation(
  async (fn: (tx: typeof prismaMock) => Promise<unknown>) => fn(prismaMock)
)
```

### Rate Limiter — Two Separate Rate Limiters

**Discovery from Security Sentinel + Architecture Strategist:**

The `verify-email` route runs two independent rate limiters:

1. **In-memory IP-based** (`consumeRateLimit` in `src/lib/server/rate-limit.ts`) — stored in `globalThis.__rateLimitBuckets`. State persists across tests unless explicitly reset. **Must reset in `beforeEach`:**

```typescript
beforeEach(() => { globalThis.__rateLimitBuckets = undefined })
```

2. **DB-backed email-based** (`consumeParticipantEmailRateLimit` in `src/lib/server/security-guards.ts`) — uses `AuditEvent` rows + advisory lock. Mock with `prismaMock.auditEvent.count.mockResolvedValue(0)` for Phase 1.

### `pickCoachBatch` — Non-deterministic

**Discovery from Performance Oracle + Architecture Strategist:**

`pickCoachBatch` uses Fisher-Yates shuffle with `Math.random()`. Tests must assert **structural invariants** (count, capacity exclusion, panel filtering), not specific ordering:

```typescript
const batch = pickCoachBatch(coaches, 3, [])
expect(batch.length).toBe(3)
expect(batch.every(c => !c.atCapacity)).toBe(true)
expect(batch.map(c => c.id)).not.toContain(alreadyShownId)
```

Do NOT assert `batch[0].id === 'specific-id'` — will fail randomly.

### Vitest Config

**Production-ready config based on framework docs research:**

```typescript
// vitest.config.mts (use .mts to avoid tsconfig conflict with next.config.ts)
import { defineConfig, loadEnv } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig(({ mode }) => ({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/*.test.ts'],
    env: loadEnv(mode, process.cwd(), ''), // loads .env.test when run with --mode test
    server: {
      deps: {
        inline: ['next', 'next-test-api-route-handler'], // prevent ESM resolution errors
      },
    },
    coverage: {
      provider: 'v8',
      include: ['src/lib/**/*.ts', 'src/app/api/**/*.ts'],
      exclude: ['**/*.test.ts', '**/*.d.ts', '**/node_modules/**'],
      reporter: ['text', 'json', 'html'],
    },
  },
}))
```

---

## Acceptance Criteria

### Setup
- [x] `npm test` runs all Vitest tests
- [x] `npm run test:coverage` produces V8 coverage report
- [x] Tests complete in < 10 seconds
- [x] `.env.test` documented in `.env.test.example` (no DB URL — not needed in Phase 1)
- [x] `.env.test` and `.env.staging.secrets` added to `.gitignore` (prerequisite — see Risks)
- [x] `vitest.config.mts` resolves `@/` path aliases correctly via `tsconfigPaths()`
- [x] `vi.mock('server-only', () => ({}))` in `setup.ts`

### Unit Tests — `src/lib/email/guard.ts`
- [x] No recipients → `NO_RECIPIENTS`
- [x] `EMAIL_OUTBOUND_ENABLED=false` → `OUTBOUND_DISABLED`
- [x] Production + `EMAIL_MODE` not "live" → `PRODUCTION_SANDBOX`
- [x] Production + "live" → `ALLOWED`
- [x] Non-production + not "sandbox" mode → `NON_PRODUCTION_NOT_SANDBOX`
- [x] Non-production + sandbox + empty allowlist → `NO_ALLOWLIST_MATCH`
- [x] Non-production + sandbox + recipient on allowlist → `ALLOWED`
- [x] Non-production + sandbox + recipient NOT on allowlist → `NO_ALLOWLIST_MATCH`

### Unit Tests — `src/lib/server/session.ts`
- [x] `createSignedToken` + `verifySignedToken` round-trip succeeds
- [x] Expired token (past `exp`) → returns null
- [x] Wrong secret → returns null
- [x] Tampered payload (modified base64) → returns null
- [x] Tampered signature → returns null
- [x] Token with extra trailing dot-segments (e.g. `encoded.sig.extra`) → returns null *(security — parser behavior on malformed input)*
- [x] Empty string token → returns null without throwing
- [x] Participant session scope (`"participant"`) rejected by portal session verifier → null *(cross-scope misuse)*
- [x] **Magic-link scope token** (`"magic-link"`) rejected by BOTH participant AND portal session verifiers → null *(most dangerous cross-scope: attacker extracts magic-link token from URL, sets as session cookie)*
- [x] `AUTH_SECRET` missing/empty → `getAuthSecret()` throws without leaking secret value
- [x] Magic-link token has correct scope
- [x] `exp` exactly equal to `now` → token is expired (boundary: check is `<=`, not `<`)

### Unit Tests — `src/lib/server/rate-limit.ts`
- [x] `getRequestIpAddress` — `x-forwarded-for: attacker-ip, real-ip` → returns first segment `attacker-ip` (rate limiting is keyed on first hop, as expected)
- [x] `getRequestIpAddress` — `x-real-ip` header → returns it
- [x] `getRequestIpAddress` — no headers → returns "unknown"
- [x] `consumeRateLimit` — first request passes
- [x] `consumeRateLimit` — requests under limit all pass
- [x] `consumeRateLimit` — request at limit returns false (blocked)
- [x] `consumeRateLimit` — window boundary: request exactly at `windowMs` after first request is ALLOWED (filter is `ts > windowStart`, strict greater-than)
- [x] `globalThis.__rateLimitBuckets` reset in `beforeEach` — confirmed isolation between test cases

### Unit Tests — `src/lib/server/participant-coach-service.ts` (pickCoachBatch)

Assert structural invariants, not ordering (shuffle is non-deterministic):

- [x] Pool with ≥3 available coaches → returns exactly 3 (length assertion)
- [x] Capacity counting: `COACH_SELECTED` counts toward cap (coach excluded when at 20)
- [x] Capacity counting: `IN_PROGRESS` counts toward cap
- [x] Capacity counting: `ON_HOLD` counts toward cap
- [x] Capacity counting: `COMPLETED` does NOT count toward cap (coach still available)
- [x] Capacity counting: `CANCELED` does NOT count toward cap
- [x] Capacity counting: `INVITED` does NOT count toward cap
- [x] No returned coach has `atCapacity: true`
- [x] MLP/ALP programs draw from shared coach pool (same pool ID)
- [x] EF/EL programs draw from shared coach pool (different pool ID from MLP/ALP)
- [x] `shownCoachIds` exclusion — returned batch IDs do not overlap with previously shown IDs
- [x] Pool with < 3 available coaches → returns however many are available (no crash)
- [x] Pool with 0 available coaches → returns empty array (no crash)

### API Route Tests — `src/app/api/participant/auth/verify-email/route.ts`

*(Prisma mocked via `vitest-mock-extended`)*

- [x] Valid participant email → returns 200, sets `fc_participant_session` cookie
- [x] Cookie has `httpOnly: true`, `sameSite: "lax"` attributes *(security — silent regression prevention)*
- [x] Email normalization: `  USER@EXAMPLE.COM  ` produces same session as `user@example.com`
- [x] Unknown email (not in roster) → returns `UNRECOGNIZED_EMAIL` error code
- [x] IP rate limit exceeded (mock `consumeRateLimit` returns false) → returns 429 with `Retry-After` header
- [x] Email rate limit exceeded (mock `consumeParticipantEmailRateLimit` returns blocked) → returns 429
- [x] IP rate limit blocks before email rate limit is checked (no DB call when IP is blocked)
- [x] `WINDOW_CLOSED` response clears session cookie with `maxAge: 0`
- [x] Missing email in body → returns `{ success:false, error:"UNRECOGNIZED_EMAIL" }` (current contract)
- [x] Malformed request body → returns `{ success:false, error:"UNRECOGNIZED_EMAIL" }` (current contract)
- [x] Follow-up ticket created if contract is intentionally changed to 400 in future (tests must change with contract)

### API Route Tests — `src/app/api/auth/magic-link/request/route.ts`

*(Missing from original plan — this route exists and is in production)*

- [x] Unknown email returns `{ success: true }` (non-enumeration: same response for known/unknown)
- [x] Known email triggers token creation with correct `userId`, `email`, `role` in payload
- [x] Invalid email format (no `@`) → returns 400
- [x] Missing email body → returns 400
- [x] `EMAIL_OUTBOUND_ENABLED=false` → returns 403 `EMAIL_BLOCKED` error
- [x] Archived user (`archivedAt` not null) → returns `{ success: true }` without sending

### API Route Tests — `src/app/api/auth/magic-link/consume/route.ts`

*(Prisma mocked; advisory lock concurrency deferred to Phase 1.5 real-DB tests)*

- [x] Valid GET token → sets `fc_portal_session` cookie, response is redirect with `Location` header
- [x] Valid POST token → returns `{ role, redirectTo }` JSON (different contract from GET)
- [x] Expired token (GET) → redirects to `/auth/signin?error=expired`
- [x] Already-consumed token (mock `auditEvent.findFirst` returns existing row) → redirects to `/auth/signin?error=expired`
- [x] Tampered token → redirects to `/auth/signin?error=expired`
- [x] User with `role: COACH` → redirects to coach portal
- [x] User with `role: ADMIN` → redirects to admin portal
- [x] `active: false` user → rejected (mock `user.findFirst` returns null)
- [x] Session cookie has `httpOnly: true`, `sameSite: "lax"` attributes *(security — cookie attribute regression)*

### API Route Tests — `src/app/api/participant/coaches/remix/route.ts`

*(Prisma mocked — one-way door behavior)*

- [x] First remix request (mock `remixUsed: false`) → returns new batch, sets `remixUsed: true` in session
- [x] Second remix attempt (mock `remixUsed: true`) → rejected, returns error
- [x] No valid session → 401

### API Route Tests — `src/app/api/participant/coaches/route.ts`

*(Prisma mocked — pin-first refresh behavior + remix state contract)*

- [x] First GET with valid session and no `currentBatchIds` → returns 3 coaches, writes pinned `currentBatchIds` to session
- [x] Second GET with same session and `currentBatchIds` set → returns same coach IDs (no re-randomization)
- [x] Legacy session payload without `currentBatchIds` (undefined) → route falls back safely, returns valid batch, sets `currentBatchIds`
- [x] `allAtCapacity=true` response includes `remixUsed` and clears `currentBatchIds`
- [x] Response always includes `remixUsed` (contract required by client state hydration)
- [x] Invalid session → 401 `INVALID_SESSION`
- [x] Already selected engagement (`status !== INVITED`) → 409 `ALREADY_SELECTED`
- [x] Closed selection window → 409 `WINDOW_CLOSED`

### API Route Tests — `src/app/api/participant/coaches/select/route.ts`

*(Prisma mocked — selection contract and edge behavior)*

- [x] Valid selection request → `{ success: true, coach, bookingUrl }`
- [x] Invalid session → `INVALID_SESSION`
- [x] Closed selection window → `WINDOW_CLOSED`
- [x] Already selected engagement → `ALREADY_SELECTED`
- [x] Capacity full or lock contention → `CAPACITY_FULL`
- [x] Missing/invalid request body currently returns `CAPACITY_FULL` (documented current behavior; separate hardening ticket may change to `INVALID_REQUEST`)

---

## Success Metrics

- All tests pass
- Auth token tests prove tamper-resistance (wrong secret, tampered payload, cross-scope misuse all return null)
- Capacity counting rule confirmed for all 6 engagement statuses
- Magic-link replay confirmed to block (AuditEvent mock returns existing row)
- Cookie security attributes (`httpOnly`) pinned against silent regression
- `npm test` runs with only `.env.test` configured (no external DB required)
- Participant coach refresh/remix persistence regression is covered by automated route tests

---

## Dependencies & Risks

### Prerequisite — `.gitignore` Fix (DO THIS FIRST)

**Security finding from Security Sentinel:** The current `.gitignore` covers `.env*.local` and `.env` but NOT `.env.test` or `.env.staging.secrets`. A `git add .` would commit real secrets.

Before creating any env files:

```bash
# Add to .gitignore
.env.test
.env.staging.secrets
.env.*.secrets
```

**`.env.staging.secrets` is currently untracked on disk and not gitignored. Fix immediately.**

### Prerequisite — OTP Cleanup

CLAUDE.md (Feb 17) and sessionStorage docs still reference `/participant/verify-otp`. Confirm with team whether this route should be removed before writing participant journey tests.

### Risk — `NextRequest` vs `Request`

All route handlers accept `NextRequest`, not plain `Request`. Test helpers must import `NextRequest` from `next/server`. Plain `Request` works for tests that don't exercise cookies, but use `NextRequest` consistently.

### Risk — `server-only` throws outside Next.js runtime

Some imports trigger `server-only` guard. Add `vi.mock('server-only', () => ({}))` to `setup.ts`. This is a known pattern and does not affect production behavior.

### Risk — ESM resolution errors with Next.js modules

Some Next.js internal imports fail in Vitest's module resolver. Mitigate with `server.deps.inline: ['next', 'next-test-api-route-handler']` in `vitest.config.mts`.

### Risk — Magic-link advisory lock concurrency untestable in Phase 1

`consumeMagicLinkOneTime` uses `pg_advisory_xact_lock` — a real Postgres-level lock. Mock testing verifies happy-path logic but cannot test concurrent replay prevention. Noted explicitly as out-of-scope for Phase 1; add a **Phase 1.5** integration test with real DB and concurrent `Promise.all` calls.

### Risk — `pickCoachBatch` shuffle non-determinism

Fisher-Yates shuffle uses `Math.random()`. Do NOT assert on ordering or specific IDs. Assert length, capacity exclusion, and `shownCoachIds` non-overlap. If specific ordering needs to be tested, mock `Math.random` with a seeded value.

### Risk — Contract mismatch between tests and current route behavior

`verify-email` currently returns `UNRECOGNIZED_EMAIL` for missing/malformed body with status 200, not 400. Keep tests aligned to current contract unless a route-hardening change is explicitly included in this phase.

### Risk — Session shape drift on in-flight cookies

`ParticipantSession` recently added `currentBatchIds`. Route tests must include legacy-cookie fallback cases where this field is absent to prevent runtime regressions during rollout.

---

## Implementation File List

```
vitest.config.mts                                        # New — use .mts (not .ts) to avoid tsconfig conflict
.env.test.example                                        # New — no DB URL; just auth + email env vars
.gitignore                                               # Modified — add .env.test, .env.staging.secrets
src/__tests__/setup.ts                                   # New — global mocks, beforeEach resets
src/lib/__mocks__/db.ts                                  # New — vitest-mock-extended Prisma mock
src/__tests__/factories.ts                               # New — type-safe test data builders (Engagement, User, etc.)
src/__tests__/helpers/assert-api.ts                      # New — typed response assertion helpers
src/lib/email/guard.test.ts                              # New — 8 code path tests
src/lib/server/session.test.ts                           # New — token signing + security tests
src/lib/server/rate-limit.test.ts                        # New — IP rate limiter (reset globalThis in beforeEach)
src/lib/server/participant-coach-service.test.ts         # New — pickCoachBatch structural invariants
src/app/api/participant/auth/verify-email/route.test.ts  # New — verify-email route (Prisma mocked)
src/app/api/auth/magic-link/request/route.test.ts        # New — magic-link/request route (was missing)
src/app/api/auth/magic-link/consume/route.test.ts        # New — magic-link/consume GET + POST
src/app/api/participant/coaches/route.test.ts            # New — GET pin-first + remixUsed contract
src/app/api/participant/coaches/remix/route.test.ts      # New — remix one-way door
src/app/api/participant/coaches/select/route.test.ts     # New — selection route contract
.github/workflows/test.yml                               # New — run tests on every PR
package.json                                             # Modified — add scripts + devDeps
```

**Total: 18 files, ~45 test cases**

---

## Key Config Snippets

### `vitest.config.mts`

```typescript
import { defineConfig, loadEnv } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig(({ mode }) => ({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/*.test.ts'],
    env: loadEnv(mode, process.cwd(), ''), // loads .env.test with --mode test
    server: {
      deps: {
        inline: ['next', 'next-test-api-route-handler'],
      },
    },
    coverage: {
      provider: 'v8',
      include: ['src/lib/**/*.ts', 'src/app/api/**/*.ts'],
      exclude: ['**/*.test.ts', '**/*.d.ts', '**/__mocks__/**'],
      reporter: ['text', 'json', 'html'],
    },
  },
}))
```

### `src/__tests__/setup.ts`

```typescript
import { beforeEach, vi } from 'vitest'
import { mockReset } from 'vitest-mock-extended'
import { prismaMock } from '../lib/__mocks__/db'

// Required: prevent 'server-only' from throwing in test environment
vi.mock('server-only', () => ({}))

// Global Prisma mock
vi.mock('@/lib/db', () => ({ prisma: prismaMock }))

// next/headers — async in Next.js 15
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn(() => undefined),
    set: vi.fn(),
    delete: vi.fn(),
    has: vi.fn(() => false),
    getAll: vi.fn(() => []),
  })),
  headers: vi.fn(async () => ({ get: vi.fn(() => null) })),
}))

beforeEach(() => {
  mockReset(prismaMock)
  globalThis.__rateLimitBuckets = undefined // reset in-memory IP rate limiter
  vi.unstubAllEnvs()
})
```

### `src/lib/__mocks__/db.ts`

```typescript
import { PrismaClient } from '@prisma/client'
import { mockDeep } from 'vitest-mock-extended'

export const prismaMock = mockDeep<PrismaClient>()
export const prisma = prismaMock
```

### `src/__tests__/helpers/assert-api.ts`

```typescript
import { expect } from 'vitest'

export async function assertErrorResponse(
  response: Response,
  expectedStatus: number,
  expectedError: string
): Promise<void> {
  expect(response.status).toBe(expectedStatus)
  const body = await response.json()
  expect(body.success).toBe(false)
  expect(body.error).toBe(expectedError)
}

export async function assertSuccessResponse(
  response: Response,
  expectedStatus = 200
): Promise<unknown> {
  expect(response.status).toBe(expectedStatus)
  const body = await response.json()
  expect(body.success).toBe(true)
  return body
}

export function assertCookieAttribute(response: Response, cookieName: string, attribute: string): void {
  const setCookie = response.headers.get('set-cookie') ?? ''
  expect(setCookie).toContain(cookieName)
  expect(setCookie.toLowerCase()).toContain(attribute.toLowerCase())
}
```

### `.github/workflows/test.yml`

```yaml
name: Test
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      - run: npm ci
      - name: Generate Prisma client
        run: npx prisma generate
      - name: Run tests
        run: npm test -- --mode test
        env:
          AUTH_SECRET: test-secret-for-ci-only-not-production
          NODE_ENV: test
          EMAIL_OUTBOUND_ENABLED: "false"
          EMAIL_MODE: sandbox
          NEXT_PUBLIC_SUPABASE_URL: ""
          MAGIC_LINK_TTL_MINUTES: "30"
```

### `package.json` scripts to add

```json
"test":          "vitest run",
"test:watch":    "vitest",
"test:coverage": "vitest run --coverage"
```

### `package.json` devDependencies to add

```json
"vitest":                        "^2.0.0",
"@vitest/coverage-v8":           "^2.0.0",
"vite-tsconfig-paths":           "^5.0.0",
"vitest-mock-extended":          "^2.0.0",
"next-test-api-route-handler":   "^4.0.0"
```

---

## References

- Brainstorm: `docs/brainstorms/2026-02-27-testing-strategy-brainstorm.md`
- API routes: `src/app/api/` (6 route files)
- Auth implementation: `src/lib/server/session.ts`
- Capacity logic: `src/lib/server/participant-coach-service.ts`
- Email guard: `src/lib/email/guard.ts`
- Rate limiters: `src/lib/server/rate-limit.ts`, `src/lib/server/security-guards.ts`
- Prisma mock: `src/lib/__mocks__/db.ts` (to be created)
- Vitest docs: https://vitest.dev/guide/
- Next.js App Router testing: https://nextjs.org/docs/app/guides/testing/vitest
- next-test-api-route-handler: https://github.com/xunnamius/next-test-api-route-handler
- vitest-mock-extended: https://github.com/eratio08/vitest-mock-extended
- Prisma unit testing guide: https://www.prisma.io/blog/testing-series-2-xPhjjmIEsM
