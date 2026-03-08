# Production Launch QA Strategy — Brainstorm

**Date:** 2026-02-27
**Author:** Amit Bhatia
**Go-live target:** March 2, 2026
**Status:** Ready to plan

---

## Context

The FC production Supabase database is created and seeded (175 participants, 14 cohorts, 32 coach memberships, all engagements in `INVITED` status). Admin/coach users, booking URLs, and participant invitation links are all configured. Two items remain before invitations go out:

1. Set production environment variables in Vercel
2. Merge the preview branch (`fix/test-endpoint-guard-and-access-code-hashing`) → `main`

The problem: participant invitation links go out **on March 2nd**, the same day as go-live. We need to verify the full production infrastructure *before* real participants hit it — but using live production data risks permanently selecting a coach for a real participant.

---

## The Core Tension

| Risk | Description |
|---|---|
| **Data pollution** | Running a real coach selection marks a participant as `COACH_SELECTED` permanently (one-way gate in MVP) |
| **Reporting skew** | Adding fake test accounts inflates engagement counts in the admin dashboard |
| **Infrastructure gap** | Skipping production testing means any env var misconfiguration surfaces when real participants arrive |

---

## Decision: Approach A — Temporary Test Participant + SQL Reset

### Why this approach

Full DB access (Supabase SQL editor) makes cleanup trivial. The participant flow requires **no email delivery** — it's a DB email lookup, not a magic link — so testing is self-contained. The brief window between "merge to main" and "invitations sent on March 2nd" is the right moment to run this.

### What we're NOT doing

- **Not using a permanent test cohort** — would require a schema change and is overkill for a one-time pre-launch check
- **Not skipping the selection step** — infrastructure-only verification leaves the write path (advisory lock, capacity logic, status transition) untested
- **Not using an email alias** — Amit's actual email is simplest; there's no ambiguity about which inbox to check

---

## Pre-Launch Sequence

### Phase 1: Infrastructure Setup (Do first, before any testing)

**1.1 Set production env vars in Vercel**

Required variables for the `main` (production) branch in Vercel:

| Variable | Value source |
|---|---|
| `DATABASE_URL` | Supabase FC-production pooler, port 6543, `?pgbouncer=true` |
| `DIRECT_URL` | Supabase FC-production direct, port 5432 |
| `AUTH_SECRET` | Production-unique secret (not shared with staging) |
| `CRON_SECRET` | Production-unique secret |
| `RESEND_API_KEY` | Live key |
| `EMAIL_OUTBOUND_ENABLED` | `true` |
| `EMAIL_MODE` | `live` |
| `NEXT_PUBLIC_APP_ENV` | `production` |
| `TEST_ENDPOINTS_ENABLED` | `false` |
| `NUDGE_CRON_ENABLED` | `true` (required by validation script; safe — no Vercel cron schedule configured, endpoint will not auto-fire) |

Verify against `.env.production.example` for full parity.

**1.2 Merge preview branch to main**

```bash
# On GitHub: open a PR from fix/test-endpoint-guard-and-access-code-hashing → main
# Vercel will auto-deploy to production on merge
```

Wait for Vercel production deployment to succeed before proceeding.

---

### Phase 2: Test Participant Smoke Test

**2.1 Insert test participant in production DB**

Use Supabase SQL editor on the FC-production project. Pick any of the 14 existing cohorts (e.g., the first MLP cohort). Insert a minimal participant + engagement record:

```sql
-- Step 1: Find a cohort and organization to attach to
SELECT id, name, "programId", "organizationId"
FROM "Cohort"
LIMIT 5;

-- Step 2: Insert test participant
INSERT INTO "Participant" (id, email, "cohortId", "organizationId", "createdAt", "updatedAt")
VALUES (
  'test-amit-participant-01',
  'amit@youremail.com',   -- replace with actual email
  '<cohort-id-from-step-1>',
  '<org-id-from-step-1>',
  NOW(),
  NOW()
);

-- Step 3: Insert engagement for test participant
INSERT INTO "Engagement" (
  id, "participantId", status, "totalSessions", "statusVersion",
  "programId", "cohortId", "organizationId", "createdAt", "updatedAt"
)
SELECT
  'test-amit-engagement-01',
  'test-amit-participant-01',
  'INVITED',
  5,  -- or 2, depending on the program track
  1,
  p."programId",
  p."cohortId",
  p."organizationId",
  NOW(),
  NOW()
FROM "Participant" p
WHERE p.id = 'test-amit-participant-01';
```

**2.2 Run the full participant flow**

1. Navigate to the production URL (confirm the real Vercel production domain before testing)
2. Enter Amit's email → should be recognized, cookie set, redirect to `/participant/select-coach`
3. Browse all 3 coach cards → verify photos, bios, credentials load correctly
4. Test "See Different Coaches" shuffle → verify a new set of 3 coaches appears, button disables after one use
5. Select a coach → go through confirmation dialog → confirm
6. Verify confirmation page shows: coach name, booking URL button, fallback outreach message
7. Open booking URL in new tab → verify it opens the correct coach's scheduling page

---

### Phase 3: Reset Test Data

Run this in Supabase SQL editor immediately after confirming the flow works. Delete is cleaner than resetting — no test record lingers in the DB:

```sql
-- Delete test records (run in this order — engagement first, then participant)
DELETE FROM "Engagement" WHERE id = 'test-amit-engagement-01';
DELETE FROM "Participant" WHERE id = 'test-amit-participant-01';
```

**Verify the reset worked:**

```sql
-- Should return 175 rows all with status = 'INVITED'
SELECT status, COUNT(*) FROM "Engagement" GROUP BY status;
```

Expected result after reset: `INVITED: 175`. Nothing else.

---

### Phase 4: Go Live (March 2nd)

1. Confirm the Vercel production deployment is on `main` and green
2. Confirm engagement counts are clean (`175 INVITED`)
3. Send participant invitation links
4. Monitor Vercel logs and Supabase metrics for first hour of traffic

---

## What We're Not Worrying About (Deferred)

| Item | Why deferred |
|---|---|
| Admin dashboard wired to production DB | Dashboard is currently stubbed; no live data displayed to FC ops yet |
| `isTest` flag on Cohort/Participant | Overkill for one-time pre-launch check; add in post-launch sprint if needed |
| Automated e2e tests (Playwright/Cypress) | Manual smoke test is sufficient for MVP scale (175 participants) |
| Nudge email verification in production | Cron-triggered; verify in first week of operation |

---

## Open Questions

- **Who does the SQL reset?** — Amit. Should happen within 30 minutes of completing the test.
- **What if coach selection fails in production?** — Check Vercel function logs first. Most likely cause: `DATABASE_URL` missing `?pgbouncer=true` or wrong port.
- **What if the booking URL is wrong for a coach?** — Fix via direct SQL update on `CoachProfile.meetingBookingUrl` — no redeploy needed.

---

## Success Criteria

- [ ] Production Vercel deployment on `main` is green
- [ ] Test participant email recognized by `/participant` entry page
- [ ] Coach cards load with photos, bios, credentials from production DB
- [ ] Coach selection completes → confirmation page shows coach + booking URL
- [ ] Post-delete: `SELECT status, COUNT(*) FROM "Engagement" GROUP BY status` → `INVITED: 175` only (duplicate of reset check above — confirms clean state)
- [ ] Post-reset: `SELECT status, COUNT(*) FROM "Engagement" GROUP BY status` returns `INVITED: 175` only
