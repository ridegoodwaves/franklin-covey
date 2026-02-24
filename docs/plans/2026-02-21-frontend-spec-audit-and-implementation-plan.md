# FC Frontend: Spec Audit & Implementation Plan

**Branch:** `feat/phase-0-backend`
**Live URL:** https://franklin-covey-git-feat-phase-0-backend-ridegoodwaves-projects.vercel.app/
**Hard Deadline:** Slice 1 live March 2 | Slice 2 March 9 | Slice 3 March 16

---

## Context

With MVP scope locked (2026-02-17/18), the current frontend codebase needs to be reconciled against the final spec. Several screens exist in wrong form, some are missing entirely, and there are significant participant flow violations that will break the actual user journey if shipped as-is. This plan audits every screen, identifies what to keep vs. fix vs. add, and prioritizes work by the March 2 hard deadline.

---

## Critical Violations (Fix First)

### 1. Participant Flow Is Structurally Wrong

**Current flow:**
```
/ (landing participant card) → /participant/select-coach (with filters) → Confirmation Modal → /participant/engagement (session timeline)
```

**Required flow:**
```
/participant/ (email + OTP request) → /participant/verify-otp → /participant/select-coach (NO filters) → /participant/confirmation (booking link or coach-outreach message) → DONE
```

**What's wrong:**
- No OTP auth entry point exists
- Landing page participant entry bypasses auth and links directly to `/participant/select-coach`
- Participant coach selector has 3 filter dropdowns (Location, Focus Areas, Credentials) — **spec explicitly prohibits filters**
- Confirmation is a modal, not a standalone page
- `/participant/engagement` (session timeline dashboard) exists and is linked to — **participants do NOT return to the platform after selection**

### 2. Launch Sequencing Is Risky for March 2
- Current order back-loads API integration to Day 4-5
- Frontend currently has no `src/app/api/` wiring in this repo snapshot
- Must switch to vertical-slice sequencing (UI + API + edge cases together) for participant flow to protect beta date and March 2 go-live

### 3. Coach Route Migration Is Underspecified
- Current coach dashboard links to `/coach/engagement?id=...`
- Planned destination is `/coach/engagements/[id]`
- Without explicit migration + temporary redirect, links and bookmarks will break during Slice 2 transition

---

## What to Keep (No Changes Needed)

| Item | Notes |
|------|-------|
| Design system (colors, typography, tokens) | Brand-compliant, fully correct |
| `PortalShell` component | Solid reusable layout, keep as-is |
| Coach card layout | Photo, name, credentials, bio, location, video link — all correct |
| Remix button logic (1 use, zero overlap) | Logic is correct, just remove filter dependency |
| Confirmation modal content | Reuse the coach detail content for the standalone confirmation page |
| Coach dashboard layout | Sections are in right order (Needs Attention → Upcoming → Engagements) |
| Admin dashboard KPI cards + sparklines | Good; default tab already set to Needs Attention |
| Admin coaches page | Keep as-is |
| `src/lib/config.ts` domain constants | SESSION_TOPICS, OUTCOMES, NUDGE_THRESHOLDS all correct |
| `src/lib/utils.ts` helpers | All correct |
| `src/lib/nav-config.tsx` structure | Keep structure; edit only to enable routes and remove deprecated links |
| Status color system | Correct |
| Stagger animations on coach cards | Keep — `transition-delay: 150ms + index * 120ms` |

---

## What to Fix

### Participant Portal

#### Fix 1: Correct participant entrypoint from landing page
- Update participant portal card link on `/` from `/participant/select-coach` to `/participant/`
- Update participant card copy to reflect one-visit flow (select + book), not return tracking
- **File:** `src/app/page.tsx`

#### Fix 2: Remove filters from `/participant/select-coach`
- Delete Location, Focus Areas, Credentials dropdowns
- Delete active filter badges + "Clear all" link
- Delete filter state and filter logic
- Keep: coach count display, remix button, card grid, stagger animations
- **File:** `src/app/participant/select-coach/page.tsx`

#### Fix 3: Convert confirmation modal → standalone confirmation page
- Create `src/app/participant/confirmation/page.tsx`
- Content: coach photo/avatar, name, credentials, location, bio
- **Primary CTA:** "Book Your Session" → links to coach's Calendly/Acuity URL (opens new tab)
- **Fallback behavior:** if selected coach has no booking URL, hide booking CTA and show: "Your coach will reach out within 2 business days to schedule your first session"
- Surface no-link selections in coach/admin "Needs Attention" for outreach follow-up
- Remove the in-page confirmation modal from select-coach page
- On "Confirm Selection" in select-coach → navigate to `/participant/confirmation` (not modal)
- No "Go Back" from confirmation — one-way door
- **Files:** new `src/app/participant/confirmation/page.tsx`, edit `select-coach/page.tsx`

