---
title: Fix Admin Dashboard UI Issues
type: fix
date: 2026-03-04
deepened: 2026-03-04
source: docs/handoffs/20260304-2030-magic-link-smoke-test-and-admin-dashboard-review.md
---

# Fix Admin Dashboard UI Issues

## Enhancement Summary

**Deepened on:** 2026-03-04
**Key corrections applied from review findings:**

1. **HIGH — Import route scope leak addressed**: `/admin/import` is a fully interactive 3-step wizard with a live "Import & Send Invitations" button. Disabling the nav item alone does not block direct URL access. Plan now includes an explicit redirect guard in the page component.
2. **MEDIUM — Dead code cleanup added**: Removing the Engagements nav entry orphans `NavBookIcon`. Plan now includes deleting the function in the same change.
3. **MEDIUM — Deep-link acceptance criteria added**: Explicit checks for direct URL access to `/admin/import` and `/admin/engagements`.
4. **LOW — Brittle line references replaced**: Implementation notes now use symbol/snippet anchors instead of line numbers.

---

## Overview

Three UI issues identified during the admin dashboard smoke test on March 4. All are cosmetic/nav configuration fixes following established patterns. Coach capacity edit feature confirmed functional and in-scope — no changes needed there.

A **fourth issue** was surfaced during review: the `/admin/import` page remains a live, fully interactive page even when the nav item is disabled. This is a Slice 2 scope leak — the import route must be guarded to prevent accidental use before that slice ships.

## Issues

| # | Issue | Severity | Fix Location |
|---|-------|----------|-------------|
| 1 | Import nav not disabled (should show "Soon") | P2 | `src/lib/nav-config.tsx` — `ADMIN_NAV_ITEMS` Import entry |
| 1b | `/admin/import` page is live and interactive (scope leak) | P1 | `src/app/admin/import/page.tsx` — `ImportPage` component |
| 2 | Engagements nav item redundant + dead icon code | P3 | `src/lib/nav-config.tsx` — `ADMIN_NAV_ITEMS` + `NavBookIcon` function |
| 3 | Internal CUID displayed under coach names | P2 | `src/app/admin/coaches/page.tsx` — coach name cell |

## Acceptance Criteria

### Issue 1 + 1b: Disable Import Nav Item AND Guard the Route

**Nav item (Issue 1):**

- [x] Add `disabled: true` to the Import entry in `ADMIN_NAV_ITEMS`
- [x] Verify it renders grayed out with "Soon" pill (handled by `PortalShell` — see `navigation.tsx`, `renderNavItem` function, `disabled` branch)
- [x] Verify clicking the nav item does not navigate

**Current:**
```typescript
{ label: "Import", href: "/admin/import", icon: <NavImportIcon /> },
```

**Target:**
```typescript
{ label: "Import", href: "/admin/import", icon: <NavImportIcon />, disabled: true },
```

**Route guard (Issue 1b — new):**

- [x] Add a server-boundary redirect so direct URL access to `/admin/import` redirects to `/admin/dashboard`
- [x] The redirect must fire before any page content renders (no interactive elements accessible)
- [x] Verify: navigating directly to `/admin/import` in the browser redirects to `/admin/dashboard`
- [x] Verify: the redirect works even if the user is logged in as admin
- [x] Guard is path-specific: applies to `/admin/import` page only and does not affect future `/api/admin/import*` endpoints for Slice 3

**Implementation — redirect approach (preferred for MVP):**

Use middleware redirect for the page path only:

```typescript
if (pathname === "/admin/import") {
  return NextResponse.redirect(new URL("/admin/dashboard", request.url));
}
```

> **Why middleware for this guard?** It prevents rendering the route entirely and avoids client-JS timing/blank-state behavior while preserving existing admin auth enforcement.

### Issue 2: Remove Engagements Nav Item + NavBookIcon Dead Code

- [x] Remove the Engagements entry from `ADMIN_NAV_ITEMS`

**Current:**
```typescript
{ label: "Engagements", href: "/admin/engagements", icon: <NavBookIcon />, badge: 12, disabled: true },
```

**Target:** Delete this line entirely.

- [x] Delete the `NavBookIcon` function from `nav-config.tsx` (it is only used by the Engagements entry — removing it leaves the function as dead code)

**Current — function to delete:**
```typescript
function NavBookIcon() {
  return (
    <svg width="16" height="16" ...>
      <path d="M12 6.253v13m0-13C10.832..." />
    </svg>
  );
}
```

- [x] Verify no other file imports or references `NavBookIcon` after deletion

```bash
# Verify no stale references remain
grep -r "NavBookIcon" src/
# Expected: no output
```

**Deep-link behavior for `/admin/engagements`:**
- No `page.tsx` exists at this route — Next.js App Router returns its default 404 page automatically. No additional action needed.
- [x] Verify: navigating directly to `/admin/engagements` shows a 404 (not a white screen or error crash)

