---
title: Production Launch & Smoke Test — March 2, 2026
type: chore
date: 2026-02-27
---

# Production Launch & Smoke Test

## Overview

Three items remain before participant invitations go out on March 2nd:

1. Set production environment variables in Vercel (`main` branch)
2. Confirm Resend sender-domain readiness for upcoming magic-link delivery
3. Merge preview branch → `main`

After merging, run a full end-to-end participant flow in production using a temporary test participant record. Reset the data before invitations go out.

**Constraint:** No schema/API changes. DB access is via Supabase SQL editor. All participants receive invitation links on March 2nd — there is no buffer window after go-live.

---

## Phase 1: Set Production Env Vars in Vercel

**Where:** Vercel dashboard → `fc-production` project → Settings → Environment Variables → `main` branch

All 19 required variables (from `.env.production.example`):

| Variable | Expected Value |
|---|---|
| `NEXT_PUBLIC_APP_ENV` | `production` |
| `NEXT_PUBLIC_SITE_URL` | The production Vercel URL (confirm exact domain) |
| `DATABASE_URL` | Supabase FC-production pooler — port **6543** — must include `?pgbouncer=true` |
| `DIRECT_URL` | Supabase FC-production direct — port **5432** — no pgbouncer flag |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://[project-ref].supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | FC-production anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | FC-production service role key |
| `AUTH_SECRET` | Production-unique secret (not shared with staging) |
| `MAGIC_LINK_TTL_MINUTES` | `30` |
| `RESEND_API_KEY` | Live Resend key |
| `EMAIL_FROM` | Verified sender address (preferred on `onusleadership.com`, or approved fallback domain) |
| `EMAIL_MODE` | `live` |
| `EMAIL_ALLOWLIST` | *(empty)* |
| `EMAIL_OUTBOUND_ENABLED` | `true` |
| `NUDGE_CRON_ENABLED` | `true` — required by validation script. Safe: no `vercel.json` cron schedule exists, so the nudge endpoint will never fire automatically. |
| `CRON_SECRET` | Production-unique secret |
| `LOG_REDACTION_ENABLED` | `true` |
| `TEST_ENDPOINTS_ENABLED` | `false` |
| `TEST_ENDPOINTS_SECRET` | *(empty)* |

**After setting env vars — validate before merging:**

```bash
# Validate production env template passes all rules
npm run env:validate:production
```

Must pass with no errors. Common failure: `DATABASE_URL` missing `?pgbouncer=true` on port 6543.

---

## Phase 1.2: Resend Sender-Domain Readiness (Required Before Slice 2)

Even though participant invites are USPS-owned, admin/coach login depends on magic-link email delivery.

- [ ] Resend sending domain is verified
- [ ] SPF and DKIM records are published and verified
- [ ] `EMAIL_FROM` exactly matches a verified sender/domain
- [ ] Send one controlled test magic link and confirm inbox delivery

**Fast-fail rule:** If domain verification or sender alignment is incomplete, do not mark launch readiness complete.

---

## Phase 2: Merge Preview Branch → Main

```bash
# On GitHub: open a PR
# From: fix/test-endpoint-guard-and-access-code-hashing
# Into: main
```

The pre-push hook runs `npm run build` automatically. Wait for Vercel to show a green production deployment before continuing.

**Verify deployment:**
- Vercel dashboard shows `main` branch deployed to production
- No build errors in the deployment log
- Production URL loads without a blank screen

---

## Phase 3: Insert Test Participant

Use the **Supabase SQL editor** on the FC-production project.

**Step 1: Find a cohort to attach to**

```sql
SELECT
  c.id          AS cohort_id,
  c.name        AS cohort_name,
  c."programId" AS program_id,
  c."organizationId" AS org_id,
  p.name        AS program_name,
  p."trackType" AS track_type
FROM "Cohort" c
JOIN "Program" p ON c."programId" = p.id
ORDER BY c.name
LIMIT 10;
```

Note the `cohort_id`, `program_id`, `org_id`, and `track_type` for any MLP or ALP cohort.

**Step 2: Insert test participant**

