---
title: "Front-End Audit: MVP Requirements vs. Current Build"
date: 2026-02-22
author: "Claude Code"
scope: "All pages on Vercel deployment + codebase analysis"
---

# Front-End Audit

## Scope

Full audit of the Franklin Covey coaching platform frontend against MVP requirements defined in:
- `CLAUDE.md` — architecture, conventions, design decisions
- `docs/plans/2026-02-12-feat-mvp-backend-vertical-slices-plan.md` — slice acceptance criteria
- Feb 17 workshop decisions (locked decisions reflected in CLAUDE.md)
- Feb 18 stakeholder clarifications

Deployment audited: `https://franklin-covey-git-feat-phase-0-backend-ridegoodwaves-projects.vercel.app/`

---

## Executive Summary

The frontend is **polished and largely complete** — design system is well-applied, animations are smooth, and all three portals have working UI shells. The participant flow, coach dashboard, and admin import wizard are demo-ready.

However, there are **8 critical issues** that will break the real user experience when backend goes live (March 2), **5 high-priority UX gaps** that affect participant trust and admin workflow, and **9 medium-priority improvements** that should be addressed before client demos.

**Overall assessment**: Strong foundation. The build is ~70% MVP-ready. The critical fixes are surgical — no page needs to be rebuilt, only specific components updated.

---

## 1. Participant Flow

### `/participant/` — Email Entry

**What's built:** Email input form, FranklinCovey logo, error states for `EMAIL_NOT_FOUND`, `WINDOW_CLOSED`, `RATE_LIMITED`, session expiry banner (`?expired=true`).

**Issues:**

| Priority | Issue | Location | Fix |
|----------|-------|----------|-----|
| 🔴 Critical | Error code `WINDOW_CLOSED` is referenced in error handling but this is not a documented error code in the API spec. Should be `WINDOW_EXPIRED` or removed. | `src/app/participant/page.tsx` | Align with backend error codes in `api-client.ts` |
| 🟡 Medium | No visual loading state while OTP is being sent — the submit button should show a spinner | `participant/page.tsx` | Add loading state to button |
| 🟢 Low | "Need help? Contact your program administrator" at the bottom has no contact info or link | `participant/page.tsx` | Add a mailto or note it's a future enhancement |

**What's working correctly:** Session expiry banner, email validation, sessionStorage write (`participant-email`), redirect to `/participant/verify-otp`.

---

### `/participant/verify-otp` — OTP Verification

**What's built:** 6-digit input, 60-second resend countdown, back link, max 3 attempts, reads `participant-email` from sessionStorage.

**Issues:**

| Priority | Issue | Location | Fix |
|----------|-------|----------|-----|
| 🟡 High | Resend countdown is **60 seconds** in the UI. The API spec (plan line 406) specifies a 30-second cooldown in the test suite (`Suite 1.5: "after 30s cooldown"`). Mismatch between UI and spec. | `verify-otp/page.tsx` | Change cooldown to 30s |
| 🟡 High | OTP auto-submit on 6th digit is not implemented — user must manually click "Verify". The plan expects "auto-submit on complete" | `verify-otp/page.tsx` | Add auto-submit when 6 digits entered |
| 🟢 Low | "Back to email" is a text link — low visibility. Participants who mistype email might miss it | `verify-otp/page.tsx` | Style as a more visible back affordance |

**What's working correctly:** Session guard (redirects to `/participant/` if no email in storage), `alreadySelected` redirect to confirmation, error display.

---

### `/participant/select-coach` — Coach Selection

**What's built:** Sticky header with logo + participant name, hero heading with step indicator, 3-coach grid, capacity detection, remix (1 allowed), "Select This Coach" button, loading/error states, all-at-capacity empty state.

**Issues:**

