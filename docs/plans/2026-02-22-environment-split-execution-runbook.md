# Environment Split Execution Runbook (Staging + Production)

**Date:** 2026-02-22  
**Scope:** Vercel + Supabase separation, env scoping, email safety gates

## Goal

Create and verify fully isolated staging and production environments for the FranklinCovey MVP:

1. `fc-staging` and `fc-production` in Vercel
2. `fc-staging` and `fc-production` in Supabase
3. Strict environment-scoped secrets
4. Staging email sandbox + allowlist safety gate

## Step 0: Local Prep (Complete)

Templates and validators added in repo:

1. `.env.example`
2. `.env.staging.example`
3. `.env.production.example`
4. `scripts/validate-env-safety.mjs`

Validation commands:

```bash
npm run env:validate:staging
npm run env:validate:production
```

## Step 1: Create Vercel Projects

Create two separate projects in Vercel:

1. `fc-staging`
2. `fc-production`

Required settings:

1. Ensure they are distinct projects, not shared environments in one project.
2. Disable any shared secret copy-paste between projects.
3. Set production branch:
   - `fc-staging`: staging branch (for example `feat/phase-0-backend` while buildout is active)
   - `fc-production`: `main` (or your release branch)

## Step 2: Create Supabase Projects

Create two separate Supabase projects:

1. `fc-staging`
2. `fc-production`

Required settings:

1. Separate DBs and auth instances.
2. Distinct anon and service role keys.
3. No cross-environment key reuse.

## Step 3: Configure Environment Variables in Vercel

Use values from:

1. `.env.staging.example` for `fc-staging`
2. `.env.production.example` for `fc-production`

Minimum required keys:

1. `NEXT_PUBLIC_APP_ENV`
2. `NEXT_PUBLIC_SITE_URL`
3. `DATABASE_URL`
4. `NEXT_PUBLIC_SUPABASE_URL`
5. `NEXT_PUBLIC_SUPABASE_ANON_KEY`
6. `SUPABASE_SERVICE_ROLE_KEY`
7. `AUTH_SECRET`
8. `RESEND_API_KEY`
9. `EMAIL_FROM`
10. `EMAIL_MODE`
11. `EMAIL_ALLOWLIST`
12. `NUDGE_CRON_ENABLED`
13. `CRON_SECRET`
14. `LOG_REDACTION_ENABLED`

## Step 4: Enforce Staging Safety Gates

For `fc-staging`, confirm:

1. `NEXT_PUBLIC_APP_ENV=staging`
2. `EMAIL_MODE=sandbox`
3. `EMAIL_ALLOWLIST` is non-empty
4. `NUDGE_CRON_ENABLED=false`
5. `LOG_REDACTION_ENABLED=true`

Proof test:

1. Trigger a staging OTP flow with one allowlisted inbox.
2. Attempt a non-allowlisted recipient path and verify it is blocked.
3. Capture screenshots/log snippets for evidence.

## Step 5: Supabase Connection Verification

Deploy one commit to each Vercel project and verify runtime target:

1. `fc-staging` points only to staging Supabase URL/key set.
2. `fc-production` points only to production Supabase URL/key set.

Basic checks:

1. Auth writes appear only in matching Supabase project.
2. No records appear in the opposite environment.

## Step 6: Deployment Behavior Check

1. Push a non-breaking commit to staging branch and confirm only `fc-staging` deploy updates.
2. Push/tag release commit to production branch and confirm only `fc-production` updates.

## Step 7: Evidence to Record (for checklist + VSA)

Collect and store:

1. Vercel project screenshots (`fc-staging`, `fc-production`)
2. Supabase project screenshots (`fc-staging`, `fc-production`)
3. Redacted env var listing per project
4. Staging email safety gate proof
5. One-paragraph summary of isolation verification

## Step 8: Checklist Sync Update

After completion, update:

1. `google-sheets/blockers.md`:
   - `Vercel environment split` -> `Done`
   - `Supabase environment split` -> `Done`
   - `Staging email safety gate` -> `Done`
2. `google-sheets/timeline.md`:
   - `Environment isolation setup` -> `Complete`
   - `Staging email safety gates` -> `Complete`

## Fast Failure Rules

Stop and fix immediately if any of these happen:

1. Same Supabase URL/key appears in both Vercel projects.
2. Staging `EMAIL_MODE` is not `sandbox`.
3. Staging `EMAIL_ALLOWLIST` is empty.
4. `NUDGE_CRON_ENABLED` is true in staging.
5. Any production env key is copied into staging.
