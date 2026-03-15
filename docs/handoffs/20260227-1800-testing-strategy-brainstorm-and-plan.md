# Session Handoff - Testing Strategy Brainstorm & Phase 1 Plan

**Date**: 2026-02-27
**Branch**: main
**Status**: 🟢 Complete (brainstorm + plan fully documented, no code written)

---

## ✅ Accomplished This Session

- **Audited existing tests**: Confirmed zero tests, zero testing framework, no CI pipeline — only a pre-push build hook
- **Completed full brainstorm** for testing strategy: `docs/brainstorms/2026-02-27-testing-strategy-brainstorm.md`
  - Chose Vitest (unit + API) over Jest; Chrome MCP over Playwright for E2E
  - Documented capacity counting rule: `COACH_SELECTED + IN_PROGRESS + ON_HOLD` count; others don't
  - Corrected participant flow: email verify → coach selection → confirmation (no OTP)
  - Flagged OTP cleanup needed in CLAUDE.md
- **Created Phase 1 implementation plan** (deepened with parallel research agents): `docs/plans/2026-02-27-feat-testing-infrastructure-phase1-plan.md`
  - 16 files to create/modify, ~35 test cases
  - Security-critical additions: cross-scope token misuse, cookie security attributes, magic-link replay, email normalization
  - Critical correction: route handlers use `NextRequest` not `Request`
  - Added `next-test-api-route-handler` + `vitest-mock-extended` as devDeps
  - Phase 1 is DB-free: all route tests mock Prisma
- **Swapped Playwright for Chrome MCP**: Phase 2 E2E uses Claude browser automation, not a test framework. 9 smoke test scenarios documented in brainstorm.

## 🔄 In Progress

Nothing mid-flight. All documentation is complete. Implementation not yet started.

## 📋 Next Steps (Priority Order)

1. **Fix `.gitignore` first** — `.env.test` and `.env.staging.secrets` not gitignored. Security risk. (~5 min)
   - Add to `/Users/amitbhatia/.cursor/franklin-covey/.gitignore`:
     ```
     .env.test
     .env.staging.secrets
     .env.*.secrets
     ```

2. **Implement Phase 1** — Run `/workflows:work docs/plans/2026-02-27-feat-testing-infrastructure-phase1-plan.md` to build the full test infrastructure (~3 hours autonomous)
   - 16 files: vitest.config.mts, setup.ts, __mocks__/db.ts, factories.ts, 12 test files, .github/workflows/test.yml, package.json
   - All test cases specified in plan acceptance criteria

3. **OTP cleanup** — Confirm with team: is `/participant/verify-otp` route dead? If yes, remove references from CLAUDE.md and codebase before writing browser smoke tests

4. **Pre-deploy smoke test checklist** — Create `docs/checklists/pre-deploy-smoke-test.md` with the 9 Phase 2 browser scenarios so Claude can run them before staging → production promotions

5. **Update CLAUDE.md** — Add testing strategy section documenting Vitest + Chrome MCP approach so future agents don't generate Playwright plans

## 🔧 Key Files Created/Modified

- `docs/brainstorms/2026-02-27-testing-strategy-brainstorm.md` — Testing strategy decisions (Vitest + Chrome MCP, no Playwright)
- `docs/plans/2026-02-27-feat-testing-infrastructure-phase1-plan.md` — Full deepened implementation plan (16 files, 35 test cases)

**Existing uncommitted modifications** (pre-existing, unrelated to this session):
- `docs/briefings/` (4 files modified)
- `docs/plans/2026-02-21-*.md` (2 files modified)
- `src/lib/headshots/generated-map.json`
- `scripts/upload-headshots-to-storage.mjs`

## ⚠️ Blockers / Decisions Needed

- **OTP route status**: CLAUDE.md (Feb 17) still describes `/participant/verify-otp` flow but user confirmed OTP is no longer used. Someone needs to remove those references before writing participant browser smoke tests.
- **Smoke test trigger workflow**: Who/how triggers the Phase 2 browser smoke test checklist before deploys? (Claude, human, a checklist doc?) Decide before launch.
- **`vitest.config.mts` extension**: Use `.mts` (not `.ts`) to avoid tsconfig conflict with `next.config.ts` — confirmed in research.

## 🚀 Quick Start Next Session

```
We have a completed Phase 1 testing plan for the FranklinCovey coaching platform at:
docs/plans/2026-02-27-feat-testing-infrastructure-phase1-plan.md

BEFORE implementing, do this one-liner first:
Add `.env.test`, `.env.staging.secrets`, `.env.*.secrets` to .gitignore (security gap).

Then implement Phase 1 using /workflows:work on the plan above.

Key facts:
- Stack: Next.js 15 App Router + Prisma + Supabase + TypeScript
- 0 tests currently exist, no testing framework installed
- Phase 1: Vitest, ~35 tests, 16 files, NO real DB (Prisma mocked with vitest-mock-extended)
- Route handlers use NextRequest (not Request)
- Use next-test-api-route-handler for complex cookie/session route tests
- vi.mock('server-only', () => ({})) in setup.ts (prevents throws outside Next.js runtime)
- Reset globalThis.__rateLimitBuckets in beforeEach (in-memory IP rate limiter state)
- pickCoachBatch uses Math.random() — assert structural invariants, not ordering
```

---
**Uncommitted Changes:** Yes — brainstorm + plan docs are untracked (intentionally — no code changed this session)
**Tests Passing:** N/A — no tests exist yet