| Priority | Issue | Location | Fix |
|----------|-------|----------|-----|
| 🔴 Critical | **"Step 1 of 2" indicator is misleading.** The participant flow ends at confirmation — selection is effectively the only action. Showing "Step 1 of 2" implies there's another interactive step, which erodes trust after confirmation. | `select-coach/page.tsx:501` | Change to "Step 1 of 1" or remove the step indicator entirely |
| 🔴 Critical | **Remix has no one-way door warning.** The Feb 17 decision explicitly locked: *"Friendly one-way-door warning before committing."* Clicking "See Different Coaches" immediately fires the remix with no confirmation dialog. If the participant remixes by accident, they've lost their only redo. | `select-coach/page.tsx:360-401` | Show a modal/inline warning: "You can only do this once. You won't be able to return to these coaches." with Cancel/Confirm |
| 🔴 Critical | **Participant name is hardcoded as "Sarah Mitchell"** in the header (`CURRENT_PARTICIPANT`). When real data replaces the stub, the header still shows this hardcoded name unless the page reads from the API session. | `select-coach/page.tsx:257-261` | Remove hardcoded constant; read participant first name from API session response |
| 🟡 High | **Coach cards don't show "highlights"** (2-3 highlights with personal touch). Per the Feb 17 design decisions: *"Coach card content: 2-3 highlights (include personal touch), credentials."* Currently only credentials + years + location are shown — no highlights section. | `select-coach/page.tsx:621-656` | Add a highlights section below bio (max 3 tags/bullets). Source from coach data when API ships. |
| 🟡 High | `coach.specialties` exists in the coach interface and is fetched from the API but **never rendered on the card**. Specialties are in the API client type `ParticipantCoachCard`. This is a data gap that needs design resolution. | `select-coach/page.tsx:26-40` | Either render specialties as tags (as highlights), or document the decision not to show them |
| 🟡 Medium | **"See Different Coaches" text after remix becomes "No More Refreshes Available"** but the button styling doesn't change — it looks like a normal outline button with different text. After remix, it should be visually distinct (grayed out, cursor-not-allowed) to communicate finality. | `select-coach/page.tsx:770` | Apply `opacity-50 cursor-not-allowed` styling to the post-remix state |
| 🟢 Low | No loading skeleton while `fetchCoaches()` runs — the grid is empty until data resolves. At 60+ concurrent participants on March 2, this could feel broken. | `select-coach/page.tsx:332-357` | Add 3 skeleton card placeholders during the initial fetch |
| 🟢 Low | After selecting a coach, the "Selecting..." spinner fires but the user sees nothing for the redirect duration. A brief success micro-animation before redirect would improve perceived performance. | `select-coach/page.tsx:703-712` | Optional: brief success flash before `router.push()` |

**What's working correctly:** Session guards (redirects if no `participant-verified`), `alreadySelected` guard, API fallback to demo data on error, capacity badge, at-capacity state, remix logic (excluding the UX gap above).

---

### `/participant/confirmation` — Final Step

**What's built:** Checkmark icon, coach card (name, credentials, location, bio), "Book your first session" button (opens `bookingUrl` in new tab), "What happens next" fallback (when no booking URL), "already selected" variant.

**Issues:**

| Priority | Issue | Location | Fix |
|----------|-------|----------|-----|
| 🟡 High | **No program context shown.** Participants see their coach but not their program name (MLP / ALP / EF / EL) or cohort. For a participant who is confused about which program they're in, this provides no grounding. | `confirmation/page.tsx:125-209` | Add program name below the headline: "Your [Program Name] coaching engagement has been confirmed." |
| 🟡 Medium | **"Book your first session" CTA button** — the word "first" implies the platform will track subsequent sessions. But per the MVP spec, the participant flow ends here and they never return. If the participant ever comes back to this page, the button text implies there are more bookings to track. | `confirmation/page.tsx:188` | Change to "Book your session" (removes temporal implication) |
| 🟡 Medium | **No email confirmation messaging.** After selecting a coach, participants reasonably expect an email confirmation. The page doesn't mention whether they'll receive one. Until email is wired, a note like "Check your email for confirmation details" sets expectations. | `confirmation/page.tsx:210-220` | Add a note: "A confirmation has been sent to [email]" |
| 🟢 Low | The "Contact your program administrator" footer note has no contact info. | `confirmation/page.tsx:213` | Add email/name if available at launch |

**What's working correctly:** `sessionStorage` reads correctly, graceful error state if no coach data, `?already=true` variant, booking URL handling.

---

## 2. Coach Portal

### `/coach/dashboard` — Coach Home

**What's built:** Welcome header with dynamic date, 3 KPI stat cards, "Needs Attention" section (2 items), upcoming sessions list (4 items), engagement grid with Active/Completed tabs.

**Issues:**

