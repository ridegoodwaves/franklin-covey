# Participant Workflow: Complete Research Reference

**Date**: 2026-02-18 (auth model updated: 2026-02-23; live audit: 2026-02-23)
**Branch**: `feat/phase-0-backend`
**Status**: Frontend complete (Slice 1 pushed `5c82016`). Backend stubs only — no real API yet. Live browser audit complete. Access-code auth model supersedes earlier OTP-via-email design.

> **⚠️ Major Change (2026-02-23):** The participant auth model changed from email-OTP (system sends code via email) to **email + access code** (USPS sends code in physical/email letter). CIL system sends **zero participant emails in MVP**. All participant communications are owned by USPS/FC Ops. See Sections 2–4 and 6 for full details.

---

## 1. Project Overview

The FranklinCovey Coaching Platform is a coaching engagement tool for USPS leadership development programs with three distinct portals:

| Portal | Path | Layout | Auth |
|--------|------|--------|------|
| Participant | `/participant/*` | Immersive (no sidebar, full-screen centered) | Email + USPS-delivered access code |
| Coach | `/coach/*` | `PortalShell` sidebar | Auth.js magic link (Slice 2) |
| Admin | `/admin/*` | `PortalShell` sidebar | Auth.js magic link (Slice 2) |

**Scale**: 400 participants total, 31 coaches (15 MLP/ALP + 16 EF/EL), 4 programs, launching in cohorts starting March 2 (ALP-135 first). Tech: Next.js 15 App Router, TypeScript, Tailwind CSS, shadcn/ui (new-york style), Prisma + Supabase PostgreSQL.

**Participant comms boundary (locked):** USPS sends participant access email (with link + access code) on each cohort's coach-selection window start date. CIL system does **not** send participant emails in MVP — no OTP emails, no reminder emails, no confirmation emails.

---

## 2. The One-Shot Flow: Why It Exists

The participant portal is a **terminal flow** — participants enter once, make a single decision, and leave permanently.

**Business rationale (locked Feb 17 workshop):**
- Participants do not need to track sessions — coaches do that in the coach portal
- Returning to a "dashboard" adds confusion for a single-decision process
- Simplified UX reduces support burden for FC's Kari/Andrea ops team

**What was removed:**
- `/participant/engagement` page — participants used to see their session timeline
- Filter dropdowns on the coach selector — bio drives selection, not specialty filters
- Calendly API integration — replaced with direct booking URL links
- Coach intro videos — de-scoped from MVP (Feb 24 P0 decision)
- System-sent participant emails — USPS owns all participant communications

**Auth model (updated Feb 24):**
USPS sends each participant a welcome email containing the coach-selector URL and a pre-generated **access code**. Participants enter their email + access code in one step. The system never sends emails to participants — there is no "check your inbox for a code" step.

**Middleware enforcement** (`src/middleware.ts:8`): Any request to `/participant/engagement/*` permanently redirects to `/participant/`. Catches old bookmarks.

---

## 3. Complete Flow Map

```
USPS welcome email (sent by USPS/FC Ops on cohort window start date)
    ↓ contains: coach-selector URL + participant access code

/participant/                           ← Step 1: Enter email + access code
    ↓ verifyAccessCode({ email, accessCode })
    ↓ sessionStorage.set('participant-email')
    ↓ sessionStorage.set('participant-verified', 'true')
    │
    ├─── alreadySelected: true ──────→  /participant/confirmation?already=true
    │
    └─── alreadySelected: false ──→  /participant/select-coach

/participant/select-coach               ← Step 2: Choose from 3 coaches
    ↓ fetchCoaches()  →  3 randomized capacity-weighted cards
    ↓ [optional] remixCoaches()  →  3 entirely new cards (once only)
    ↓ selectCoach({ coachId })
    ↓ sessionStorage.set('selected-coach', JSON)
    │
    ├─── CAPACITY_FULL ────────────→  inline error, re-enable cards
    ├─── ALREADY_SELECTED ────────→  /participant/confirmation?already=true
    ├─── INVALID_SESSION ─────────→  /participant/?expired=true
    │
    └─── success ─────────────────→  /participant/confirmation

/participant/confirmation               ← Step 3: TERMINAL SCREEN
    │
    ├─── bookingUrl present ──────→  "Book your first session" button (opens booking page)
    └─── bookingUrl absent ───────→  "Your coach will reach out within 2 business days"

    [PARTICIPANT NEVER RETURNS]
```

