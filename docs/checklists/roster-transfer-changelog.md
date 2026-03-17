# Roster Change Changelog (Transfers + Lona Miller Removal)

## Scope

Transfer updates tracked in this changelog:
- `titus.g.muyuela@usps.gov` from `EF-1` to `EF-2`
- `cody.a.vanburen@usps.gov` from `EF-1` to `EF-2`
- `antoinette.l.harris@usps.gov` from `ALP-136` to `ALP-137`
- `lona.e.miller@usps.gov` removed from `MLP-80`

Use this document to record exactly what was executed in each environment, when it was executed, and the verification query results.

---

## Preflight (Local Artifacts)

### Run Metadata
- Completed at (UTC): `2026-03-15 19:38:46 UTC`
- Completed at (local): `2026-03-15 14:38:46 CDT`
- Operator: Amit / Codex session

### Commands Executed
```bash
npm run data:build:staging
rg -n -i "titus\.g\.muyuela@usps\.gov|cody\.a\.vanburen@usps\.gov|antoinette\.l\.harris@usps\.gov" fc-assets/normalized/staging-participants.csv
```

### Verification Results
Current artifacts still place participants in source launch cohorts (transfer edits not yet applied in roster source files):
- `antoinette.l.harris@usps.gov` in `ALP-136`
- `titus.g.muyuela@usps.gov` in `EF-1`
- `cody.a.vanburen@usps.gov` in `EF-1`

### Status
- Preflight complete
- Source roster files still require transfer edits before re-running artifact build and seed

### Preflight Re-run (After Source Roster Edits)

#### Run Metadata
- Completed at (UTC): `2026-03-15 20:00:33 UTC`
- Completed at (local): `2026-03-15 15:00:33 CDT`
- Operator: Amit / Codex session

#### Commands Executed
```bash
npm run data:build:staging
rg -n -i "titus\.g\.muyuela@usps\.gov|cody\.a\.vanburen@usps\.gov|antoinette\.l\.harris@usps\.gov" fc-assets/normalized/staging-participants.csv
```

#### Verification Results
- `antoinette.l.harris@usps.gov` now in `ALP-137`
- `titus.g.muyuela@usps.gov` now in `EF-2`
- `cody.a.vanburen@usps.gov` now in `EF-2`

#### Status
- Preflight re-run complete
- Source roster transfer edits reflected in normalized artifacts

### Preflight Re-run (After Lona Miller Source Roster Edit)

#### Run Metadata
- Completed at (UTC): `2026-03-15 20:25:57 UTC`
- Completed at (local): `2026-03-15 15:25:57 CDT`
- Operator: Amit / Codex session

#### Commands Executed
```bash
npm run data:build:staging
rg -n -i "lona\.e\.miller@usps\.gov" fc-assets/normalized/staging-participants.csv
```

#### Verification Results
- `lona.e.miller@usps.gov` is not present in normalized participant artifacts

#### Status
- completed

---

## STAGING Execution Log

### Run Metadata
- Executed at (UTC): `2026-03-15 20:34:10 UTC`
- Operator: Amit / Codex session
- Database/project: Supabase staging (`aws-1-us-east-1.pooler.supabase.com`)

### Commands / SQL Executed
```bash
# 1) (After roster file edits)
npm run data:build:staging

# 2) Apply staging cleanup SQL (use DIRECT_URL because DATABASE_URL has Prisma-only pgbouncer query param)
psql "$DIRECT_URL" -v ON_ERROR_STOP=1 \
  -f scripts/sql/2026-03-15-roster-transfer-apply-staging.sql

# 3) Seed updated artifacts
npm run data:seed:staging

# 4) Remove Lona Miller from live staging DB (post-seed cleanup)
psql "$DIRECT_URL" -v ON_ERROR_STOP=1 \
  -f scripts/sql/2026-03-15-lona-miller-remove-staging.sql
```

### Verification Query Output
```text
Transfer verification rows:
- antoinette.l.harris@usps.gov -> ALP-136 (participant_active=false, engagement_active=false)
- antoinette.l.harris@usps.gov -> ALP-137 (participant_active=true, engagement_active=true)
- cody.a.vanburen@usps.gov -> EF-1 (participant_active=false, engagement_active=false)
- cody.a.vanburen@usps.gov -> EF-2 (participant_active=true, engagement_active=true)
- titus.g.muyuela@usps.gov -> EF-1 (participant_active=false, engagement_active=false)
- titus.g.muyuela@usps.gov -> EF-2 (participant_active=true, engagement_active=true)

Lona verification:
- lona_participant_count = 0
```

### Expected Outcome
- Active rows only in:
  - `EF-2` for Titus + Cody
  - `ALP-137` for Antoinette
- No active rows in `EF-1` or `ALP-136` for those emails
- `lona_participant_count = 0`

### Status
- completed
- Verification captured at (UTC): `2026-03-15 20:34:10 UTC`

---

## PRODUCTION Execution Log

### Run Metadata
- Executed at (UTC): `2026-03-15 20:47:44 UTC`
- Operator: Amit / Codex session
- Database/project: Supabase production (`db.voatlvpgyqhjhuqvhsiv.supabase.co`)
- Snapshot name/id: `15 Mar 2026 13:43:42 (+0000)` (provided post-run)