| Priority | Issue | Location | Fix |
|----------|-------|----------|-----|
| 🔴 Critical | **"Today" and "Tomorrow" badges on session rows are hardcoded to specific dates** (`"Feb 10, 2026"` and `"Feb 11, 2026"`). These will never match after those dates pass — all sessions will show without the badges permanently. | `coach/dashboard/page.tsx:331-332` | Compare against `new Date()` dynamically instead of hardcoded strings |
| 🔴 Critical | **Nav badge "6" on My Engagements is hardcoded** in `nav-config.tsx:79`. When real data ships, this will always show 6 regardless of actual engagement count. | `src/lib/nav-config.tsx:79` | Pass badge as a prop to PortalShell dynamically, or remove until backend is wired |
| 🟡 High | **"View All" link for Upcoming Sessions goes to `/coach/calendar`** which doesn't exist. While the link is correctly disabled (`disabled: true`), if the `disabled` prop is ever removed or the link is refactored, it will 404. | `coach/dashboard/page.tsx:705` | Keep disabled AND add a comment explaining `/coach/calendar` is a future feature |
| 🟡 High | **Completion rate (92%) and sessions this week (4) are hardcoded constants** (`const sessionsThisWeek = 4; const completionRate = 92`). These will need to be replaced by API data in Slice 2. | `coach/dashboard/page.tsx:628-629` | Flag clearly with a `// TODO: replace with API data` comment, or move to demo data object |
| 🟡 Medium | **Needs Attention severity distinction is non-functional.** `severity: "high"` vs `"medium"` are set in demo data but both render identically (same amber color, same icon). Either differentiate visually or remove the severity field. | `coach/dashboard/page.tsx:408-417` | Either implement distinct styling (red icon for high, amber for medium) or collapse to single state |
| 🟢 Low | The coach engagement grid on dashboard duplicates what's in `/coach/engagements`. Users navigating between the two may be confused about which is canonical. The dashboard grid serves as a preview — adding a count like "6 of 8 active" in the section header makes the relationship clearer. | `coach/dashboard/page.tsx:729` | Update SectionHeader to clarify this is a preview |

**What's working correctly:** Dynamic date display, Active/Completed tab filtering, animation stagger, engagement cards link correctly to detail pages, KPI cards render correctly.

---

### `/coach/engagements` — Engagement List

**What's built:** Header with count badge (8), Active/Completed tabs, engagement rows with participant name, org, program track badge, status badge, progress bar, last activity, next session, hover arrow. Links to detail pages.

**Issues:**

| Priority | Issue | Location | Fix |
|----------|-------|----------|-----|
| 🟡 High | **Count badge "8" in the header is hardcoded** — it will show 8 regardless of actual data when backend is live. | `coach/engagements/page.tsx` | Derive from `engagements.length` dynamically (currently done for tabs but the header likely hardcodes it) |
| 🟡 Medium | **`ON_HOLD` status engagements appear in the "Active" tab** because the tab filter is: `e.status !== "COMPLETED" && e.status !== "CANCELED"`. This includes ON_HOLD in Active, which may confuse coaches. | `coach/engagements/page.tsx` | Consider a third tab "On Hold" or at minimum add a distinct visual indicator |
| 🟢 Low | No search or filter on the engagement list. With 15 engagements per coach, this is manageable, but adding a search by participant name would improve usability. | `coach/engagements/page.tsx` | Low priority for MVP; add to post-launch backlog |

**What's working correctly:** Tab filtering, responsive behavior (progress bar hidden on mobile), hover states, empty states.

---

### `/coach/engagements/[id]` — Session Logging (Slice 2)

**What's built:** Participant header card with avatar, name, title, org, program track, status, date range, progress bar with session dots. Log Session form (topic dropdown, outcome dropdown, duration pill selector, private notes with auto-save). Session History tab. Success state.

**Issues:**