**Key difference from earlier design:** There is no separate `/participant/verify-otp` step. Auth happens on the entry page in a single form (email + access code). The `verify-otp` page in the current stub frontend is stale and reflects the old OTP model — it will be replaced when Slice 1 backend ships.

---

## 4. Step-by-Step: Each Page in Depth

### 4.1 Entry Page — `/participant/page.tsx`

**Purpose**: Authenticate the participant using their email + USPS-delivered access code.

**Current stub behavior (stale — OTP model):**
The existing frontend page only collects an email and calls `requestOtp()`. This is the **old design** — it will be replaced with a two-field form (email + access code) when the real backend ships. The `/participant/verify-otp` page will be removed.

**Production behavior (what ships for Slice 1):**
- Two inputs: `email` field + `accessCode` field
- Single submit action: `verifyAccessCode({ email, accessCode })`
- No email sent by the system at any point
- On success: sessionStorage set, redirect to select-coach (or confirmation if already selected)

**On mount:**
- Checks `?expired=true` in URL query params → shows amber banner: "Your session expired. Please enter your email and access code to start again."

**Form behavior:**
- Email `<Input>` with `autoFocus`, `autoComplete="email"`, `type="email"`
- Access code input: `type="text"`, `inputMode="numeric"` or alphanumeric (format TBD with FC)
- Button disabled until both fields are non-empty
- Clears error on any keystroke

**API call: `verifyAccessCode({ email, accessCode })`**

| Error Code | User Message |
|------------|-------------|
| `INVALID_CREDENTIALS` | "Email or access code not recognized — check your invitation" |
| `WINDOW_CLOSED` | "The selection window for your cohort has closed. Contact your program administrator." |
| `RATE_LIMITED` | "Too many requests — please try again in a few minutes" |
| (catch/unknown) | "Something went wrong — please try again" |

**Security note:** The server returns identical error copy for invalid email vs. invalid code to prevent participant list enumeration. `INVALID_CREDENTIALS` covers both cases.

**Access code format:** Pre-generated by the system during participant import. Stored hashed in `Participant.accessCodeHash`. Codes are tied to the individual participant, not the cohort — no shared codes.

---

### 4.2 ~~OTP Verify — `/participant/verify-otp/page.tsx`~~ (REMOVED)

**This page is stale and will be deleted when Slice 1 backend ships.**

It was designed for an OTP model where the system emailed a 6-digit code to participants. That model was superseded by the USPS access-code model (Feb 24 P0 decision). The page currently exists in the frontend as a stub artifact.

**Migration:** When Slice 1 backend is wired, this page is deleted and the entry page (`/participant/page.tsx`) is updated to accept two fields.

---

### 4.3 Coach Selector — `/participant/select-coach/page.tsx`

**Purpose**: Show 3 coaches, allow one remix, complete selection.

**Session guards (useEffect on mount):**
1. `sessionStorage['participant-verified']` absent → `router.replace('/participant/')`
2. `sessionStorage['selected-coach']` present → `router.replace('/participant/confirmation')` — prevents re-selection

**Initial data load (`loadInitialCoaches`):**
1. Calls `fetchCoaches()` API
2. If `result.allAtCapacity === true` → shows "All Coaches Currently Full" screen
3. If API returns coaches → maps through `apiCoachToLocal()` adapter
4. If API returns empty array (stub) → falls back to local `ALL_COACHES` array via `pickCoaches()`
5. On API error → falls back to local data silently

**Local fallback data (`ALL_COACHES`):**
15 demo coaches with realistic credentials, locations, and specialties. Two are pre-marked `atCapacity: true` (c5 Sofia Ramirez, c7 Priya Nair) for QA testing.

**`pickCoaches()` utility:**
- Prefers coaches not yet shown (`!alreadyShown.has(c.id)`)
- Prefers coaches not at capacity
- Falls back to all unseen coaches if fewer than 3 available
- Fisher-Yates shuffle for randomness

