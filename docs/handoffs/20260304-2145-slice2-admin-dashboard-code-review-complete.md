# Session Handoff - Slice 2 Admin Dashboard Code Review

**Date**: 2026-03-04
**Branch**: main (uncommitted changes on working tree)
**Status**: 🟡 In Progress — Review complete, fixes identified, 3 quick fixes already applied

---

## Accomplished This Session

- **Full code review of Slice 2 (Admin Dashboard)** — 3 parallel review agents (reuse, quality, efficiency) analyzed all admin frontend pages, API routes, shared libs, and test files
- **Identified 19 findings** across Critical/High/Medium/Low severity, prioritized with user into must-fix vs next-pass vs cleanup tiers
- **User applied 3 quick fixes** during session:
  1. Engagements route refactored: DB-level `orderBy` + `skip`/`take` replaces full-table JS sort/paginate; `isNeedsAttention()` duplication eliminated via `buildNeedsAttentionWhere` reuse on page IDs; dead `X-Needs-Attention-Count` header removed
  2. CSV `sanitizeCsvField` regex updated: `FORMULA_PREFIX` changed from `/^[=+\-@\t\r]/` to `/^\s*[=+\-@\t\r]/` to catch leading-whitespace formula injection bypass
  3. `/admin/import` page converted from client-side `useEffect` redirect to server-side `redirect()` + middleware-level guard

## In Progress

- **4 must-fix items remain** before Slice 2 is "done":
  1. Replace raw modal in `src/app/admin/coaches/page.tsx:411-473` with shadcn `Dialog` (focus trap, Escape, ARIA, backdrop close)
  2. Add parity test: KPI `needsAttention` count === engagement `tab=needs_attention` row count
  3. Test coverage for `/admin/import` redirect behavior
  4. Document `usePortalUser` silent-fallback as explicit product decision

## Next Steps (Priority Order)

1. **Replace coaches edit modal with shadcn Dialog** (~1-2 hours)
   - File: `src/app/admin/coaches/page.tsx:411-473`
   - Add focus trap, Escape key, `aria-modal`, `aria-labelledby`, backdrop click-to-close
   - shadcn `Dialog` is already in the project's component library

2. **Add needs-attention parity test** (~1 hour)
   - Create test that verifies KPI `needsAttention` count matches engagement `tab=needs_attention` row count
   - This is the regression test for the dual-implementation drift risk
   - Location: `src/app/api/admin/engagements/route.test.ts` or new integration test

3. **Extract shared admin filters** (~1 hour) — next-pass priority
   - `parseProgramFilter`, `parseStatus`, `parseTab` duplicated across `engagements/route.ts`, `kpis/route.ts`, `export/route.ts`
   - Extract to `src/lib/server/admin-filters.ts`

4. **Consolidate type contracts** (~30 min) — next-pass priority
   - Export `CoachesResponseApi` from `src/lib/types/dashboard.ts` (duplicated in 2 pages)
   - Replace `STATUS_OPTIONS` string literals with `Object.values(EngagementStatus)`
   - Clean up `*Api` manual Date→string types

5. **Dashboard coach-fetch error/abort consistency** (~30 min) — next-pass
   - `dashboard/page.tsx:176-200` uses `active` flag but no `AbortController` (inconsistent with main data fetch at L202)
   - Silent error swallowing in coach fetch catch block

## Key Files Modified (This Session — User Applied)

- `src/app/api/admin/engagements/route.ts` — DB-level sort/paginate, needsAttention via buildNeedsAttentionWhere, dead query removed
- `src/app/api/admin/engagements/route.test.ts` — Updated for count+findMany pattern, added empty-state test
- `src/app/api/export/route.ts` — CSV formula injection whitespace bypass fix
- `src/app/admin/import/page.tsx` — Server-side redirect (was client useEffect)
- `src/middleware.ts` — Added `/admin/import` redirect guard

## Key Files (Review Context — Not Modified)

- `src/app/admin/dashboard/page.tsx` — 633-line client component, KPI cards + engagement table
- `src/app/admin/coaches/page.tsx` — 476-line client component, raw modal needs Dialog replacement
- `src/app/api/admin/dashboard/kpis/route.ts` — KPI endpoint with groupBy
- `src/app/api/admin/coaches/route.ts` — Coach list with utilization
- `src/app/api/admin/coaches/[id]/route.ts` — PATCH with optimistic lock
- `src/lib/needs-attention.ts` — Canonical needs-attention query builder
- `src/lib/types/dashboard.ts` — Shared type contracts
- `src/lib/server/admin-scope.ts` — USPS MVP scope resolver

## Review Findings Summary

| Priority | Category | Count | Status |
|----------|----------|-------|--------|
| Must-fix | Critical/High | 7 | 3 applied, 4 remaining |
| Next-pass | Medium | 6 | Not started |
| Cleanup | Low | 6 | Not started |

Full review findings are in this conversation. Key architectural concerns:
- `resolveAdminOrgScope` queries DB every request (Low risk, optimize later)
- `usePortalUser` fetches `/api/portal/session` on every page mount (duplicate requests across admin pages)
- No integration test for needs-attention logic parity between KPI and engagement table

## Blockers / Decisions Needed

- **Product decision needed**: `usePortalUser` failure mode — should 401/network error show "Admin User" fallback (current) or redirect to signin? Current behavior is pragmatically fine since middleware already enforces auth, but should be documented as intentional.
- **No blockers** on remaining must-fix items — all are straightforward implementation work.

## Quick Start Next Session

```
Resume Slice 2 admin dashboard must-fix items. Read docs/handoffs/20260304-2145-slice2-admin-dashboard-code-review-complete.md for full context.

Priority 1: Replace the raw modal in src/app/admin/coaches/page.tsx (lines 411-473) with shadcn Dialog component. Add focus trap, Escape key dismissal, aria-modal, aria-labelledby, and backdrop click-to-close.

Priority 2: Add a parity test in src/app/api/admin/engagements/route.test.ts verifying that KPI needsAttention count matches engagement tab=needs_attention row count.

Priority 3: Extract shared filter parsers (parseProgramFilter, parseStatus, parseTab) from engagements/route.ts and export/route.ts into src/lib/server/admin-filters.ts.
```

---
**Uncommitted Changes:** Yes — significant (see git status above). Changes include the 3 quick fixes applied during this session plus pre-existing uncommitted work.
**Tests Passing:** Unknown — not run this session (review-only focus)