| Priority | Issue | Location | Fix |
|----------|-------|----------|-----|
| 🔴 Critical | **Topic dropdown uses `MLP_SESSION_TOPICS` only for all coaches.** The import at line 30: `import { MLP_SESSION_TOPICS, SESSION_OUTCOMES, DURATION_OPTIONS } from "@/lib/config"`. Coaches working with ALP/EF/EL participants need `EXECUTIVE_SESSION_TOPICS`. This is a functional bug — coaches will log the wrong topic competencies for executive participants. | `coach/engagements/[id]/page.tsx:30` | Import `SESSION_TOPICS_BY_PROGRAM` and select the correct list based on the participant's program type: `SESSION_TOPICS_BY_PROGRAM[programType]` |
| 🔴 Critical | **No date picker for `occurredAt`** (when the session happened). The backend spec explicitly requires: *"Date picker for `occurredAt` (default: today)"*. Without this, all sessions will be implicitly "today" and coaches can't log sessions from previous days. | `coach/engagements/[id]/page.tsx` | Add a date input field to the session logging form, defaulting to today |
| 🟡 High | **"Schedule Next Session" button in success state is not wired to any URL.** Per spec, it should open the participant's `meetingBookingUrl` in a new tab. Currently it renders as a Button with no `href` or `onClick`. | `coach/engagements/[id]/page.tsx` | Wire to `engagement.participant.coach.meetingBookingUrl` when API is live |
| 🟡 High | **Session status dropdown (`COMPLETED` vs `FORFEITED_CANCELLED` vs `FORFEITED_NOT_USED`) is absent.** The form only shows topic/outcome/duration. The spec defines three session statuses that coaches must enter. A forfeited session is a significantly different outcome from a completed one. | `coach/engagements/[id]/page.tsx` | Add session status selection (radio or select) with the 3 options and their full labels: "Completed", "Session forfeited – canceled within 24 hours", "Session forfeited – not taken advantage of" |
| 🟡 Medium | **Progress bar session dots don't reflect current session number.** The visual shows dots for each session, but the "current" session dot isn't clearly marked or animated. | `coach/engagements/[id]/page.tsx` | Highlight the current session dot (filled vs outline, or a pulsing animation) |
| 🟢 Low | Auto-save indicator shows "idle / saving / saved / draft" but the draft indicator is hard to distinguish from saved. | `coach/engagements/[id]/page.tsx` | Use distinct colors: saved = emerald, draft = amber, saving = fc-600 spinning |

**What's working correctly:** Portal shell, tab structure (Log Session / Session History), duration pill selector, "Other" topic shows static note, private notes textarea, basic form validation before submit, session history timeline.

---

## 3. Admin Portal

### `/admin/dashboard` — Operations Home

**What's built:** 5 KPI cards with sparklines, engagement table with tabs (All / Needs Attention), filter bar (status, coach, track, search), sortable columns, pagination, export CSV, print PDF.

**Issues:**

| Priority | Issue | Location | Fix |
|----------|-------|----------|-----|
| 🔴 Critical | **KPI data is fully hardcoded** (400 total, 248 in progress, etc.) and will stay frozen until Slice 3 wiring. More importantly, the sparkline data (`[320, 335, 350, ...]`) is hardcoded trend data that implies historical growth — this is misleading in a demo with real stakeholders like Greg/Kari. | `admin/dashboard/page.tsx:123-189` | Either add a "Demo data" watermark/banner, or wrap hardcoded values in a `DEMO_DATA` object with a clear comment |
| 🔴 Critical | **CSS classes `text-fc-cool-black`, `text-fc-deep-blue`, `text-fc-green`, `text-fc-golden` are used throughout the admin dashboard** but may not be defined in `tailwind.config.ts`. The design system documents `fc-*` as the primary scale with specific step numbers (50-950). If these semantic aliases aren't in the config, they silently fall back to `inherit`. | `admin/dashboard/page.tsx` | Audit `tailwind.config.ts` for these classes. If missing, replace with equivalent `fc-*` scale values: `text-fc-950` for cool-black, `text-fc-600` for deep-blue |
| 🟡 High | **"Needs Attention" tab default is correct** (`activeTab` defaults to `"attention"`) but the UX is subtle — users land on a filtered view without knowing it's filtered. The tab label should make this more explicit, e.g. "⚠ Needs Attention (5)" | `admin/dashboard/page.tsx:244` | Add a subtle indicator that the default view is pre-filtered, or show a banner: "Showing engagements that need your attention" |
| 🟡 High | **Actions column (⋯ icon) is non-functional** — the `MoreHorizontalIcon` button appears on hover but has no click handler, no dropdown, no action. This is a dead interactive element that misleads users about what they can do. | `admin/dashboard/page.tsx:724-729` | Either remove the button until actions are built, or add a tooltip "Coming soon" |
| 🟡 High | **No program filter.** The admin dashboard filter bar has status, coach, and track — but no program filter (MLP / ALP / EF / EL). With 4 concurrent programs across multiple cohorts, this is a critical ops workflow gap. | `admin/dashboard/page.tsx:231-234` | Add a program dropdown filter alongside the existing ones |
| 🟡 Medium | **Print PDF** triggers `window.print()` directly. No `@media print` CSS is defined yet (listed as a Slice 3 deliverable). Current print output will include the sidebar, nav, and filter controls. | `admin/dashboard/page.tsx:427` | Either disable the Print button until Slice 3, or add a tooltip "Print formatting coming soon" |
| 🟢 Low | **Export CSV** works correctly and downloads the filtered set, but the filename doesn't include the filter state (e.g., coach name, status). With multiple programs running, ops staff exporting for a specific coach would need to rename files manually. | `admin/dashboard/page.tsx:316` | Append filter state to filename: `needs-attention-dr-ford-2026-02-22.csv` |
| 🟢 Low | The admin header is labeled "Dashboard" with "Program overview and engagement monitoring" — generic for a platform that will serve MLP, ALP, EF, and EL concurrently. A program selector or tab would help Kari see program-specific health at a glance. | `admin/dashboard/page.tsx:337-344` | Post-launch, but note as a UX priority |