**Coach card rendering:**
- Avatar: photo (`AvatarImage`) or initials fallback (`AvatarFallback` with gradient)
- Name, credentials (comma-separated, uppercase tiny), years experience, location (with pin icon)
- Bio: `line-clamp-3`
- **No video links** — coach intro videos de-scoped from MVP (Feb 24 P0 decision). `videoUrl` field still exists in data model but is not rendered.
- At-capacity: `opacity-60`, "At Capacity" pill badge on avatar, "Unavailable" disabled button
- Hover effects: `-translate-y-1`, shadow, border color shift, gradient overlay

**Known gap (live audit 2026-02-23):** Bio is `line-clamp-3` with no expand behavior. The spec noted "full bio shown on hover/scroll" — this is not implemented.

**Stagger animation pattern:**
```
card[0]: transitionDelay = 150ms
card[1]: transitionDelay = 270ms
card[2]: transitionDelay = 390ms
remix button: transitionDelay = 600ms
```
All use `opacity-0 translate-y-8` → `opacity-100 translate-y-0` driven by `mounted` state.

**Remix:**
- `remixUsed` state = true after first remix (one-way door)
- Calls `remixCoaches()` API; falls back to local `pickCoaches(shownIds, ...)` on error/empty
- Ensures zero overlap: passes `shownIds` Set to exclude previously seen coaches
- After remix: button label → "No More Refreshes Available", stays visible but disabled
- Footer note appears: "You have seen all available coach options. Contact your program administrator..."
- **Known gap (live audit 2026-02-23):** Remix fires immediately on click — no "one-way door" confirmation warning. Spec requires a friendly warning before committing.

**Coach selection (`handleSelect`):**
- Disables all cards immediately (`selectionDisabled = true`) to prevent double-selection
- Shows spinner on clicked card's button
- Calls `selectCoach({ coachId })`
- On success: stores payload to `sessionStorage['selected-coach']`, navigates to `/participant/confirmation`

**On errors:**

| Error Code | Behavior |
|------------|----------|
| `CAPACITY_FULL` | Inline error above cards, re-enables selection |
| `ALREADY_SELECTED` | Redirect to `/participant/confirmation?already=true` |
| `INVALID_SESSION` | Redirect to `/participant/?expired=true` |
| catch/unknown | Inline error, re-enables cards |

**Header:** Sticky top bar — FranklinCovey logo left; "Welcome, [participant name]" + avatar right. Currently hardcoded as "Sarah Mitchell" in stub — will pull from iron-session when backend ships.

---

### 4.4 Confirmation — `/participant/confirmation/page.tsx`

**Purpose**: Confirm selection and give the participant their next action. Terminal screen.

**Outer wrapper**: `<Suspense>` required because inner component uses `useSearchParams()`.

**On mount:**
- Reads `sessionStorage['selected-coach']` → JSON.parse
- If parse fails or key absent and `!alreadySelected` → sets `loadError = true`
- `alreadySelected` = `searchParams.get('already') === 'true'`

**Error state**: shows "Something went wrong — Start over" button

**`alreadySelected` without coach data**: shows "Coach Already Selected" headline + "Your selection is confirmed. Contact your program administrator if you have any questions."

**Coach card (shown when coach data available):**
- Avatar 80px, ring-4 ring-fc-100 ring-offset-4
- Name, credentials (joined with ` · `), location with pin icon
- Bio (3-line clamp, left-aligned)
- Divider
- Booking section (conditional on `bookingUrl`):

```
bookingUrl present:
  → Primary button: "Book your first session"
  → Opens coach.bookingUrl in new tab
  → Sub-caption: "Opens your coach's scheduling page in a new tab"

bookingUrl absent:
  → FC-branded info card (fc-50 background, fc-200 border)
  → "What happens next"
  → "Your coach will reach out within 2 business days to schedule your first session"
```

**Known gap (live audit 2026-02-23):** No "Step 2 of 2" step indicator — select-coach shows "Step 1 of 2" but confirmation page has no corresponding step anchor.

**Footer**: "Need help? Contact your program administrator."
**No back navigation.** Selection is final and irreversible.

---

## 5. Session State Architecture

### Current (Stub/Frontend-only)

