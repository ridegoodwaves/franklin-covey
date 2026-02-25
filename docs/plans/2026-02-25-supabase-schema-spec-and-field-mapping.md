# Supabase Schema Spec + Field Mapping (MVP Launch)

**Date:** 2026-02-25  
**Status:** Schema applied to staging + USPS seed loaded (pending remaining admin emails and EF/EL selection-end confirmation)

## 1) Locked Inputs + Decisions

- Participant auth for MVP is `email + cohort` only (no participant OTP/access code).
- Coach capacity is `20` for all pools (`MLP/ALP` and `EF/EL`).
- Participant uniqueness is scoped within organization and cohort (not global).
- EF/EL reporting anchor is `coachSelectionStart + 9 months`.
- Use-it-or-lose-it is manual for ALP/MLP (`needs attention` flag), not automatic lock/forfeit.
- Booking links: store both when available, show 30-minute link by default.
- Multi-org readiness is in MVP foundation now:
  - coaches can serve multiple organizations
  - policies/capacity are organization-scoped
  - single DB with strict organization isolation
- Initial organization seed is confirmed:
  - `code=USPS`
  - `name=USPS`
- Launch admins are confirmed as global admins (cross-org visibility).

## 2) Source Files (current)

- Participant rosters: `fc-assets/participant-rosters`
- Coach bios (EF/EL): `fc-assets/coach-bios/Executive Coach Bios/md`
- Coach bios (MLP/ALP): `fc-assets/coach-bios/MLP-ALP Coach Bios/md`
- Coach links: `fc-assets/calendly-links/USPS Coach Calendly and Emails - final 2-24 Sheet1.csv`
- Cohort timelines: `fc-assets/cohort-timelines/FY26 Coaching Timelines_FranklinCovey-v3.md`

Current data profile from files:

- Participant rows imported: `175` (all unique across current files).
- Coach link rows imported: `32` (all unique emails).
- Link split: `15` one-link coaches, `17` two-link coaches.

## 3) Target Schema (Prisma)

The canonical schema is `prisma/schema.prisma` with these core entities:

- `Organization` (tenant boundary + isolation root)
- `Program` (`MLP`, `ALP`, `EF`, `EL`)
- `Cohort` (selection windows + session windows + reporting window)
- `Participant` (email, cohort, source lineage)
- `User` + `CoachProfile` + `OrganizationCoach` + `CoachPoolMembership`
- `Engagement` + `Session` + `NeedsAttentionFlag`
- `ImportBatch` + `ImportRowIssue` (import traceability)
- `AuditEvent` (security/audit trail)

## 4) Field Mapping Rules

### 4.1 Participant roster (.md table)

Source:

- Column: `Email Address`
- Derived from filename: `programCode`, `cohortCode`

Target:

- `Participant.email` (normalized lower-case, trimmed)
- `Participant.organizationId` (resolved from import context)
- `Participant.cohortId` (resolved via `Cohort.code`)
- `Participant.sourceFile`, `Participant.sourcePayload`
- `Engagement` seeded with:
  - `status = INVITED`
  - `totalSessions = 2` for MLP/ALP, `5` for EF/EL
  - `programId`, `cohortId` resolved from cohort

Validation:

- reject invalid email format
- dedupe by `(organizationId, cohortId, email)`
- log rejects to `ImportRowIssue`
- hard-fail if participant row org does not match cohort org

### 4.2 Coach links CSV

Source columns (positional):

- col1 = coach display name
- col2 = coach email
- col3 = primary link (MLP/ALP single link OR EF/EL 30-min)
- col4 = secondary link (EF/EL 60-min when provided)

Target:

- `User.email` (`role=COACH`)
- `CoachProfile` (person-level bio/identity)
- `OrganizationCoach` (org membership + org-specific capacity; `maxEngagements=20` now)
- `CoachPoolMembership` under `OrganizationCoach` for `MLP_ALP` or `EF_EL`
- Booking links stored in `CoachProfile` for MVP (shared links); can move to org override later if needed

Validation:

- strict URL format (`https://...`)
- trim whitespace/non-breaking spaces
- keep both links; UI/API decides what to show first
- hard-fail if coach import org does not match referenced cohort/program org context

### 4.3 Coach bios (.md)

Target:

- `CoachProfile.displayName`, `firstName`, `lastName`
- `CoachProfile.location`, `shortBio`
- `CoachHighlight[]`, `CoachCertification[]`, `CoachClientQuote[]`
- `CoachPoolMembership.pool` from file group:
  - Executive bios -> `EF_EL`
  - MLP/ALP bios -> `MLP_ALP`

Validation:

- resolve coach by email first (from links file), then by normalized name fallback
- unresolved names go to import issue table for manual review

### 4.4 Cohort timelines (.md)

Target:

- `Cohort.code`, `programId`
- `Cohort.organizationId`
- `coachSelectionStart`, `coachSelectionEnd`
- `session1Start`, `session1End`, `session2Start`, `session2End` (where defined)
- `reportingWindowEnd`:
  - ALP/MLP = explicit session window end from timeline
  - EF/EL = `coachSelectionStart + interval '9 months'`

## 5) Migration + Seeding Order (staging)

1. Create schema objects (DDL from `prisma/schema.prisma`).
2. Seed reference data: `Organization`, then `Program`, then `Cohort`.
3. Seed coaches (`User`, `CoachProfile`, memberships, bio sections).
4. Seed participants from roster files.
5. Seed `Engagement` rows for each participant.
6. Seed admin users (once final emails are provided).
7. Run import/validation report and lock baseline snapshot.

Staging execution snapshot (2026-02-25):

- Schema migration `20260225_init_multi_org` applied and recorded in Prisma migration history.
- Seeded counts:
  - programs: `4`
  - cohorts: `14`
  - coach memberships: `32`
  - participants: `175`
  - engagements: `175`
  - admins: `2` (`tim@coachinginnovationlab.com`, `amit@coachinginnovationlab.com`)

Service-layer guardrails (required):

1. Every query for participant/coach/ops endpoints must include `organizationId`.
2. Cross-entity writes must validate org alignment:
   - participant.org == cohort.org == program.org == engagement.org
   - engagement.organizationCoach belongs to engagement.org

## 6) Open Inputs Before Applying to `fc-staging`

1. Launch admin emails for:
   - Kari
   - Andrea
2. Remaining cohort roster files (to move from 175 current participants toward 400 total).
3. Confirm explicit EF/EL coach-selection end dates (current staging seed uses temporary default: `selection start + 19 days` where source end date is blank).

## 7) Notes on Global vs Org/Cohort-Scoped Participant Uniqueness

Decision is org-scoped/cohort-scoped uniqueness (`organization + cohort + email`), which supports legitimate re-use of the same participant email in future cohorts and across organizations without data backfills or special casing.  
If switched to global uniqueness, repeat participants would fail inserts and require additional cross-cohort identity/version logic.