#### Fix 4: Delete `/participant/engagement`
- This page should not exist in the participant portal
- Remove `src/app/participant/engagement/page.tsx`
- Remove any links/redirects pointing to it

#### Fix 5: Add participant flow guards (one-way + state-aware routing)
- Prevent access to `/participant/select-coach` and `/participant/confirmation` without valid participant session
- If participant already selected a coach, bypass selector and route to resolved end state
- Block direct URL access/back-button re-entry into invalid states
- **Files:** participant route pages + middleware/route guards as implemented

### Admin Portal

#### Fix 6: Print CSS for PDF export
- Add print stylesheet to admin dashboard: hide sidebar (`PortalShell` nav), expand table, suppress buttons (Export CSV, Print PDF), remove shadows
- Add `@media print` block to `globals.css` or inline in dashboard page
- **Files:** `src/app/globals.css` or `src/app/admin/dashboard/page.tsx`

#### Fix 7: Wire Export CSV button on admin dashboard
- Export visible engagement rows to CSV with stable headers
- Keep behavior consistent with active tab/filter/search state
- **File:** `src/app/admin/dashboard/page.tsx`

### Coach Portal

#### Fix 8: Define coach engagement route migration checklist
- Update links from `/coach/engagement?id=<id>` to `/coach/engagements/<id>`
- Add temporary compatibility redirect route for old URL format during transition
- Update nav + deep links + post-submit navigation targets together
- **Files:** coach dashboard, coach engagement detail/list pages, nav config, optional redirect route

---

## What to Add

### Slice 1 (Must ship March 2)

#### Add 1: OTP request page — `/participant/`
- **File:** `src/app/participant/page.tsx`
- Email input with FC brand styling
- "Continue" CTA → calls `POST /api/participant/auth/request-otp`
- Loading state during API call
- Error state: "Email not found — check your invitation letter"
- Success state: redirect to `/participant/verify-otp`

#### Add 2: OTP verification page — `/participant/verify-otp`
- **File:** `src/app/participant/verify-otp/page.tsx`
- 6-digit OTP input (split input fields or single field)
- "Verify" CTA → calls `POST /api/participant/auth/verify-otp`
- Resend OTP link (cooldown 60s)
- Error state: "Incorrect code — try again" / "Code expired — request a new one"
- Success: redirect to `/participant/select-coach`
- Store participant session token in secure cookie/session (not localStorage for auth state)

#### Add 3: Participant coach selection API integration (do early, not Day 4-5)
- Wire selector to `GET /api/participant/coaches` on page load
- Wire remix action to `POST /api/participant/coaches/remix`
- Wire final selection to `POST /api/participant/coaches/select`
- Keep one-way flow behavior and prevent duplicate submissions

#### Add 4: Participant route guards + middleware checks
- Guard `/participant/select-coach` and `/participant/confirmation` behind valid participant session
- Route already-selected participants to resolved end state (no re-selection)
- Reject invalid deep links/direct URL access with clear fallback UI

#### Add 5: Participant confirmation page data contract
- Use selected coach from server/session payload (not transient in-memory UI state only)
- Render booking CTA only when booking URL exists
- Otherwise render outreach fallback copy and no booking CTA
- Include "coach should contact within 2 business days" participant expectation text

### Slice 2 (Must ship March 9)

#### Add 6: Coach portal magic-link auth — `/auth/signin`
- **File:** `src/app/auth/signin/page.tsx`
- Email input → "Send Sign-In Link" CTA
- Success state: "Check your email for a sign-in link"
- Handles both coach and admin roles (same page, role detected from DB lookup)
- Magic link lands at `/auth/callback?token=...` → validates token → redirects to role's dashboard

#### Add 7: Coach My Engagements list — `/coach/engagements`
- **File:** `src/app/coach/engagements/page.tsx`
- Grid/list of assigned participant engagements
- Each row: participant name, program, status badge, session progress, last activity
- Click → `/coach/engagements/[id]` session detail/logging