```
sessionStorage['participant-email']
  Type: string
  Set: entry page after verifyAccessCode success
  Read: header display, confirmation fallback

sessionStorage['participant-verified']
  Type: string ('true')
  Set: entry page after verifyAccessCode success
  Read: select-coach page (session guard)

sessionStorage['selected-coach']
  Type: JSON string (StoredCoach shape)
  Set: select-coach page after selectCoach success
  Read: confirmation page, select-coach page (already-selected guard)
  Shape: { id, name, initials, photo?, bio, credentials[], location, bookingUrl? }
```

**Note:** The stub still has `sessionStorage['participant-email']` set after `requestOtp` (old flow). When Slice 1 backend ships, the entry page collapses to a single `verifyAccessCode` call that sets both `participant-email` and `participant-verified` simultaneously.

### Production (iron-session cookie, 1:1 mapping)

Cookie holds: `{ participantId, email, engagementId? }` — httpOnly, secure, sameSite=lax, 30-day rolling lifetime.

---

## 6. API Contract Reference

**File**: `src/lib/api-client.ts`

All functions use a shared `apiFetch<T>()` helper with `credentials: 'same-origin'` and Content-Type JSON.

### `verifyAccessCode(input): Promise<VerifyAccessCodeResponse>` ← **PRIMARY AUTH**

```typescript
input:  { email: string; accessCode: string }
output: {
  success: boolean
  alreadySelected?: boolean   // true → redirect to confirmation
  error?: 'INVALID_CREDENTIALS' | 'WINDOW_CLOSED' | 'RATE_LIMITED'
}
```

Backend: `POST /api/participant/auth/verify-access-code`

**This is the only auth endpoint in Slice 1.** There is no `requestOtp` or `verifyOtp` in production. The two functions by those names in the current `api-client.ts` are stale stub artifacts.

### `fetchCoaches(): Promise<CoachesResponse>`

```typescript
output: {
  coaches: ParticipantCoachCard[]   // 3 capacity-weighted, randomized
  allAtCapacity: boolean
}
```

Backend: `GET /api/participant/coaches`
**Note**: Does NOT return `meetingBookingUrl` — only exposed after selection.

### `remixCoaches(): Promise<RemixResponse>`

```typescript
output: {
  coaches: ParticipantCoachCard[]   // 3 new, zero overlap with prior batch
  poolExhausted: boolean
}
```

Backend: `POST /api/participant/coaches/remix`
Server tracks usage via session (`remixCount` in iron-session). Returns 403 if already used.

### `selectCoach(input): Promise<SelectCoachResponse>`

```typescript
input:  { coachId: string }
output: {
  success: boolean
  coach?: ParticipantCoachCard
  bookingUrl?: string
  error?: 'CAPACITY_FULL' | 'ALREADY_SELECTED' | 'INVALID_SESSION'
}
```

Backend: `POST /api/participant/coaches/select`

### `ParticipantCoachCard` type

```typescript
{
  id: string
  name: string
  initials: string
  photo?: string
  bio: string
  specialties: string[]
  credentials: string[]
  location: string
  videoUrl?: string           // field exists but NOT rendered in MVP (de-scoped)
  meetingBookingUrl?: string  // only present in selectCoach response
  atCapacity: boolean
  remainingCapacity: number
  yearsExperience: number
}
```

### Removed Stub Functions (2026-02-24)

| Stub Function | Status | Notes |
|--------------|--------|-------|
| `requestOtp` | **DELETED** from `api-client.ts` | Old OTP model; system never sends participant emails |
| `verifyOtp` | **DELETED** from `api-client.ts` | Replaced by `verifyAccessCode` |

### Test Helper Endpoints (non-production only)

| Endpoint | Purpose |
|----------|---------|
| `GET /api/test/latest-magic-link?email=` | Returns last magic link URL for QA |
| `POST /api/test/reset` | Resets test data to seed state |
| `GET /api/test/engagement?participantEmail=` | Returns current engagement state |

---

## 7. Business Rules (All Locked)

### Coach Capacity