**What's working correctly:** Tabs, search, status/coach/track filters, sort by column, pagination (10 per page), CSV export functionality, sparkline rendering.

---

### `/admin/coaches` — Coach Roster

**What's built:** 3 overview stat cards (active coaches, total engagements, overall utilization), capacity overview grid, coach directory table with search/sort, hover actions.

**Issues:**

| Priority | Issue | Location | Fix |
|----------|-------|----------|-----|
| 🔴 Critical | **"Add Coach" button in the header is not wired.** It renders as a Button but has no `onClick`, no navigation, no modal. Clicking it does nothing. Kari or Andrea may click this expecting to add a coach, discover it does nothing, and lose trust in the interface. | `admin/coaches/page.tsx` | Either remove the button (coaches are imported via CSV script for MVP), or disable it with a tooltip "Coaches are managed via import. Contact your administrator." |
| 🟡 High | **Capacity percentages and counts are hardcoded demo data** (6 of 7 active coaches, 65% utilization). The real 35-coach panel has very different capacity characteristics. | `admin/coaches/page.tsx` | Mark as demo data; wire to API in Slice 3 |
| 🟡 High | **No pool/panel indicator.** Admin coaches page shows all coaches in one list, but the FC engagement has two distinct coach pools (MLP/ALP = 15 coaches; EF/EL = 17 coaches). Ops needs to see which pool each coach belongs to. | `admin/coaches/page.tsx` | Add a "Panel" badge or column: "MLP/ALP" or "EF/EL" — source from `CoachProgramPanel` when API ships |
| 🟡 Medium | **Edit and More buttons** on coach table rows appear on hover but are not functional — same dead interaction pattern as the admin dashboard actions column. | `admin/coaches/page.tsx` | Disable or remove until Slice 3 wires them |
| 🟢 Low | **"On Leave" status** is shown in demo data but the engagement status model only includes: `INVITED`, `COACH_SELECTED`, `IN_PROGRESS`, `COMPLETED`, `CANCELED`, `ON_HOLD`. "On Leave" is a coach availability state, not defined in the schema spec. | `admin/coaches/page.tsx` | Align coach availability status with `CoachProfile.active` field from ERD |

**What's working correctly:** Capacity bar color thresholds (red >90%, amber 70-90%, green <70%), utilization calculation from demo data, search, table sort.

---

### `/admin/import` — CSV Bulk Import

**What's built:** 3-step wizard (Upload → Preview & Validate → Confirm & Send), drag-and-drop upload zone, template columns display, validation preview table, confirm summary, success state.

**Issues:**