#### Add 8: Coach session logging — `/coach/engagements/[id]`
- **File:** `src/app/coach/engagements/[id]/page.tsx`
- Enable "My Engagements" nav item (remove disabled state)
- Session log form per session slot:
  - **Topic** dropdown (program-specific from `SESSION_TOPICS_BY_PROGRAM` in config.ts)
    - If "Other" selected → show static text "Please email the coaching practice" (no free-text input)
  - **Outcome** dropdown (from `SESSION_OUTCOMES` in config.ts)
  - **Duration** dropdown (from `DURATION_OPTIONS`: 15, 30, 45, 60, 90 min)
  - **Private Notes** (free-text textarea, auto-save on blur)
  - **Status** selector: Completed / Forfeited (canceled <24h) / Forfeited (not used)
- Auto-save indicator ("Saving..." / "Saved")
- POST → `POST /api/coach/sessions`

#### Add 9: Legacy coach URL compatibility redirect
- Add transitional support for `/coach/engagement?id=<id>` to redirect to `/coach/engagements/<id>`
- Keep redirect until old links/bookmarks are confirmed retired

### Slice 3 (Must ship March 16)

#### Add 10: Admin import page — `/admin/import`
- File `src/app/admin/import/page.tsx` (UI exists; wire to real APIs)
- CSV upload dropzone
- Validation preview table (shows parsed rows with error highlighting)
- "Execute Import" CTA → `POST /api/admin/import/execute`
- Import result summary (X added, Y skipped, Z errors)

#### Add 11: Admin engagements page — `/admin/engagements`
- Enable nav item (currently disabled)
- Full engagement list with advanced filter + sort
- "Needs Attention" default filter
- Export CSV + Print PDF

---

## Edge Cases Not Yet Addressed

| Edge Case | Required Behavior | Where |
|-----------|-------------------|-------|
| Coach has no booking URL | Show fallback message (no booking CTA): "Your coach will reach out within 2 business days..." and flag for outreach follow-up | Confirmation page + Needs Attention |
| Coach outreach SLA missed for no-link selection | Surface in "Needs Attention" for ops escalation follow-up | Coach/Admin dashboards |
| Participant already selected a coach | Detect via session/DB, show "You've already chosen your coach" page, no re-selection | `/participant/verify-otp` or middleware |
| Participant link used after window closes | Show "Selection window has closed" message | `/participant/` entry |
| All coaches in pool at capacity | Show "All coaches are currently full — your program administrator will assign you a coach" | `/participant/select-coach` |
| "Other" session topic selected | Show static text, disable outcome dropdown or show relevant message | Session logging form |
| OTP expired (>10 min) | "Your code has expired — request a new one" + resend link | `/participant/verify-otp` |
| OTP brute-force / max attempts exceeded | Lock verification attempts and require fresh OTP request after threshold | `/participant/verify-otp` |
| OTP resend behavior | New OTP invalidates previous OTP; countdown enforced before resend | `/participant/verify-otp` |
| Participant session expires mid-flow | Redirect to `/participant/` with "session expired" message; preserve safe restart path | Select/confirm pages |
| Idempotent coach selection | Repeated submit/double click creates one final selection only | Coach selection submit |
| Capacity race at selection submit | If coach fills between render and submit, reject gracefully and return user to selector with message | `POST /api/participant/coaches/select` + selector UI |
| Direct URL/back-button to invalid step | Enforce one-way guards and redirect to valid step based on server state | Participant routes |
| Magic link expired (coach/admin) | "This link has expired — request a new one" with re-send option | `/auth/callback` |
| Coach pool enforcement | MLP/ALP participants must only see MLP/ALP coaches; EF/EL only see EF/EL — enforce at API level, but front-end should handle empty state gracefully | Coach selector |
| Capacity counting in display | Badge shows real-time remaining slots (cap 15 minus active engagements with COACH_SELECTED, IN_PROGRESS, ON_HOLD statuses) | Coach cards |
| Day 15 auto-assign | Admin dashboard surfaces unassigned participants past Day 15 in "Needs Attention" | Admin dashboard |

---

## Implementation Order (Re-baselined for March 2)

### Must Have by March 2 (P0)
1. `/` participant entry routes to `/participant/`
2. OTP request + verify pages live and wired to API
3. Selector is auth-gated, filterless, and wired to coaches/remix/select APIs
4. Standalone confirmation page live with booking CTA when available and outreach fallback when no link
5. `/participant/engagement` removed and blocked
6. One-way route guards enforced (no invalid deep links/back navigation loops)
7. Core participant edge cases covered (already selected, window closed, at capacity, OTP expiry/lockout, session expiry, idempotent select, capacity race)
8. End-to-end participant flow test pass before beta/go-live