- **All coaches**: 20 participants per coach max (`COACH_CAPACITY = 20` in `config.ts` — MLP/ALP updated from 15 to 20, Kari confirmed 2026-02-24)
- Capacity = count of engagements with status `COACH_SELECTED`, `IN_PROGRESS`, or `ON_HOLD`
- Excludes: `INVITED`, `COMPLETED`, `CANCELED`

### Coach Panels (Separate Pools)

- **MLP/ALP panel**: 15 coaches (shared between both programs)
- **EF/EL panel**: 16 coaches (completely separate — no cross-pool matching in MVP)
- A participant only sees coaches from their program's pool

### Remix (See Different Coaches)

- Exactly 1 remix allowed per participant
- Server-enforced (remix count in iron-session)
- Returns 3 entirely new coaches, zero overlap with initial batch
- One-way door: after remix, button is permanently disabled

### Booking URL Rule

- `bookingUrl` present → "Book your first session" button (external link, new tab)
- `bookingUrl` absent → "Your coach will reach out within 2 business days"
- Source: `CoachProfile.meetingBookingUrl` in database
- Not all coaches have scheduling links — coaches without links can still be selected; they are expected to follow up manually

### Coach Videos

- **De-scoped from MVP** (Feb 24 P0 decision)
- `videoUrl` field retained in data model for post-MVP use
- Not rendered in coach selector cards or confirmation

### No Participant Filters

- Removed per Feb 17 workshop. Bio content provides sufficient signal; filters add friction.

### Participant Communications Boundary

- **USPS/FC Ops send**: welcome email (access code + link), any reminders
- **CIL system sends**: coach/admin magic-link emails only
- **CIL system does NOT send**: OTP codes, confirmation emails, reminder emails, any participant-facing email

### Selection Window

- Cohort has a defined window; `WINDOW_CLOSED` error returned if participant attempts auth after window passes

---

## 8. Error Handling & Edge Cases

### Expired Session Mid-Flow

- `selectCoach` returns `INVALID_SESSION` → redirect to `/participant/?expired=true`
- Amber banner: "Your session expired. Please enter your email to start again."
- Participant re-enters email + access code; flow resumes at select-coach

### Coach Fills Up Between Render and Submit (Race Condition)

- `selectCoach` returns `CAPACITY_FULL`
- Inline error above cards: "This coach just filled up — please select another"
- All cards re-enabled. Backend uses `SELECT FOR UPDATE` for atomicity.

### Participant Tries to Return After Selection

- Scenario A: Same session — `sessionStorage['selected-coach']` exists → redirect to confirmation on select-coach mount
- Scenario B: `verifyAccessCode` returns `alreadySelected: true` → `/participant/confirmation?already=true`
- Scenario C: `selectCoach` returns `ALREADY_SELECTED` → `/participant/confirmation?already=true`
- Scenario D: No sessionStorage + `already=true` → "Coach Already Selected" with email-check message

### All Coaches at Capacity

- `fetchCoaches` returns `allAtCapacity: true`
- "All Coaches Currently Full" state with admin-assignment message
- No retry button — participant waits for admin to assign

### Remix Pool Exhausted

- `remixCoaches` returns `poolExhausted: true`
- Footer note: "You have seen all available coach options. Contact your program administrator."

### Direct URL Access Without Auth

- `/participant/select-coach` without `participant-verified` → redirect to `/participant/`
- `/participant/select-coach` with `selected-coach` already set → redirect to `/participant/confirmation`

---

## 9. Engagement Domain Model

### What the Participant Flow Creates/Touches

The participant only creates the transition from `INVITED` → `COACH_SELECTED`.

```
INVITED           ← participant imported via CSV; engagement created by admin
    ↓ (participant selects coach)
COACH_SELECTED    ← participant flow ends here
    ↓ (coach logs first session)
IN_PROGRESS       ← coach portal
    ↓ (coach logs final session)
COMPLETED         ← auto-transitions when totalSessions reached
```

Side transitions (admin/ops only): `Any → CANCELED`, `Any → ON_HOLD`

### Engagement Model Fields (relevant to participant flow)

```
id              String
participantId   String  → Participant.id
coachId         String? → CoachProfile.id (null until COACH_SELECTED)
programId       String  → Program.id (MLP/ALP/EF/EL)
cohortStartDate DateTime → Day 0 for nudge timing
status          EngagementStatus
statusVersion   Int     → optimistic lock field
totalSessions   Int     → 2 (TWO_SESSION) or 5 (FIVE_SESSION)
coachSelectedAt DateTime?
lastActivityAt  DateTime
```