| Priority | Issue | Location | Fix |
|----------|-------|----------|-----|
| 🔴 Critical | **CSV template columns are incomplete vs the backend spec.** The UI shows 5 required columns: `first_name, last_name, email, org, program_track`. The backend spec requires 3 additional fields: `programId`, `cohortCode`, and `cohortStartDate` (Day 0 anchor for nudge timing). Without `cohortStartDate`, the Day 5/10/15 nudge system cannot function. | `admin/import/page.tsx` | Update template column list and download template to include `cohort_code`, `cohort_start_date`, `program_id`. Add explanatory notes for each field. |
| 🔴 Critical | **Import doesn't surface `cohortCode` or `cohortStartDate` in the validation preview.** The preview table columns are: row, valid icon, first name, last name, email, org, program track, errors. These missing columns mean ops staff can't verify nudge timing is correct before committing. | `admin/import/page.tsx` | Add `cohort_code` and `cohort_start_date` columns to the preview table |
| 🟡 High | **"What happens next" section in Step 3 mentions "Participants select coaches"** but the participant flow starts with email entry and OTP. The description should say "Participants will receive an email with a link to select their coach." This is a small but important trust signal for FC stakeholders. | `admin/import/page.tsx` | Update the "What happens next" copy to accurately describe the participant flow |
| 🟡 Medium | **The success state shows "Emails Queued" as a stat** but doesn't indicate when they'll be delivered or provide a retry mechanism. If any emails fail to send on import, there's no visible path to retry. | `admin/import/page.tsx` | Add: "View import results" link or note about retry capability |
| 🟢 Low | **Step indicator uses filled dots** (Step 1 → Step 2 → Step 3) but doesn't visually communicate that Steps 2 and 3 are gated on completing prior steps. | `admin/import/page.tsx` | Lock-icon or disabled styling on future steps until current step completes |

**What's working correctly:** Step state machine (1→2→3), drag-and-drop file input, demo validation logic (shows valid/invalid rows), confirm summary card, import success state, back navigation.

---

## 4. Navigation & Routing

### Dead Links and Missing Routes

| Location | Link | Issue |
|----------|------|-------|
| Coach dashboard | "View All" → `/coach/calendar` | Correctly disabled (`disabled: true`) but the route doesn't exist. If disabled flag is removed, 404. |
| Coach nav | Profile → `/coach/profile` | Correctly disabled with "Soon" pill. No page exists. |
| Admin nav | Engagements → `/admin/engagements` | Correctly disabled with "Soon" pill. No page exists. |
| Admin coach table | Edit button | No href/onClick. Dead interaction. |
| Admin engagement table | ⋯ button | No href/onClick. Dead interaction. |

### Nav Badge Issues

| Location | Current | Expected |
|----------|---------|----------|
| Coach nav → My Engagements | Hardcoded `badge: 6` | Dynamic from `GET /api/coach/engagements?status=ACTIVE` count |
| Admin nav → Engagements | Hardcoded `badge: 12` | Dynamic from `GET /api/admin/engagements?needsAttention=true` count |

Hardcoded nav badges will show stale counts when real data arrives. They should either be removed until Slice 2/3 is wired, or computed dynamically from layout-level data fetching.

### Route Access Patterns

Currently all portals are freely accessible without authentication — navigating directly to `/coach/dashboard` or `/admin/dashboard` requires no login. This is expected in the demo-only frontend but **must** be addressed when backend auth lands in Slice 2 (middleware guards).

The landing page at `/` exposes all three portal entry points. In production, participants will use a direct link, coaches will receive magic links, and admins will bookmark their URL. The portal selector is appropriate as a dev tool but should either be removed or password-protected in the production deployment.

---

## 5. Design System Compliance

### Font Usage

| Usage | Current | Correct |
|-------|---------|---------|
| KPI card values (e.g., "400") | `font-display text-3xl font-semibold` | ✅ Correct — display numbers use serif |
| Section headings (`h2`) | `font-display text-lg font-semibold` | ✅ Correct |
| Button labels | Default (`font-sans`) | ✅ Correct |
| Credential tags on coach cards | `text-[10px] font-semibold tracking-wider text-fc-600 uppercase` | ✅ Correct (`.all-caps` pattern) |

Font usage is consistent and correct throughout.

### Color Usage

| Issue | Location | Severity |
|-------|----------|----------|
| `text-fc-cool-black`, `bg-fc-deep-blue`, `text-fc-green`, `text-fc-golden` used throughout admin dashboard | `admin/dashboard/page.tsx` | 🔴 Needs verification — if these Tailwind classes aren't defined in `tailwind.config.ts`, they silently fail |
| `bg-fc-golden` used as badge background for attention count | `admin/dashboard/page.tsx:445` | 🟡 The design system says `gold-*` is "ONLY used for `.status-coach-selected` badge". Using it for attention counts may be unintentional |
| `bg-fc-cool-gray` fallback in `getStatusColor()` | `src/lib/utils.ts:40` | 🟡 `fc-cool-gray` not in documented color palette |

### Status Color Map Gaps

`getStatusColor()` and `getStatusLabel()` in `utils.ts` are missing the new session statuses from the Feb 18 stakeholder clarification:

