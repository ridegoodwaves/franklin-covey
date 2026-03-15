---
title: Staging Demo Participants Runbook
date: 2026-03-02
type: checklist
---

# Staging Demo Participants Runbook

## Purpose

Create and reset staging-only demo participant accounts for USPS recordings without using real participant addresses.

ALP demo emails (existing):

1. `iamclient1@demo.usps.example`
2. `iamclient2@demo.usps.example`
3. `iamclient3@demo.usps.example`
4. `iamclient4@demo.usps.example`
5. `iamclient5@demo.usps.example`

EF demo emails (added 2026-03-13):

1. `iamclient-ef1@demo.usps.example`
2. `iamclient-ef2@demo.usps.example`
3. `iamclient-ef3@demo.usps.example`
4. `iamclient-ef4@demo.usps.example`
5. `iamclient-ef5@demo.usps.example`

## Safety Rules

1. Use reserved `.example` domain only.
2. Keep reset scope to a dedicated demo cohort.
3. Keep `max-rows` guard at 10 unless explicitly needed.
4. Run reset with `--confirm` only when you intend to mutate data.
5. Keep staging outbound email controls unchanged unless explicitly testing magic links.

## Demo Cohort Profiles

1. ALP demo profile
   - Organization code: `USPS`
   - Program code: `ALP`
   - Cohort code: `USPS-DEMO-RECORDING-2026-03`
   - Email prefix: `iamclient`
2. EF demo profile
   - Organization code: `USPS`
   - Program code: `EF`
   - Cohort code: `USPS-DEMO-EF-RECORDING-2026-03`
   - Email prefix: `iamclient-ef`

## Seed Demo Accounts

Dry run first:

```bash
npm run data:seed:staging:demo -- --env-file .env.local --program-code EF --cohort-code USPS-DEMO-EF-RECORDING-2026-03 --email-prefix iamclient-ef --count 5
```

Apply:

```bash
npm run data:seed:staging:demo -- --env-file .env.local --apply --program-code EF --cohort-code USPS-DEMO-EF-RECORDING-2026-03 --email-prefix iamclient-ef --count 5
```

Expected result:

1. Dedicated demo cohort exists and has open selection window.
2. 5 participant rows exist for the selected profile prefix (`iamclient*` for ALP, `iamclient-ef*` for EF).
3. Each participant has an engagement.

## Reset Demo Accounts Between Recording Takes

Dry run:

```bash
npm run data:reset:staging:demo -- --env-file .env.local --cohort-code USPS-DEMO-EF-RECORDING-2026-03
```

Apply reset:

```bash
npm run data:reset:staging:demo -- --env-file .env.local --cohort-code USPS-DEMO-EF-RECORDING-2026-03 --apply --confirm
```

Reset behavior:

1. Locks target cohort engagements.
2. Acquires advisory locks for affected coaches.
3. Deletes sessions and needs-attention flags tied to those demo engagements.
4. Resets engagements to `INVITED` with no coach selected.

## Optional Overrides

Seed overrides:

```bash
npm run data:seed:staging:demo -- \
  --env-file .env.local \
  --apply \
  --program-code EF \
  --cohort-code USPS-DEMO-EF-RECORDING-2026-03 \
  --count 5 \
  --email-prefix iamclient-ef \
  --email-domain demo.usps.example
```

Reset overrides:

```bash
npm run data:reset:staging:demo -- \
  --env-file .env.local \
  --cohort-code USPS-DEMO-EF-RECORDING-2026-03 \
  --max-rows 10 \
  --apply \
  --confirm
```