### Issue 3: Remove CUID Under Coach Names

- [x] Remove the `organizationCoachId` subtitle `<p>` tag in the coach name cell of `src/app/admin/coaches/page.tsx`
- [x] Coach email is already in its own column — no replacement content needed

**Current — snippet to locate and remove:**
```tsx
<p className="text-[11px] text-muted-foreground">
  {coach.organizationCoachId}
</p>
```

**Target:** Delete these three lines (the `<p>` tag and its contents). The coach name `<p>` above it stays.

## Implementation Order

1. **`nav-config.tsx`** — one file, two changes:
   - Add `disabled: true` to Import entry
   - Remove Engagements entry + delete `NavBookIcon` function
2. **`admin/import/page.tsx`** — remove client redirect logic; route guard is handled at middleware boundary
3. **`admin/coaches/page.tsx`** — remove `organizationCoachId` subtitle `<p>`

## Post-Review Hardening Phases (2026-03-05)

### Phase A — CSV Injection Hardening
- [x] Update CSV formula detection to guard values with leading whitespace (e.g. `" =HYPERLINK(...)"`)
- [x] Add export route test coverage for leading-whitespace formula payloads
- [x] Run typecheck and confirm no new TypeScript issues beyond the known baseline

### Phase B — `/admin/import` Server-Boundary Redirect
- [x] Move `/admin/import` guard to server boundary (middleware redirect)
- [x] Ensure redirect targets only page path `/admin/import` (must not affect `/api/admin/import*` for Slice 3)
- [x] Remove client-only redirect from `src/app/admin/import/page.tsx`
- [x] Add test coverage for `/admin/import` redirect behavior
- [x] Add coverage/assertion that `/admin/engagements` is not rewritten and remains 404-owned by Next.js
- [x] Run typecheck and confirm no new TypeScript issues beyond the known baseline

### Phase C — Needs-Attention Logic Drift Fix
- [x] Remove JS-only `isNeedsAttention` divergence in engagements route
- [x] Use canonical `buildNeedsAttentionWhere`-based path for `tab=needs_attention` row selection and boolean flags
- [x] Remove dead `X-Needs-Attention-Count` response header query from engagements route
- [x] Add parity test: KPI `needsAttention` count equals engagements `tab=needs_attention` total for same scope/filters
- [x] Add empty-result pagination test for engagements endpoint
- [x] Run typecheck and confirm no new TypeScript issues beyond the known baseline

### Phase D — Final Verification + Documentation
- [x] Run focused tests for export/middleware/admin engagements/admin KPI parity
- [x] Run full `npm test`
- [x] Run `npm run build`
- [x] Record explicit decision: `usePortalUser` keeps silent fallback on 401/network for MVP (cosmetic personalization only)

Decision note: Keep `usePortalUser` silent fallback behavior for MVP. Middleware already enforces/refreshes admin auth, and the hook is treated as cosmetic personalization.

## Acceptance Criteria Checklist (All Issues)

### Sidebar behavior
- [x] Import nav item is grayed out with "Soon" pill
- [x] Clicking Import nav item does not navigate
- [x] Engagements nav item is gone entirely
- [x] All other admin nav items (Dashboard, Coaches) render and function normally

### Deep-link / direct URL behavior
- [x] `GET /admin/import` → redirects to `/admin/dashboard` (no interactive form accessible)
- [x] `GET /admin/engagements` → 404 (Next.js default, no crash)

### Coaches page
- [x] Coach name cells show name only (no CUID subtitle)
- [x] Coach email still visible in Email column (unchanged)

### No regressions
- [x] Dashboard page loads correctly
- [x] Coaches page loads and displays all coaches
- [x] No TypeScript errors (`npm run build` passes)
- [x] `grep -r "NavBookIcon" src/` returns no results

## Out of Scope

- Coach capacity edit feature — confirmed functional, no changes needed
- "On Hold" KPI showing 0 — not a bug (manual ops status, currently unused)
- Resend domain verification, bio markdown fix, Wistia — separate tasks
- Middleware-level route protection — tracked in deferred hardening backlog (#6)

## References

- Handoff: `docs/handoffs/20260304-2030-magic-link-smoke-test-and-admin-dashboard-review.md`
- Nav config: `src/lib/nav-config.tsx` (single source of truth for all sidebar nav)
- Disabled nav pattern: `src/components/navigation.tsx` — `renderNavItem` function, `disabled` branch ("Soon" pill)
- Participant route guard pattern: `src/app/participant/select-coach/page.tsx` — `useEffect` redirect guard
- Deferred hardening: `github.com/ridegoodwaves/franklin-covey/issues/6` (middleware auth)
- Slice 2 scope: `docs/plans/2026-02-12-feat-mvp-backend-vertical-slices-plan.md`