```typescript
// Missing from utils.ts:
FORFEITED_CANCELLED: "...",
FORFEITED_NOT_USED: "...",
```

Without these, any component that calls `getStatusLabel("FORFEITED_CANCELLED")` will return the raw string instead of a human-readable label like "Session forfeited – canceled within 24 hours".

Also present but no longer relevant to the spec:
- `SCHEDULED` and `NO_SHOW` remain in `getStatusColor()` but were removed from session status types in the Feb 18 update.

### Animations

Animation usage is consistent and well-implemented throughout. The staggered entrance pattern is correctly applied across all pages. No issues found.

### Logo Usage

| Page | Logo Used | Expected |
|------|-----------|----------|
| Participant email entry | `fc-logomark.svg` (icon only) | ✅ |
| Participant coach selector header | `fc-logomark.svg` | ✅ |
| Participant confirmation header | `fc-logo.svg` (full horizontal) | ✅ (ceremonial conclusion page — full logo appropriate) |
| Coach portal sidebar | Via `CoachPortalIcon` SVG (book icon) | ✅ |
| Admin portal sidebar | Via `AdminPortalIcon` SVG (grid icon) | ✅ |

Logo usage is appropriate and consistent.

---

## 6. MVP Requirements Gaps Summary

### Against Slice 1 Acceptance Criteria (March 2 deadline)

| Acceptance Criterion | Status | Gap |
|---------------------|--------|-----|
| Participant flow ends at selection: confirmation + Calendly link | ✅ Implemented | — |
| Remix: max 1, one-way door with confirmation warning | ⚠️ Partial | **Warning dialog missing** |
| 3 capacity-weighted randomized coaches | ✅ Implemented | — |
| Returning participant with valid session skips OTP | ✅ Implemented (sessionStorage guard) | — |
| "Step 1 of 2" step indicator removed/corrected | ❌ Missing | Shows "Step 1 of 2" incorrectly |
| Participant name from session in header | ❌ Hardcoded | "Sarah Mitchell" hardcoded |
| Zero coaches scenario shows message + notifies ops | ✅ Implemented (UI state) | Not wired to ops notification yet |

### Against Slice 2 Acceptance Criteria (March 9 deadline)

| Acceptance Criterion | Status | Gap |
|---------------------|--------|-----|
| Coach can log a session with structured dropdowns | ⚠️ Partial | **Session status missing** (COMPLETED / FORFEITED_*) |
| Topic dropdown uses program-correct list | ❌ Wrong | **MLP topics hardcoded; ALP/EF/EL need EXECUTIVE_SESSION_TOPICS** |
| Date picker for `occurredAt` | ❌ Missing | **No date field in form** |
| Session notes auto-save as draft | ✅ Implemented (UI) | Not wired to API |

### Against Slice 3 Acceptance Criteria (March 16 deadline)

| Acceptance Criterion | Status | Gap |
|---------------------|--------|-----|
| CSV import includes cohort fields | ❌ Missing | **`cohortCode`, `cohortStartDate` not in template or preview** |
| Admin engagement table has program filter | ❌ Missing | Only status, coach, track filters exist |
| Printable reports via @media print | ❌ Not started | Print button triggers `window.print()` with no print CSS |
| Needs Attention as default dashboard view | ✅ Implemented | Tab defaults to "attention" |

---

## 7. Recommendations (Prioritized)

### Pre-March 2 (Before First Participant Cohort) — 8 fixes

1. **Fix "Step 1 of 2" label** on coach selector → change to "Step 1 of 1" or remove the step indicator
   *Effort: 5 min. File: `select-coach/page.tsx:501`*

2. **Add remix one-way door warning dialog** — show confirmation before firing remix
   *Effort: 30 min. File: `select-coach/page.tsx:360`*

3. **Remove hardcoded participant name "Sarah Mitchell"** — read from API session or show generic "Welcome"
   *Effort: 10 min. File: `select-coach/page.tsx:257-261`*

4. **Fix "Today"/"Tomorrow" badges in coach session rows** — replace hardcoded dates with dynamic comparison
   *Effort: 10 min. File: `coach/dashboard/page.tsx:331-332`*

5. **Add `FORFEITED_CANCELLED` and `FORFEITED_NOT_USED` to `getStatusLabel()` and `getStatusColor()`**
   *Effort: 10 min. File: `src/lib/utils.ts`*