### Commands / SQL Executed
```bash
# 0) Confirm backup/snapshot completed
# 1) (After roster file edits)
npm run data:build:staging

# 2) Apply production cleanup SQL (use DIRECT_URL because DATABASE_URL has Prisma-only pgbouncer query param)
psql "$DIRECT_URL" -v ON_ERROR_STOP=1 \
  -f scripts/sql/2026-03-15-roster-transfer-apply-production.sql

# 3) Seed updated artifacts
npm run data:seed:staging

# 4) Remove Lona Miller from production DB (post-seed cleanup)
psql "$DIRECT_URL" -v ON_ERROR_STOP=1 \
  -f scripts/sql/2026-03-15-lona-miller-remove-production.sql
```

### Verification Query Output
```text
Transfer verification rows:
- antoinette.l.harris@usps.gov -> ALP-136 (participant_active=false, engagement_active=false)
- antoinette.l.harris@usps.gov -> ALP-137 (participant_active=true, engagement_active=true)
- cody.a.vanburen@usps.gov -> EF-1 (participant_active=false, engagement_active=false)
- cody.a.vanburen@usps.gov -> EF-2 (participant_active=true, engagement_active=true)
- titus.g.muyuela@usps.gov -> EF-1 (participant_active=false, engagement_active=false)
- titus.g.muyuela@usps.gov -> EF-2 (participant_active=true, engagement_active=true)

Lona verification:
- lona_participant_count = 0
```

### Expected Outcome
- Active rows only in:
  - `EF-2` for Titus + Cody
  - `ALP-137` for Antoinette
- No active rows in `EF-1` or `ALP-136` for those emails
- `lona_participant_count = 0`

### Status
- completed
- Verification captured at (UTC): `2026-03-15 20:47:44 UTC`

---

## Baseline Exception + Post-Run Findings

### Exception
- Accepted at (UTC): `2026-03-15 21:21:20 UTC`
- Exception detail: the global baseline query below was not captured before reseed:
  - `SELECT status, COUNT(*) FROM "Engagement" WHERE "archivedAt" IS NULL GROUP BY status;`
- Mitigation: run and record post-run status distributions in staging and production.

### Post-Run Status Distribution
- Staging:
  - `INVITED = 170`
  - `COACH_SELECTED = 14`
- Production:
  - `INVITED = 120`
  - `COACH_SELECTED = 54`

### Rationale For Count Differences
- Staging includes demo cohorts (`USPS-DEMO-EF-RECORDING-2026-03`, `USPS-DEMO-RECORDING-2026-03`) that do not exist in production.
- Core cohorts are at different progression states between environments (production has substantially more real `COACH_SELECTED` engagements in launch cohorts).
- Therefore invited/selected totals are not expected to match 1:1 across staging and production.

---

## EF/EL Booking Link Primary Swap (Immediate Mitigation)

### Task Checklist
- [x] 1) In staging first, swap `bookingLinkPrimary`/`bookingLinkSecondary` for EF/EL coaches where secondary exists
- [x] 2) Verify participant confirmation now opens the expected longer-session link
- [x] 3) Apply same SQL to production with changelog entry

### Run Metadata
- Executed at (UTC): `2026-03-16 19:40:19 UTC`
- Executed at (local): `2026-03-16 14:40:19 CDT`
- Operator: Amit / Codex session
- Scope: EF/EL coach panel (`CoachPoolMembership.pool = EF_EL`)

### SQL Scripts Added
- `scripts/sql/2026-03-15-ef-el-booking-link-primary-swap-staging.sql`
- `scripts/sql/2026-03-15-ef-el-booking-link-primary-swap-production.sql`

### STAGING Execution
```bash
psql "$DIRECT_URL" -v ON_ERROR_STOP=1 \
  -f scripts/sql/2026-03-15-ef-el-booking-link-primary-swap-staging.sql
```

Verification:
- `updated_count = 16`
- EF/EL coach panel rows verified post-run: 17
- Post-check for short/interview primaries returned 0 rows:
  - `lower(bookingLinkPrimary) ~ '(30|thirty|intro|interview)'` => none

### Staging Participant Flow Verification (API-level)

Objective: confirm selection/confirmation flow now uses longer-session primary link.

Execution summary:
- Started local app with staging env (`.env.local`) and ran:
  - `POST /api/participant/auth/verify-email`
  - `GET /api/participant/coaches`
  - `POST /api/participant/coaches/select`
- Test participant: `adam.e.briones@usps.gov` (EF-1, staging)
- Selected coach: `Kristen Schmitt` (`cmm27d97a0052cc8jixlpowq1`)

Result:
- `bookingUrl` in select response:
  - `https://calendly.com/kristen-schmitt-franklincovey/60-minute-coaching-session`
- DB values at verification time:
  - `bookingLinkPrimary = https://calendly.com/kristen-schmitt-franklincovey/60-minute-coaching-session`
  - `bookingLinkSecondary = https://calendly.com/kristen-schmitt-franklincovey/30-minute-meeting`
- Assertions:
  - `bookingUrlMatchesPrimary = true`
  - `primaryLooksLongerThanSecondary = true`
- Cleanup:
  - Reset test engagement back to `INVITED` after verification to avoid staging side effects.

### PRODUCTION Execution
```bash
psql "$DIRECT_URL" -v ON_ERROR_STOP=1 \
  -f scripts/sql/2026-03-15-ef-el-booking-link-primary-swap-production.sql
```

Verification:
- `updated_count = 16`
- EF/EL coach panel rows verified post-run: 17
- Post-check for short/interview primaries returned 0 rows:
  - `lower(bookingLinkPrimary) ~ '(30|thirty|intro|interview)'` => none

### Status
- completed
