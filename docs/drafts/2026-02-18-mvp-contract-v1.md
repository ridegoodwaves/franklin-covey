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
- **Coach capacity policy:** All coach pools are confirmed at **20 participants per coach** (MLP/ALP updated from 15 to 20; Kari confirmed 2026-02-24).
- **Planning baseline:** MVP planning baseline is confirmed at **400 total participants** across cohorts.
- **Participant flow model:** One visit, one coach decision, then done (no participant dashboard).
- **Participant access boundary:** USPS sends participant cohort welcome email with coach-selector link; participants enter email-only (must match imported roster + active cohort window). CIL system does **not** send participant emails in MVP.
- **Participant auth risk posture (MVP):** FC accepts email-entry-only residual impersonation risk for March launch, with safeguards: roster-only allowlist, active-window gating, rate limiting, generic auth errors, and audit logging.
- **ALP-135 roster input:** received from FC and locked as the first cohort import source for MVP.
- **Client enrichment file scope:** participant detail files used for coach/client matching context (for example `FY26 ALP 136_EF 1 Coaching Bios.xlsx`) are **not integrated into coach selector logic in MVP**; treat as post-MVP enhancement for coach-facing context display.
- **Coach/admin access model:** shared `/auth/signin` entry; request a fresh magic link when session expires (do not reuse old email links).
- **Nudge anchor:** Day 0 = cohort start date.
- **Session outcomes are coach-entered only:** no automatic Session 1 lock/expiry in MVP.
- **Coach booking links are tool-agnostic:** direct booking URLs can be Calendly, Acuity, or equivalent.
- **Coach visibility + fallback rule:** coaches without an active booking URL may still be selected in MVP. If selected coach has no booking URL, confirmation shows "Your coach will reach out within 2 business days" (no booking CTA), coach is expected to follow up, and delayed follow-up should surface in "Needs Attention".
- **Coach bio video in selector:** de-scoped from MVP.
- **ALP-138 Session 2 start date:** Aug 7, 2026 (confirmed).
- **EF/EL 5-session workflow:** same logging model as MLP/ALP; only differences are 5 sessions and flexible pacing.
- **EF/EL reporting window anchor:** coach-selection-window start + 9 months.
- **Use-it-or-lose-it model:** manual only for ALP/MLP; no automatic lock/forfeit. Overdue Session 1/2 items surface as "Needs Attention" for ops follow-up. EF/EL does not use this deadline model in MVP.
- **Environment isolation:** separate staging and production projects for Vercel and Supabase (no shared secrets/keys/DB URLs).
- **Staging data policy:** controlled staging data handling; sanitized-by-default for non-launch QA imports, with USPS MVP seed data allowed for launch-realistic testing under strict email/output safety controls.
- **Staging email safety:** `EMAIL_MODE=sandbox` + hard allowlist; block non-allowlisted recipients.
- **Staging outbound-email kill switch:** `EMAIL_OUTBOUND_ENABLED=false` is required in staging; staging magic-link tests may temporarily set true only with allowlist controls in place.
- **Shared email safety guard:** all system email send paths must call the centralized guard (`src/lib/email/guard.ts`, `src/lib/email/send-with-guard.ts`) before provider send.
- **Platform foundation beyond USPS (schema-level):** multi-org-ready data model is implemented in staging so additional organizations can be onboarded post-MVP without schema redesign.
- **Forfeiture labels:**
  - Session forfeited - canceled within 24 hours
  - Session forfeited - not taken advantage of

---

## 2) Frozen User Flows (MVP)

### Participant Flow (Slice 1)
1. USPS sends participant cohort welcome email with coach-selector link (group send model).
2. Participant enters roster-matched email -> sees 3 coach cards.
3. Participant can remix once.  
4. Participant selects coach -> confirmation page with coach booking link (Calendly/Acuity/etc.) when available; otherwise show coach-outreach fallback message.
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
3. Reminder ownership model is manual in MVP: USPS/FC Ops send participant reminders; system-owned behavior is dashboard flagging + coach/admin magic-link emails only.  
4. Admin exports CSV / print-friendly reports.
5. Returning admin uses `/auth/signin` to request a new magic link after idle timeout.

---

## 3) API Contract Freeze (v1)

These endpoints and payload shapes are the implementation baseline:

- `POST /api/participant/auth/verify-email-entry`
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
- **Nudge thresholds:** participant reminder sends are manual in MVP (USPS/FC Ops). System-owned behavior is dashboard flagging and coach/admin access emails only.
- **Timing basis:** all day thresholds measured from `cohortStartDate`

---

## 5) Open Items (Non-blocking or P1 unless noted)

1. **Participant counts per cohort (capacity validation risk)** — 400 total baseline is confirmed; per-cohort allocations still need final lock.
2. **Coach-selection window file maintenance** — confirm update process/owner for timeline changes after launch.
3. **Participant email-access dispute workflow** — confirm FC Ops owner + SLA for wrong-email / disputed-selection reset requests.
4. **Session window reporting rule** (show as reporting-only vs hide in MVP).
5. **Reminder ownership implementation detail** — confirm whether dashboard should track manual reminder checkpoints (week 1/week 2/week 3 assignment) as optional ops fields.
6. **Cohort communication tracking fields** (participant send date, coach send date, owner, status).
7. **Executive summary KPI set** (Kari/Greg dashboard preferences).
8. **CSV duplicate handling** (skip/report vs fail import).

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

---

## Implementation Snapshot (2026-02-25)

- Staging schema migration applied and recorded.
- USPS baseline staging seed complete: 4 programs, 14 cohorts, 32 coach memberships, 175 participants, 175 engagements.
- Admin staging access seeded for Amit + Tim; Kari + Andrea pending final emails.