### Participant Model Fields (relevant to auth)

```
id              String
email           String  → unique
accessCodeHash  String  → bcrypt hash of USPS-delivered code
accessCodeExpiry DateTime → expires at cohort selection window close
programId       String
cohortId        String
```

---

## 10. Programs & Coach Panels

### Program Definitions

| Code | Full Name | Track | Sessions | Coach Panel | Panel Size | Capacity/Coach |
|------|-----------|-------|----------|-------------|------------|----------------|
| MLP | Managerial Leadership Program | TWO_SESSION | 2 | MLP_ALP | 15 coaches | 20 |
| ALP | Advanced Leadership Program | TWO_SESSION | 2 | MLP_ALP | 15 coaches | 20 |
| EF | Executive Foundations | FIVE_SESSION | 5 | EF_EL | 16 coaches | 20 |
| EL | Executive Leadership | FIVE_SESSION | 5 | EF_EL | 16 coaches | 20 |

### Session Topics by Program (from `src/lib/config.ts`)

**MLP only** (new managers — managerial competencies):
- Solving Problems, Facilitating Change, Driving Unit Performance, Building Relationships, Managing People, Setting Expectations, Other

**ALP / EF / EL** (experienced + executive — executive competencies):
- Implementing Strategies, Promoting Change, Driving Functional Excellence, Collaborating for Success, Developing People, Leading by Example, Other

**"Other" topic**: Shows static message "Please email the coaching practice" — no free-text input.

### Cohort Schedule

| Cohort | Coach Selection Window Opens | Notes |
|--------|------------------------------|-------|
| ALP-135 | **March 2** | First cohort — earliest access |
| MLP-80 | March 16 | After in-person week 3/9–3/11 |
| ALP-136 | March 26 | |
| EF-1 | After 3/26 | 5 sessions, flexible pacing |
| ALP-137 | April 9 | |
| EL-1 | After 4/9 | 5 sessions, flexible pacing |
| MLP-81 | April 27 | |
| ALP-138 | June 4 | Session 2 window: Aug 7, 2026 (confirmed) |
| EF-2 | After 4/23 | |
| EF-3–5, EL-2–3 | Various | See project plan for full schedule |

---

## 11. Nudge System — Participant Reminder Ownership

**⚠️ Critical clarification (Feb 24 P0 decision):**

In MVP, **USPS/FC Ops own all participant reminder communications**. The CIL system does not send Day 5 / Day 10 reminder emails. The earlier spec describing system-sent nudge emails was superseded.

### What the System Does (MVP)

| Trigger | System Action |
|---------|--------------|
| Day 0 | Participants imported; engagements created at `INVITED`. USPS sends welcome email separately. |
| Day 5 (no selection) | **Dashboard flag only** — "Needs Attention" for ops. USPS/FC Ops may send manual reminder. |
| Day 10 (no selection) | **Dashboard flag only** — escalated "Needs Attention" for ops. |
| Day 15 (no selection) | **Dashboard flag only** — ops manually assigns coach from admin dashboard. System does NOT auto-assign in MVP. |
| 14+ days stalled | Dashboard flag for coach attention (engagement `IN_PROGRESS`, no session logged). |
| 21+ days stalled | Dashboard flag + ops escalation (system emails Andrea/Kari). |

### What USPS/FC Ops Own

- Welcome email (access code + link) — sent per-cohort on window start date
- Day 5 reminder (if sending)
- Day 10 reminder (if sending)
- Any participant-facing comms about forfeited or missed sessions

### What CIL System Emails (Confirmed In-Scope)

- Coach magic-link auth emails (Slice 2)
- Admin magic-link auth emails (Slice 2)
- Auto-assign notification to coach (Day 15, Slice 3)
- Ops escalation email (Day 21+, Slice 3)

**No participant-facing emails are sent by the CIL system in MVP.**

---

## 12. Backend: What Needs to Be Built (Slice 1)

Target: Feb 25 staging deploy, Feb 26 beta test with Kari.

