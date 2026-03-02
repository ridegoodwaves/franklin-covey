# Pre-Deploy Smoke Test Checklist

**When to run:** Before every staging-to-production promotion. Run via Chrome MCP (`mcp__claude-in-chrome__*`).

**How to run:** Ask Claude: _"Run the pre-deploy smoke test checklist against [URL]"_

**Prerequisites:**
- Target environment is deployed and accessible
- At least one test participant exists with `status = INVITED` and an open cohort window
- At least one coach/admin user exists with a known email for magic-link testing

## Per-Slice Execution (Locked 2026-02-28)

- **Slice 1 (March 2)**: run Scenarios 1–6 and 9
- **Slice 2 (March 9, admin visibility/reporting)**: run Scenarios 1–6, 8, and 9
- **Slice 3 (March 16, coach portal + import execution)**: run full checklist (Scenarios 1–9)

---

## Scenario 1: Participant Email Verification

**Route:** `/participant`
**Priority:** P0 (blocks all participant usage)

- [ ] Navigate to `/participant`
- [ ] Page loads without errors — FranklinCovey branding visible
- [ ] Enter a valid participant email from the roster
- [ ] Submit — redirects to `/participant/select-coach`
- [ ] Enter an unknown email — displays "unrecognized email" error inline (no redirect)

**What it validates:** Email verify API, session cookie creation, roster lookup, error handling

---

## Scenario 2: Coach Selection Cards Load

**Route:** `/participant/select-coach`
**Priority:** P0 (core feature)

- [ ] Page loads with exactly 3 coach cards
- [ ] Each card shows: photo (or placeholder), name, title/credentials, location, bio preview
- [ ] Cards have staggered fade-in animation
- [ ] Program label (e.g., "USPS Leadership Coaching Program") appears above headline
- [ ] "See Different Coaches" button is visible and enabled

**What it validates:** Coaches GET API, photo signed URLs, session pin-first logic, UI rendering

---

## Scenario 3: Remix (See Different Coaches)

**Route:** `/participant/select-coach`
**Priority:** P0 (one-way door)

- [ ] Click "See Different Coaches" — confirmation dialog appears warning this is one-time
- [ ] Confirm — 3 new coach cards load (different from original set)
- [ ] "See Different Coaches" button is now disabled/hidden
- [ ] Refresh the page — remix button remains disabled (server-backed state)

**What it validates:** Remix API, one-way door enforcement, remixUsed persistence across refresh

---

## Scenario 4: Coach Selection and Confirmation

**Route:** `/participant/select-coach` → `/participant/confirmation`
**Priority:** P0 (core feature)

- [ ] Click "Select" on a coach card — confirmation modal appears with coach name
- [ ] Confirm selection — redirects to `/participant/confirmation`
- [ ] Confirmation page shows: selected coach card (photo, name, credentials)
- [ ] "Book your first session" button is present
- [ ] Clicking the booking button opens the coach's scheduling link in a new tab (or shows fallback message if no booking URL)

**What it validates:** Select API (advisory lock, capacity check, status update), confirmation page rendering, booking URL

---

## Scenario 5: Returning Participant Redirect

**Route:** `/participant`
**Priority:** P1 (edge case)

- [ ] After completing selection (Scenario 4), navigate back to `/participant`
- [ ] Enter the same email — redirects to `/participant/confirmation?already=true`
- [ ] Confirmation page loads correctly (not an error)

**What it validates:** Already-selected detection, redirect logic, session continuity

---

## Scenario 6: Capacity Enforcement

**Route:** `/participant/select-coach`
**Priority:** P1 (correctness)

- [ ] Verify that coaches at max capacity (20 active engagements: COACH_SELECTED + IN_PROGRESS + ON_HOLD) do NOT appear in the 3-card batch
- [ ] If all coaches in the pool are at capacity, the page shows an "all coaches at capacity" message instead of cards

**How to verify:** Query the DB for coach engagement counts, compare against coaches shown.

**What it validates:** Capacity counting rule, pool filtering, edge case UX

---

## Scenario 7: Coach Portal — Magic Link Sign-In

**Route:** `/auth/signin` → `/coach/dashboard`
**Priority:** P0 for Slice 3 (March 16)

- [ ] Navigate to `/auth/signin`
- [ ] Enter a known coach email — "Check your email" confirmation shown
- [ ] Check email — magic link received (from Resend)
- [ ] Click magic link — redirects to `/coach/dashboard`
- [ ] Dashboard loads with coach's data (name, engagement count)
- [ ] Clicking the same magic link again — rejected (one-time consume), redirects to `/auth/signin?error=expired`

**What it validates:** Magic-link request API, email delivery (Resend), magic-link consume API, one-time enforcement, session cookie, coach dashboard data

---

## Scenario 8: Admin Portal — Magic Link Sign-In

**Route:** `/auth/signin` → `/admin/dashboard`
**Priority:** P0 for Slice 2 (March 9)

- [ ] Enter a known admin email on `/auth/signin`
- [ ] Click magic link from email — redirects to `/admin/dashboard`
- [ ] Dashboard loads with participant/engagement summary data
- [ ] Admin sidebar navigation is visible and functional

**What it validates:** Admin role routing (separate from coach), admin dashboard data, sidebar nav

---

## Scenario 9: Selection Window Enforcement

**Route:** `/participant`
**Priority:** P1 (time-gated access)

- [ ] Enter a participant email whose cohort selection window has closed
- [ ] System returns `WINDOW_CLOSED` and clears session (no coach selector access)

**How to verify:** Requires a cohort with `coachSelectionEnd` in the past.

**What it validates:** Window enforcement, graceful error UX

---

## Results Template

| # | Scenario | Status | Notes |
|---|----------|--------|-------|
| 1 | Participant email verify | | |
| 2 | Coach cards load | | |
| 3 | Remix one-way door | | |
| 4 | Selection + confirmation | | |
| 5 | Returning participant redirect | | |
| 6 | Capacity enforcement | | |
| 7 | Coach magic link sign-in | | |
| 8 | Admin magic link sign-in | | |
| 9 | Selection window enforcement | | |

**Run by:** _______________
**Date:** _______________
**Target URL:** _______________
**Result:** PASS / FAIL (note failures above)

---

## References

- Brainstorm: `docs/brainstorms/2026-02-27-testing-strategy-brainstorm.md`
- Participant flow research: `docs/research/participant-workflow-research.md`
- Phase 1 unit/API tests: `docs/plans/2026-02-27-feat-testing-infrastructure-phase1-plan.md`
- Production launch plan: `docs/plans/2026-02-27-chore-production-launch-and-smoke-test-plan.md`
