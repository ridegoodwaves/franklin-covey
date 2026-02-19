# FranklinCovey Coaching Platform - MVP Contract v1 (Draft)

**Date:** 2026-02-18  
**Audience:** Kari Sadler + FC Ops + Build Team  
**Purpose:** Freeze MVP behavior and API/data contracts so frontend and backend can build in parallel with minimal rework.

---

## 1) Locked MVP Scope (v1)

- **Infrastructure:** Vercel + Supabase.
- **Coach pools:** Separate pools only:
  - MLP/ALP: 15 coaches total
  - EF/EL: 16 coaches total
  - No cross-pool matching in MVP
- **Participant flow model:** One visit, one coach decision, then done (no participant dashboard).
- **Coach/admin access model:** shared `/auth/signin` entry; request a fresh magic link when session expires (do not reuse old email links).
- **Nudge anchor:** Day 0 = cohort start date.
- **Session outcomes are coach-entered only:** no automatic Session 1 lock/expiry in MVP.
- **Environment isolation:** separate staging and production projects for Vercel and Supabase (no shared secrets/keys/DB URLs).
- **Staging data policy:** sanitized-only data in staging; no raw production participant/coach PII imports.
- **Staging email safety:** `EMAIL_MODE=sandbox` + hard allowlist; block non-allowlisted recipients.
- **Forfeiture labels:**
  - Session forfeited - canceled within 24 hours
  - Session forfeited - not taken advantage of

---

## 2) Frozen User Flows (MVP)

### Participant Flow (Slice 1)
1. Participant enters email -> receives OTP.  
2. Participant verifies OTP -> sees 3 coach cards.  
3. Participant can remix once.  
4. Participant selects coach -> confirmation page with Calendly link.  
5. Flow ends. No return dashboard in MVP.

### Coach Flow (Slice 2)
1. Coach signs in via magic link.  
2. Coach views assigned participants/engagements.  
3. Coach logs session status + notes (topic/outcome/private notes).  
4. Ops monitors progress in admin dashboard.
5. Returning coach uses `/auth/signin` to request a new magic link after idle timeout.

### Admin Flow (Slice 3)
1. Ops uploads participant CSV (validate first, then execute import).  
2. Dashboard tracks enrollment, progress, forfeiture, needs-attention.  
3. Nudge cron sends Day 5/10 reminders and Day 15 auto-assign (from cohort start date).  
4. Admin exports CSV / print-friendly reports.
5. Returning admin uses `/auth/signin` to request a new magic link after idle timeout.

---

## 3) API Contract Freeze (v1)

These endpoints and payload shapes are the implementation baseline:

- `POST /api/participant/auth/request-otp`
- `POST /api/participant/auth/verify-otp`
- `GET /api/participant/coaches`
- `POST /api/participant/coaches/remix`
- `POST /api/participant/coaches/select`
- `POST /api/coach/sessions`
- `GET /api/coach/dashboard`
- `GET /api/coach/engagements`
- `GET /api/admin/dashboard/kpis`
- `POST /api/admin/import`
- `POST /api/admin/import/execute`
- `POST /api/cron/nudges`
- `GET /api/export`

**Contract rule:** after this freeze, breaking changes to endpoint paths, required fields, enums, or state transitions require explicit change approval (scope/date impact called out first).

---

## 4) Data/State Contract Freeze (v1)

- **Engagement statuses:** `INVITED`, `COACH_SELECTED`, `IN_PROGRESS`, `COMPLETED`, `CANCELED`, `ON_HOLD`
- **Session statuses:** `COMPLETED`, `FORFEITED_CANCELLED`, `FORFEITED_NOT_USED`
- **Forfeiture label mapping:**
  - `FORFEITED_CANCELLED` -> Session forfeited - canceled within 24 hours
  - `FORFEITED_NOT_USED` -> Session forfeited - not taken advantage of
- **Capacity counting (confirmed):** include `COACH_SELECTED`, `IN_PROGRESS`, `ON_HOLD`; exclude `INVITED`, `COMPLETED`, `CANCELED`
- **Nudge thresholds:** Day 5 reminder, Day 10 reminder, Day 15 auto-assign
- **Timing basis:** all day thresholds measured from `cohortStartDate`

---

## 5) Open Items (Non-blocking or P1 unless noted)

1. **Participant counts per cohort (capacity validation risk).**
2. **EF/EL window-close date** (reporting/calendar clarity).
3. **Session window reporting rule** (show as reporting-only vs hide in MVP).
4. **Nudge recipient setup** (hardcoded vs configurable).
5. **Executive summary KPI set** (Kari/Greg dashboard preferences).
6. **CSV duplicate handling** (skip/report vs fail import).
7. **Coach access timing** (all 31 at once vs phased enablement; training lead time).
8. **ALP-138 Session 2 date correction** (schedule consistency).

---

## 6) Change Control (MVP)

- **Locked now:** flow steps, status enums, endpoint paths, required request fields, and state transitions.
- **Flexible during build:** copy text, minor layout/polish, non-breaking response additions.
- **Any post-freeze scope change:** tracked as Change Request with impact on timeline and effort before approval.

---

## 7) Requested Confirmation

Please reply with:
1. **Approved as-is**, or  
2. **Edits to sections 5-7 only** before we stamp this as MVP Contract v1.