### Access Code Auth Endpoints

**`POST /api/participant/auth/verify-access-code`**
- Input: `{ email: string, accessCode: string }`
- Normalize email (lowercase, trim)
- Look up `Participant` by email — check `accessCodeHash` with bcrypt
- Check cohort window not closed (`accessCodeExpiry > now`)
- Rate limits: 5 attempts/participant/hour + 10/IP/hour
- On success: creates iron-session cookie `{ participantId, email }`, returns `alreadySelected` if engagement is `COACH_SELECTED`
- On failure: returns `INVALID_CREDENTIALS` (same response for bad email or bad code — enumeration prevention)

**Access Code Generation (part of admin CSV import, Slice 1):**
- Generated during participant import (`POST /api/admin/import/execute`)
- Format: 8-character alphanumeric (e.g. `A3X7K9QR`) — readable in USPS letters
- Exported as part of handoff file to USPS for inclusion in welcome emails
- Stored as bcrypt hash in `Participant.accessCodeHash`

### Coach Selection API

**`GET /api/participant/coaches`**
- Requires participant session (cookie)
- Derives `programId` from participant's `INVITED` engagement
- Queries `CoachProfile` via `CoachProgramPanel` join
- Filters: `active = true` AND current count < `maxEngagements`
- Capacity-weighted randomization
- Returns 3 coaches; does NOT include `meetingBookingUrl`
- Does NOT include `videoUrl` in response (de-scoped from MVP)

**`POST /api/participant/coaches/remix`**
- Same query, excludes `excludeIds` from client
- Checks `session.remixCount < 1`
- Returns 403 if already used

**`POST /api/participant/coaches/select`**
- `SELECT FOR UPDATE` on `CoachProfile` row
- Rechecks capacity inside transaction
- Transitions engagement `INVITED → COACH_SELECTED` with optimistic lock check
- Returns `meetingBookingUrl` from `CoachProfile` on success

---

## 13. Configuration Reference (`src/lib/config.ts`)

| Constant | Value | Usage |
|----------|-------|-------|
| `COACH_CAPACITY` | `20` | `maxEngagements` for all coach pools — MLP/ALP updated from 15 to 20 (Kari confirmed 2026-02-24) |
| `NUDGE_THRESHOLDS.participantReminder1Days` | `5` | Dashboard flag (not system email) |
| `NUDGE_THRESHOLDS.participantReminder2Days` | `10` | Dashboard flag (not system email) |
| `NUDGE_THRESHOLDS.opsManualAssignThresholdDays` | `15` | Ops manually assigns coach from dashboard (no system auto-assign in MVP) |
| `NUDGE_THRESHOLDS.coachAttentionDays` | `14` | Coach attention flag |
| `NUDGE_THRESHOLDS.opsEscalationDays` | `21` | Ops escalation email |
| `PROGRAM_TRACK_SESSIONS.TWO_SESSION` | `2` | MLP/ALP |
| `PROGRAM_TRACK_SESSIONS.FIVE_SESSION` | `5` | EF/EL |

**Config status:** `COACH_CAPACITY = 20` applies to all pools. Done.

---

## 14. QA and Testing Notes

### Current Stub Behavior (Stale OTP Model)

The current stub in `api-client.ts` uses the old OTP model. The `requestOtp` and `verifyOtp` functions exist as stub artifacts. For now, use `123456` as the OTP code to progress through the stub flow during development.

**Once Slice 1 backend ships**, the stub is replaced with `verifyAccessCode`. QA values will be:
- Any valid participant email + correct access code → success
- `GET /api/test/engagement?participantEmail=` → current engagement state
- `POST /api/test/reset` → reset test data

### Testing Both Confirmation Paths (Current Stub)

- **Odd coach IDs** (c1, c3, c5...): returns `bookingUrl` → "Book your first session" button
- **Even coach IDs** (c2, c4, c6...): returns `undefined` bookingUrl → "within 2 business days" card

### Edge Case Testing

- Expired session banner: `/participant/?expired=true`
- Already-selected (no sessionStorage): `/participant/confirmation?already=true` after clearing storage
- All at capacity: requires backend stub endpoint to return `allAtCapacity: true`

### Build Verification

