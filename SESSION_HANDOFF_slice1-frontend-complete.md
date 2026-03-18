# Session Handoff — Slice 1 Frontend Complete

**Date**: 2026-02-22
**Branch**: `feat/phase-0-backend`
**Remote**: `origin/feat/phase-0-backend` (up to date — last push `5c82016`)
**Status**: 🟢 Slice 1 frontend complete and pushed

---

## ✅ Accomplished This Session

### Slice 1 Participant Flow (P0 — March 2 deadline)
- **Created** `src/app/participant/page.tsx` — OTP request page: email input, loading states, all error codes (EMAIL_NOT_FOUND, WINDOW_CLOSED, RATE_LIMITED)
- **Created** `src/app/participant/verify-otp/page.tsx` — 6-digit OTP with 60s resend countdown, MAX_ATTEMPTS lockout, EXPIRED_OTP handling
- **Rewrote** `src/app/participant/select-coach/page.tsx` — removed all 3 filter dropdowns, removed confirmation modal, wired API stubs, added already-selected guard (redirects to confirmation if `selected-coach` in sessionStorage), capacity race + session expiry error handling
- **Created** `src/app/participant/confirmation/page.tsx` — standalone one-way-door page; booking CTA when `bookingUrl` present, "within 2 business days" outreach fallback when absent
- **Deleted** `src/app/participant/engagement/page.tsx` — participants do not return after selection
- **Created** `src/middleware.ts` — redirects `/participant/engagement/*` to `/participant/`
- **Fixed** `src/app/page.tsx` — participant card now routes to `/participant/` (was `/participant/select-coach`), copy updated

### Shared API Client
- **Created** `src/lib/api-client.ts` — typed fetch wrappers for all 5 participant endpoints (`requestOtp`, `verifyOtp`, `fetchCoaches`, `remixCoaches`, `selectCoach`) with stub implementations and clear `// TODO: uncomment` markers
- QA-friendly: `selectCoach` stub alternates booking URL / no-URL by coach ID parity (odd = has URL, even = fallback) — both confirmation paths testable without backend

### Coach Route Migration
- **Converted** `src/app/coach/engagement/page.tsx` → Suspense-wrapped redirect to `/coach/engagements/[id]` (compatibility shim for old bookmarks)
- **Created** `src/app/coach/engagements/page.tsx` — engagement list with Active/Completed tabs, stagger animations
- **Created** `src/app/coach/engagements/[id]/page.tsx` — session logging with topic + outcomes + next steps + engagement level + action-commitment + notes, auto-save *(Slice 2 partial — not API-wired)*
- **Updated** `src/app/coach/dashboard/page.tsx` — all 3 link sites updated to `/coach/engagements/:id`
- **Enabled** My Engagements nav item in `src/lib/nav-config.tsx` (removed `disabled: true`)
- **Fixed** engagement detail page — removed `PreviousSessionPanel` right-sidebar (leftover from earlier design, not in spec; was displaying hardcoded demo data; Session History tab is the correct location for past session context)

### Admin Reporting
- **Wired** Export CSV button in `src/app/admin/dashboard/page.tsx` — exports current filtered/sorted rows (tab/filter/search aware), filename reflects active tab
- **Added** `@media print` block to `src/app/globals.css` — hides sidebar, expands table, suppresses buttons, cleans print output

### Commits Pushed
```
5c82016  fix: remove Previous Session Context sidebar from coach engagement detail
d0000de  feat: implement Slice 1 participant flow + coach route migration + admin reporting
```

---

## 🔄 In Progress / Incomplete