```sql
INSERT INTO "Participant" (
  id, email, "organizationId", "cohortId", "createdAt", "updatedAt"
)
VALUES (
  'test-participant-amit-prod',
  'REPLACE_WITH_AMITS_ACTUAL_EMAIL',
  'REPLACE_WITH_ORG_ID',
  'REPLACE_WITH_COHORT_ID',
  NOW(),
  NOW()
);
```

**Step 3: Insert engagement**

```sql
-- totalSessions: use 5 for FIVE_SESSION track, 2 for TWO_SESSION
INSERT INTO "Engagement" (
  id,
  "organizationId",
  "participantId",
  "programId",
  "cohortId",
  status,
  "statusVersion",
  "totalSessions",
  "createdAt",
  "updatedAt"
)
VALUES (
  'test-engagement-amit-prod',
  'REPLACE_WITH_ORG_ID',
  'test-participant-amit-prod',
  'REPLACE_WITH_PROGRAM_ID',
  'REPLACE_WITH_COHORT_ID',
  'INVITED',
  1,
  5,
  NOW(),
  NOW()
);
```

**Verify insert:**

```sql
SELECT p.email, e.status, e."totalSessions"
FROM "Participant" p
JOIN "Engagement" e ON e."participantId" = p.id
WHERE p.id = 'test-participant-amit-prod';
```

Expected: `status = INVITED`, `totalSessions = 5`.

---

## Phase 4: Run Full Participant Flow

Navigate to the production URL (confirm the real Vercel production domain before testing).

**Checklist:**

- [ ] Enter Amit's email on `/participant` → recognized, redirect to `/participant/select-coach`
- [ ] Verify program label "USPS Leadership Coaching Program" appears above the headline
- [ ] Coach cards load with photos, bios, credentials, and years experience
- [ ] Test "See Different Coaches" shuffle → new set of 3 coaches appears, button disables after use
- [ ] Select a coach → confirmation dialog appears with coach name and final warning
- [ ] Confirm selection → redirect to `/participant/confirmation`
- [ ] Confirmation page shows: coach card (photo, name, credentials), booking URL button, fallback outreach message
- [ ] "Book your first session" button opens the coach's scheduling page in a new tab

---

## Phase 5: Delete Test Data

Run immediately after confirming the flow works. Do not leave test records in production.

```sql
-- Delete in this order (engagement first, then participant)
DELETE FROM "Engagement" WHERE id = 'test-engagement-amit-prod';
DELETE FROM "Participant" WHERE id = 'test-participant-amit-prod';
```

**Verify the baseline is clean:**

```sql
SELECT status, COUNT(*) AS count
FROM "Engagement"
GROUP BY status
ORDER BY status;
```

Expected result: one row — `INVITED | 175`. Nothing else.

---

## Phase 6: Go Live (March 2nd)

- [ ] Vercel production deployment is on `main` and green
- [ ] Engagement baseline verified: `INVITED: 175`
- [ ] All Phase 4 checks passed
- [ ] Resend sender-domain readiness checklist is complete
- [ ] Send participant invitation links

**First-hour monitoring:**
- Watch Vercel function logs for any `500` errors
- Watch Supabase metrics for connection spike or failed queries
- Most likely failure: `DATABASE_URL` connection issue → check Supabase pooler settings

---

## Acceptance Criteria

- [ ] `npm run env:validate:production` passes with no errors
- [ ] Vercel production deployment on `main` is green
- [ ] Test participant email recognized on entry page
- [ ] Coach cards load from production DB (not stub data)
- [ ] Coach selection completes end-to-end → confirmation page correct
- [ ] Post-delete: `SELECT status, COUNT(*) FROM "Engagement" GROUP BY status` → `INVITED: 175` only

---

## References

- Brainstorm: `docs/brainstorms/2026-02-27-production-launch-qa-strategy-brainstorm.md`
- Env runbook: `docs/plans/2026-02-22-environment-split-execution-runbook.md`
- Env template: `.env.production.example`
- Validation script: `scripts/validate-env-safety.mjs`
- Schema: `prisma/schema.prisma` (Participant L158–176, Engagement L285–312)