```bash
npm run build  # Must pass clean before any commit
npm run lint   # ESLint
```

---

## 15. Key Design Decisions Log

| Decision | Date | Rationale |
|----------|------|-----------|
| No participant engagement page | Feb 17 workshop | One-shot flow; coaches own session tracking |
| No participant filters | Feb 17 workshop | Bio sufficient; filters add friction |
| Access code auth (not per-participant token URL) | Feb 12 brainstorm → confirmed Feb 24 | USPS sends access code in welcome email; generic URL + code is operationally simpler than 400 unique URLs |
| CIL sends zero participant emails | Feb 24 P0 decision | USPS/FC Ops own participant comms in MVP; reduces scope and auth complexity |
| No Calendly API | Feb 10 → confirmed Feb 11 | FedRAMP blocker, cost, DPA complexity; link-behind-button is the actual requirement |
| `meetingBookingUrl` not in fetchCoaches | Feb 12 plan | Prevent participants accessing booking page before committing |
| 1 remix max | Feb 17 workshop | One-way door simplifies ops |
| Booking URL fallback copy | Feb 17 workshop | "Within 2 business days" — not all coaches have scheduling software |
| Coach videos de-scoped | Feb 24 P0 decision | Reduces Slice 1 scope; video links removed from card rendering |
| All coach capacity = 20 | Feb 24 P0 confirmation + Kari follow-up | MLP/ALP updated from 15 to 20; all pools now uniform |
| EF/EL pool = 16 coaches | Feb 24 P0 confirmation | Separate from MLP/ALP's 15-coach pool |
| `SELECT FOR UPDATE` (not Serializable) | Feb 14 technical review | Row-level lock sufficient; Serializable overkill |
| Day 0 = cohort start date | Feb 18 stakeholder clarification | Consistent nudge timing per cohort |
| sessionStorage → iron-session (1:1) | Feb 22 handoff | Deliberate parallel design; no frontend rework when backend ships |
| ALP-135 first, March 2 | Feb 18 Kari confirmation | Earliest coach-selection window |

---

## 16. Live Browser Audit (2026-02-23)

Full end-to-end walkthrough of the deployed Vercel preview using Claude in Chrome MCP. All participant screens navigated with stub credentials. Edge cases also tested directly.

**Stub credentials used:** Email: `test@agency.gov` / OTP: `123456` (old stub flow)

### Screen Findings

| Screen | Status | Notes |
|--------|--------|-------|
| Entry page | ✅ | Logo, form, button activation, expired banner correct |
| OTP verify | ✅ stub | Countdown, monospace input, email display, resend — **will be removed in Slice 1** |
| Coach selector | ✅ core | 3 cards, credentials, years, location, bio, step indicator |
| Remix | ❌ gap | Fires immediately — no one-way-door warning |
| Post-remix state | ✅ | Disabled button, footer note, zero overlap coaches |
| Confirmation | ✅ | Checkmark, coach card, "What happens next", footer |
| Expired banner | ✅ | Amber, correct copy |
| `already=true` + sessionStorage | ✅ | Shows stored coach correctly |

### Confirmed Gaps

| # | Gap | File | Priority |
|---|-----|------|----------|
| 1 | **Remix warning stale closure** — `handleRemixClick` had `canRemix` missing from deps; UI was implemented but not triggered | `select-coach/page.tsx` | High — **Fixed 2026-02-24** |
| 2 | **No "Step 2 of 2" on confirmation** | `confirmation/page.tsx` | Low — **Fixed** |
| 3 | **Bio not expandable** — resolved via "Read full bio →" modal link | Both selector + confirmation | Medium — **Fixed** |

### Implementation Notes from Source

- `poolExhausted` from `remixCoaches` API is never read by the UI (low impact — `remixUsed` covers the UX)
- `remainingCapacity` is dropped in `apiCoachToLocal()` adapter — safe for now since backend handles weighting
- `CURRENT_PARTICIPANT` hardcoded as "Sarah Mitchell" — needs iron-session wiring when backend ships
- `sessionCount` field on local `Coach` type is never rendered — dead field, safe to remove

---

*Last updated: 2026-02-24 | Branch: main | Auth model: email + USPS access code (OTP model superseded)*