- **`src/app/coach/engagements/[id]/page.tsx`** — UI-complete but Slice 2 partial. Hardcoded demo data (James Rodriguez, eng-1). Not wired to real API. Slice 2 file-level comment marks this clearly.
- **Uncommitted docs** (pre-existing from prior sessions, not from this session's work):
  - `docs/briefings/2026-02-18-status-note-for-tim-implementation-readiness.md`
  - `docs/drafts/2026-02-18-mvp-contract-v1.md`
  - `docs/plans/2026-02-18-fc-project-plan.md`
  - `google-sheets/blockers.csv`, `decisions.csv`, `timeline.csv` (and `.md` mirrors)
  - Several new untracked briefing docs from Feb 20–22

---

## 📋 Next Steps (Priority Order)

1. **Backend: Prisma schema + Supabase migration** (~4 hours)
   - Schema is designed (see `docs/plans/2026-02-12-feat-mvp-backend-vertical-slices-plan.md`)
   - Run `npx prisma migrate dev` against local Postgres + Supabase staging
   - Seed script: 1 org, 4 programs, sample MLP/ALP coaches, 2 test participants

2. **Backend: OTP auth endpoints** (~2 hours) — `POST /api/participant/auth/request-otp` + `POST /api/participant/auth/verify-otp`
   - HMAC 6-digit, 5-min expiry, rate-limited
   - iron-session participant session cookie
   - React Email OTP template via Resend

3. **Backend: Coach selector API** (~3 hours) — `GET /api/participant/coaches` + `POST /api/participant/coaches/remix` + `POST /api/participant/coaches/select`
   - Capacity-weighted randomization with row-level locking for capacity race
   - Returns `bookingUrl` from `CoachProfile.meetingBookingUrl` (may be null)

4. **Commit pre-existing doc changes** — commit the google-sheets and briefing docs that are currently floating uncommitted

5. **Deploy to Vercel staging** (Feb 25 target) — full Slice 1 on staging for Kari beta test Feb 26

6. **Beta test with Kari** (Feb 26, full day) — write a test script covering the participant flow end-to-end

7. **Slice 2 coach portal** (Mar 3–9):
   - `GET /api/coach/engagements/:id` → wire `[id]` page
   - `POST /api/coach/sessions` → wire submit form
   - Auth.js magic-link for coach/admin signin

---

## 🔧 Key Files Modified This Session

| File | Action | Notes |
|------|--------|-------|
| `src/app/page.tsx` | Edit | Participant card → `/participant/` |
| `src/app/participant/page.tsx` | Create | OTP request |
| `src/app/participant/verify-otp/page.tsx` | Create | OTP verify, resend, lockout |
| `src/app/participant/select-coach/page.tsx` | Rewrite | No filters, API stubs, guards |
| `src/app/participant/confirmation/page.tsx` | Create | Booking URL / outreach fallback |
| `src/app/participant/engagement/page.tsx` | Delete | Participants don't return |
| `src/middleware.ts` | Create | Route guard for deleted engagement page |
| `src/lib/api-client.ts` | Create | Typed stubs for all 5 participant endpoints |
| `src/app/coach/engagement/page.tsx` | Rewrite | Compat redirect shim |
| `src/app/coach/engagements/page.tsx` | Create | Engagement list |
| `src/app/coach/engagements/[id]/page.tsx` | Create | Session logging (Slice 2 partial) |
| `src/app/coach/dashboard/page.tsx` | Edit | Links → `/coach/engagements/:id` |
| `src/lib/nav-config.tsx` | Edit | Enable My Engagements nav item |
| `src/app/admin/dashboard/page.tsx` | Edit | Wire Export CSV |
| `src/app/globals.css` | Edit | `@media print` block |

---

## ⚠️ Blockers / Decisions Needed

- **Coach data from Kari** — bios + photos + scheduling links due Feb 23. Critical path for seed database and beta test. If delayed, beta will use demo data.
- **EF/EL capacity per coach** — still pending Andrea confirmation (working default: 20). Needs to be locked before capacity logic ships.
- **Reminder ownership** — confirm if MVP system sends OTP/magic links only (all Day 5/10 reminders manual by Kari/Andrea). Determines Slice 3 scope.
- **Email sender domain** — `coaching@franklincovey.com` pending Blaine/Tim. Needed before Resend goes live.
- **Participant auth state** — currently uses `sessionStorage` (tab-scoped). Production will use iron-session cookies. The two are compatible at the API boundary; no frontend rework needed when backend ships.

---

## 🔑 Key Architecture Notes

**Participant session state (current stub):**
```
sessionStorage['participant-email']    → set after requestOtp
sessionStorage['participant-verified'] → set after verifyOtp success
sessionStorage['selected-coach']       → set after selectCoach success (JSON)
```
Production: these map 1:1 to iron-session cookie fields. No frontend rework needed.

**Booking URL fallback rule (locked):**
- `response.bookingUrl` present → show "Book your first session" button
- `response.bookingUrl` absent → show "Your coach will reach out within 2 business days"
- Implemented in: `src/app/participant/confirmation/page.tsx`

**Coach route migration (complete):**
- `/coach/engagement?id=X` → permanently redirects to `/coach/engagements/X`
- Keep redirect shim in place until old links confirmed retired (post-Slice 2)

**QA stub behavior:**
- `selectCoach` returns `bookingUrl` for odd-indexed coaches (c1, c3...), `undefined` for even (c2, c4...)
- Lets QA test both confirmation paths deterministically

---

## 🚀 Quick Start Next Session

```
We're building the FranklinCovey coaching platform. Branch: feat/phase-0-backend.

Slice 1 frontend is complete and pushed (5c82016). Next priority is the backend.

Start here:
1. Read CLAUDE.md for architecture conventions
2. Read docs/plans/2026-02-12-feat-mvp-backend-vertical-slices-plan.md for the full ERD and API spec
3. Read src/lib/api-client.ts to see the typed interfaces the frontend expects

Immediate task: implement the Prisma schema and run the first migration against the local Postgres instance (docker-compose.yml should spin up Postgres + Mailpit). Then implement the OTP auth endpoints (POST /api/participant/auth/request-otp and POST /api/participant/auth/verify-otp) so we can replace the stubs in src/lib/api-client.ts.

Staging deploy target is Feb 25. Beta test with Kari is Feb 26.
```

---

**Uncommitted Changes:** Yes — docs/briefings and google-sheets files from prior sessions (not this session's src work). Commit separately.
**Build Status:** ✅ Passing — `npm run build` clean, 14 routes, 0 TypeScript errors
**Tests:** None automated yet (pre-backend)