6. **Verify `tailwind.config.ts` has `fc-cool-black`, `fc-deep-blue`, `fc-green`, `fc-golden` aliases** — fix any missing ones
   *Effort: 30 min. File: `tailwind.config.ts`*

7. **Disable or remove "Add Coach" button** on admin coaches page with explanatory tooltip
   *Effort: 10 min. File: `admin/coaches/page.tsx`*

8. **Disable or remove dead ⋯ action buttons** in admin dashboard and coach roster tables
   *Effort: 15 min. Files: `admin/dashboard/page.tsx`, `admin/coaches/page.tsx`*

---

### Pre-March 9 (Before Coach Portal Goes Live) — 5 fixes

9. **Fix session topic dropdown** to use program-correct topic list (`SESSION_TOPICS_BY_PROGRAM[programType]`)
   *Effort: 30 min. File: `coach/engagements/[id]/page.tsx:30`*

10. **Add `occurredAt` date picker** to session logging form (defaulting to today)
    *Effort: 1 hour. File: `coach/engagements/[id]/page.tsx`*

11. **Add session status selection** (COMPLETED / FORFEITED_CANCELLED / FORFEITED_NOT_USED) to session form
    *Effort: 1 hour. File: `coach/engagements/[id]/page.tsx`*

12. **Wire "Schedule Next Session" button** in success state to participant's `meetingBookingUrl`
    *Effort: 30 min. File: `coach/engagements/[id]/page.tsx`*

13. **Fix nav badge counts** — either make dynamic or remove until Slice 2/3 is wired
    *Effort: 30 min. File: `src/lib/nav-config.tsx:79, 87`*

---

### Pre-March 16 (Before Admin Portal Goes Live) — 4 fixes

14. **Add `cohort_code` and `cohort_start_date` fields to CSV import template and preview**
    *Effort: 2 hours. File: `admin/import/page.tsx`*

15. **Add program filter to admin engagement table**
    *Effort: 1 hour. File: `admin/dashboard/page.tsx`*

16. **Add coach pool/panel badge (MLP/ALP vs EF/EL) to coach roster**
    *Effort: 1 hour. File: `admin/coaches/page.tsx`*

17. **Add `@media print` CSS** before enabling the Print PDF button
    *Effort: 2 hours. File: `src/app/globals.css` + page-specific styles*

---

### Improvements (Post-Launch Backlog)

18. Add OTP auto-submit (fires when 6th digit is entered) — small UX improvement
19. Add loading skeleton (3 placeholder cards) while coach data is fetching
20. Show program name on participant confirmation page
21. Add search to coach engagement list
22. Add session receipts / attestation checkbox (USPS request, noted in plan as future)
23. Add "Book Next Session" action to coach engagements list (not just detail page)
24. Executive summary tab on admin dashboard with completion rate, coach utilization by pool, velocity metrics
25. Responsive improvements for tablet layout (currently desktop-first)

---

## Appendix: Page Inventory

| Route | File | Status | Backend Wired |
|-------|------|--------|---------------|
| `/` | `src/app/page.tsx` | ✅ Complete | N/A |
| `/participant/` | `src/app/participant/page.tsx` | ✅ Complete | Partial (api-client stubs) |
| `/participant/verify-otp` | `src/app/participant/verify-otp/page.tsx` | ✅ Complete | Partial |
| `/participant/select-coach` | `src/app/participant/select-coach/page.tsx` | ⚠️ 3 critical gaps | Partial (api-client stubs) |
| `/participant/confirmation` | `src/app/participant/confirmation/page.tsx` | ⚠️ 2 gaps | Partial |
| `/coach/dashboard` | `src/app/coach/dashboard/page.tsx` | ⚠️ 2 critical gaps | ❌ Hardcoded demo data |
| `/coach/engagements` | `src/app/coach/engagements/page.tsx` | ✅ Mostly complete | ❌ Hardcoded demo data |
| `/coach/engagements/[id]` | `src/app/coach/engagements/[id]/page.tsx` | 🔴 3 critical gaps | ❌ Slice 2 stub |
| `/admin/dashboard` | `src/app/admin/dashboard/page.tsx` | ⚠️ 3 gaps | ❌ Hardcoded demo data |
| `/admin/coaches` | `src/app/admin/coaches/page.tsx` | ⚠️ 2 gaps | ❌ Hardcoded demo data |
| `/admin/import` | `src/app/admin/import/page.tsx` | 🔴 2 critical gaps | ❌ Slice 3 stub |
