---
date: 2026-02-27
topic: testing-strategy
---

# Testing Strategy

## Current State

The project has **zero tests** and no testing framework installed. The only quality gate is a pre-push git hook that runs `npm run build`. If it compiles, it ships.

- 0 test files in the codebase
- No Jest, Vitest, Playwright, or Cypress installed
- No CI/CD pipeline (no `.github/workflows/`)
- 44 source files across three portals (participant, coach, admin) + API routes + middleware

## What We're Building

A **layered test pyramid** appropriate for a Next.js App Router codebase at pre-launch/ongoing-development stage:

- **Layer 1 (Unit)**: Vitest — pure functions, utilities, business logic
- **Layer 2 (API Route Integration)**: Vitest — route handlers with mocked Prisma
- **Layer 3 (E2E)**: Claude browser automation (Chrome MCP / `/test-browser`) — Claude-driven smoke tests, not CI-automated Playwright

Target: ~30 unit/API tests in Phase 1. Phase 2: 8-10 browser smoke test scenarios run by Claude.

## Why This Approach

**Vitest over Jest**: Better native ESM support, faster, friendlier with Next.js App Router. No transpilation gymnastics required.

**Chrome MCP / agent-browser over Playwright (Phase 2 decision 2026-02-27):** For a small MVP team, Claude-triggered browser smoke tests provide the pre-launch confidence we need without the overhead of maintaining `.spec.ts` files. Trade-off: not automatic per-PR — requires Claude to run before key deploys. Accepted trade-off at this stage.

When to revisit: If ongoing PR regression becomes painful (bugs slipping past Vitest), add Playwright then. The Phase 2 scenarios are already documented below and could be converted to `.spec.ts` files directly.

**Layered pyramid over E2E-only**: E2E tests are slow and brittle to UI changes. API route tests catch most bugs faster. Claude browser tests fill the "does the whole thing actually work?" gap for launch confidence.

## Key Decisions

- **Framework (unit + API)**: Vitest (Node environment for API routes; React plugin only for component tests)
- **Framework (E2E)**: Chrome MCP / `/test-browser` (Claude-driven) — NOT Playwright. Zero setup, no test files to maintain. Claude runs smoke tests on demand before deploys.
- **Test DB strategy (Phase 1)**: Prisma mocked with `vitest-mock-extended` — no real DB needed in Phase 1. Advisory lock concurrency tests deferred.
- **All four areas covered**: Auth, participant journey, coach capacity/selection, admin/reporting
- **Participant journey**: email verify → coach selection → confirmation (no OTP)

## Phased Rollout

### Phase 1 — Now (API Routes + Unit Tests)
Vitest setup + tests for the highest-risk areas:

**Auth flows** (highest priority):
- `POST /api/auth/verify-email` — email lookup, session cookie set
- `POST /api/auth/magic-link/request` — sends link
- `POST /api/auth/magic-link/consume` — one-time token, session set, AuditEvent tracking
- `GET /api/auth/session` — returns current user
- Middleware: blocks unauthenticated routes, enforces role separation

**Coach capacity + selection logic**:
- `maxEngagements` enforcement (cap at 20 per coach)
- **Counting rule**: `COACH_SELECTED + IN_PROGRESS + ON_HOLD` count against capacity; `INVITED`, `COMPLETED`, `CANCELED` do NOT
- Coach pool filtering by panel (MLP/ALP shared, EF/EL shared)
- 3-shown + 1-remix logic (remix avoids overlap)

**Unit tests**:
- `getStatusColor()`, engagement status utilities
- Date/time formatting utilities
- Capacity calculation helpers

### Phase 2 — Pre-Launch (Claude Browser Smoke Tests)

Run via `/compound-engineering:test-browser` or Claude using Chrome MCP before key deploys. Not in CI — Claude-triggered.

**Participant journey** (core UX — always run before any deploy):
1. Enter participant email → coach selection page loads with 3 coaches
2. Select a coach → confirmation page shows with booking link
3. Try remix → new coaches shown, remix button disabled afterward
4. Capacity enforcement — test with coach at 20 engagements: doesn't appear in list

**Coach portal**:
5. Magic-link email → clicking link → authenticated coach dashboard loads
6. Log a session → engagement card updates to show session logged
7. Forfeited session path — both `FORFEITED_CANCELLED` and `FORFEITED_NOT_USED` displayed correctly

**Admin**:
8. Magic-link → admin dashboard loads with participant/engagement data
9. Engagement status filter → correct rows shown

**How to run:** Ask Claude to test the participant flow before a deploy. Claude navigates your staging URL using Chrome MCP, validates each step, and screenshots any failures.

**Future migration:** These 9 scenarios map 1:1 to Playwright tests if you later decide to automate them in CI.

### Phase 3 — Ongoing
- Add Vitest tests alongside new features (not after)
- CI runs `npm test` on every PR (Vitest only)
- Before every staging → production promotion: ask Claude to run Phase 2 browser smoke test checklist
- Revisit adding Playwright if bugs slip past Vitest and Claude smoke tests

## Open Questions

- **Coverage target**: No specific % target — focus on critical paths, not line coverage metrics
- **OTP cleanup needed**: CLAUDE.md (Feb 17) and `sessionStorage` docs still reference `/participant/verify-otp`. If OTP is no longer in the participant flow, CLAUDE.md needs updating and those routes/references should be removed before writing participant browser smoke tests
- **Claude browser smoke test trigger**: Who triggers Phase 2 smoke tests before each deploy? Manual ask to Claude, or a pre-deploy checklist doc? Decide workflow before launch.

## Decisions Made

- **2026-02-27**: Playwright swapped for Chrome MCP / Claude browser automation for Phase 2 E2E. Zero setup cost, Claude-driven, no test files to maintain. Acceptable trade-off at MVP scale — not CI-automated.
- **2026-02-27**: Phase 1 route tests mock Prisma (no real DB required). Advisory lock concurrency deferred to post-launch hardening.

## Next Steps

→ Implementation plan already created: `docs/plans/2026-02-27-feat-testing-infrastructure-phase1-plan.md`
→ Before Phase 2: define browser smoke test checklist format and deploy trigger workflow
