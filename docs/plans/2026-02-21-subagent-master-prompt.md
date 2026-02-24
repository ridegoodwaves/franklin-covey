# Frontend Parallel Execution Prompt (Master Agent)

You are the Master Agent orchestrating parallel sub-agents in `/Users/amitbhatia/.cursor/franklin-covey`.

## Goal
Execute the frontend reconciliation plan in `docs/plans/2026-02-21-frontend-spec-audit-and-implementation-plan.md` for Slice 1 (March 2 hard deadline) while minimizing merge conflicts.

## Required Context
Read these first:
1. `docs/plans/2026-02-21-frontend-spec-audit-and-implementation-plan.md`
2. `docs/plans/2026-02-18-fc-project-plan.md`
3. `docs/drafts/2026-02-18-mvp-contract-v1.md`

## Global Constraints
1. Do not expand scope beyond these docs.
2. Booking-link policy for MVP: booking links are preferred, but coaches without active links may still be selected. In that case, confirmation must show: "Your coach will reach out within 2 business days" (no booking CTA) and the engagement should be visible in Needs Attention for follow-up.
3. No destructive git commands.
4. Each sub-agent edits only assigned files.
5. If blocked by missing APIs, implement typed fetch wrappers/stubs with clear TODO markers; do not fake production persistence logic.
6. Preserve existing design system and brand style.

## Parallel Sub-Agents

### Sub-agent A: Participant Flow (P0)
Assigned files:
- `src/app/page.tsx`
- `src/app/participant/page.tsx`
- `src/app/participant/verify-otp/page.tsx`
- `src/app/participant/select-coach/page.tsx`
- `src/app/participant/confirmation/page.tsx`
- `src/app/participant/engagement/page.tsx` (delete)
- `src/middleware.ts` (or equivalent guard layer)

Deliver:
- OTP request/verify flow
- Filterless coach selector
- Standalone confirmation page
- One-way routing guards and invalid deep-link handling
- Idempotent selection UX
- Capacity-race and auth/session-expiry error handling
- Confirmation behavior split:
  - booking URL exists => show booking CTA
  - booking URL missing => show outreach fallback message

### Sub-agent B: Admin Reporting
Assigned files:
- `src/app/admin/dashboard/page.tsx`
- `src/app/globals.css`

Deliver:
- Print CSS behavior for clean PDF output
- CSV export wired to currently visible rows (active tab/filter/search aware)

### Sub-agent C: Coach Route Migration
Assigned files:
- `src/app/coach/dashboard/page.tsx`
- `src/app/coach/engagement/page.tsx`
- `src/app/coach/engagements/page.tsx`
- `src/app/coach/engagements/[id]/page.tsx`
- `src/lib/nav-config.tsx`

Deliver:
- Migrate navigation to `/coach/engagements/[id]`
- Keep compatibility redirect from legacy `/coach/engagement?id=...`
- Enable nav routes per plan

### Sub-agent D: API Contract Integration Support
Assigned files:
- Shared client fetch utilities and page-level API wiring as needed

Deliver:
- Consistent request/response/error handling for:
  - `POST /api/participant/auth/request-otp`
  - `POST /api/participant/auth/verify-otp`
  - `GET /api/participant/coaches`
  - `POST /api/participant/coaches/remix`
  - `POST /api/participant/coaches/select`
- Consistent handling of no-booking-link response states for confirmation rendering

## Merge and Integration Order
1. Sub-agent D first (shared contract helpers)
2. Sub-agent A
3. Sub-agent C
4. Sub-agent B
5. Final integration + regression pass

## Required Reporting Format From Each Sub-Agent
1. Files changed
2. Behavior changed
3. TODO/blockers
4. Validation performed