### Can Slip to March 9 If Capacity Is Tight (P1)
1. Admin print CSS refinements (minimum acceptable print output still required)
2. Admin dashboard Export CSV polish (basic export can ship first)
3. Coach route migration cleanup after compatibility redirect is in place

### Slice 1 Week Plan (Vertical Slices, Feb 21–Mar 2)

**Day 1-2:**
1. Implement `/participant/` + `/participant/verify-otp` with real API calls
2. Add OTP attempt, resend, and expiry handling
3. Fix landing participant entrypoint (`/` → `/participant/`)

**Day 3:**
4. Remove selector filters and wire `GET /api/participant/coaches`
5. Wire remix endpoint and enforce one-remix behavior with non-overlap
6. Remove `/participant/engagement` page and redirects

**Day 4:**
7. Build `/participant/confirmation` and wire final select endpoint
8. Implement route guards + already-selected handling
9. Handle idempotent submit and capacity race errors

**Day 5+:**
10. Execute full participant E2E pass and harden copy/error states
11. Regression-check admin default tab (already fixed), print, and CSV export

### Slice 2 (Mar 3–9)
- Auth sign-in page + magic link callback
- Coach engagements list
- Coach session logging form with all dropdowns + auto-save
- Coach route migration + temporary redirect from legacy route

### Slice 3 (Mar 10–16)
- Admin import API wiring (existing UI to production behavior)
- Admin engagements page (enable nav)
- Print CSS/CSV export refinements for ops reporting

---

## Critical Files

| File | Action |
|------|--------|
| `src/app/page.tsx` | EDIT — route participant entry to `/participant/` |
| `src/app/participant/page.tsx` | CREATE — OTP request |
| `src/app/participant/verify-otp/page.tsx` | CREATE — OTP entry |
| `src/app/participant/confirmation/page.tsx` | CREATE — final confirmation + booking link |
| `src/app/participant/select-coach/page.tsx` | EDIT — remove filters, fix navigation |
| `src/app/participant/engagement/page.tsx` | DELETE |
| `src/middleware.ts` (or equivalent guard layer) | CREATE/EDIT — participant route guards |
| `src/app/auth/signin/page.tsx` | CREATE — magic link auth |
| `src/app/auth/callback/page.tsx` | CREATE — token validation + redirect |
| `src/app/coach/engagements/page.tsx` | CREATE — engagement list |
| `src/app/coach/engagements/[id]/page.tsx` | CREATE — session logging |
| `src/app/coach/engagement/page.tsx` | EDIT — temporary compatibility redirect or deprecation handling |
| `src/app/admin/dashboard/page.tsx` | EDIT — print CSS + CSV export wiring; verify default tab remains Needs Attention |
| `src/app/admin/import/page.tsx` | EDIT — wire existing UI to real import APIs |
| `src/app/admin/engagements/page.tsx` | EDIT — enable nav item |
| `src/app/globals.css` | EDIT — add print CSS |
| `src/lib/nav-config.tsx` | EDIT — enable coach engagements nav |

---

## Verification

**Participant flow end-to-end:**
1. Hit `/` and choose Participant → lands on `/participant/` (not selector)
2. Enter email → receive OTP
3. Enter OTP → land on coach selector (3 coaches shown, no filters)
4. Click "See Different Coaches" → 3 entirely new coaches, no overlap
5. Select coach once (double-click safe) → navigate to `/participant/confirmation`
6. Confirmation shows coach info + booking CTA when URL exists, otherwise coach-outreach fallback message
7. When booking CTA exists, clicking opens Calendly/Acuity in new tab
8. No way to go back and re-select — one-way door
9. Direct URL to selector/confirmation without valid state is redirected safely

**Coach flow:**
1. Magic link → `/auth/signin` → email → link sent
2. Click link → `/auth/callback` → dashboard
3. See assigned participants in "Needs Attention" and "Upcoming Sessions"
4. Navigate to engagement via `/coach/engagements/[id]` → see session slots → log session with topic/outcome/duration/notes
5. "Other" topic → see static message, no free-text
6. Legacy URL `/coach/engagement?id=...` redirects to new route during migration window

**Admin flow:**
1. Magic link login → `/admin/dashboard` → default shows "Needs Attention" tab
2. Print button → `@media print` hides sidebar, expands table
3. Export CSV works with active filter/search/tab state
4. Import → upload CSV → validate → execute → summary shown

**Brand compliance check:**
- No filters on participant coach selector
- Confirmation is standalone page (not modal)
- Participant engagement/dashboard page doesn't exist
- All buttons pill-shaped (`rounded-full`)
- No exclamation points in copy
- Title Case headlines, sentence case CTAs
