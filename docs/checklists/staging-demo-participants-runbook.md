---
title: Staging Demo Participants Runbook
date: 2026-03-02
type: checklist
---

# Staging Demo Participants Runbook

## Purpose

Create and reset 5 staging-only demo participant accounts for USPS recordings without using real participant addresses.

Default demo emails:

1. `iamclient1@demo.usps.example`
2. `iamclient2@demo.usps.example`
3. `iamclient3@demo.usps.example`
4. `iamclient4@demo.usps.example`
5. `iamclient5@demo.usps.example`

## Safety Rules

1. Use reserved `.example` domain only.
2. Keep reset scope to a dedicated demo cohort.
3. Keep `max-rows` guard at 10 unless explicitly needed.
4. Run reset with `--confirm` only when you intend to mutate data.
5. Keep staging outbound email controls unchanged unless explicitly testing magic links.

## Demo Cohort Defaults

1. Organization code: `USPS`
2. Program code: `ALP`
3. Cohort code: `USPS-DEMO-RECORDING-2026-03`

## Seed Demo Accounts

Dry run first:

```bash
npm run data:seed:staging:demo -- --env-file .env.local
```

Apply:

```bash
npm run data:seed:staging:demo -- --env-file .env.local --apply
```

Expected result:

1. Dedicated demo cohort exists and has open selection window.
2. 5 participant rows exist for `iamclient1-5@demo.usps.example`.
3. Each participant has an engagement.

## Reset Demo Accounts Between Recording Takes

Dry run:

```bash
npm run data:reset:staging:demo -- --env-file .env.local
```

Apply reset:

```bash
npm run data:reset:staging:demo -- --env-file .env.local --apply --confirm
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
  --program-code ALP \
  --cohort-code USPS-DEMO-RECORDING-2026-03 \
  --count 5 \
  --email-prefix iamclient \
  --email-domain demo.usps.example
```

Reset overrides:

```bash
npm run data:reset:staging:demo -- \
  --env-file .env.local \
  --cohort-code USPS-DEMO-RECORDING-2026-03 \
  --max-rows 10 \
  --apply \
  --confirm
```
