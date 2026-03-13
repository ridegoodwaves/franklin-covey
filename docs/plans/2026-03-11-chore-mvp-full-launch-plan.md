---
title: MVP Full Launch — Pre/Post Checklist & Code Gaps
type: chore
date: 2026-03-11
deadline: 2026-03-15 (deploy before EF-1 opens March 16)
deepened: 2026-03-12
---

# MVP Full Launch — Pre/Post Checklist & Code Gaps

## Enhancement Summary

**Deepened on:** 2026-03-12
**Research agents used:** 8 (deployment verification, security sentinel, data migration expert, spec flow analyzer, best practices researcher, git history analyzer, architecture strategist, performance oracle)

### Key Improvements
1. **BLOCKER discovered:** Seed script engagement upsert unconditionally resets `status: "INVITED"` on re-run — would corrupt active engagements in production (new Gap 6)
2. **Potential P0:** Email case normalization — if seed stores mixed-case emails, participants with uppercase chars get `UNRECOGNIZED_EMAIL` (new Gap 7)
3. **Performance win:** Coach photo signed URL overhead adds 300-900ms per request — switch headshots bucket to public mode (new Gap 8)
4. **Security headers:** Missing HSTS and Permissions-Policy headers (5-min fix each)
5. **Allowlist clarification:** EMAIL_ALLOWLIST is NOT needed in production — the DB lookup in magic-link request IS the allowlist. Coaches use personal emails, so domain-based restriction wouldn't work either.
6. **Branch sync:** pre-main-priority-branch has 9 unique doc files that need syncing before deletion; all code is already in PR #21
7. **Manual match safety:** Runbook SQL must increment `statusVersion` to prevent race with in-app selection
8. **EF-1 date gap:** `coachSelectionEnd` is a fabricated 19-day fallback — needs stakeholder confirmation

### New Considerations Discovered
- Seed script lacks environment safeguards (no --target flag, no confirmation prompt, no transaction wrapping)
- No structured error tracking or alerting for launch day monitoring
- Lona Miller removal must follow FK deletion order: NeedsAttentionFlag → Session → Engagement → Participant
- In-memory IP rate limiter resets on Vercel cold starts (mitigated by DB-backed rate limiter)
- Credential rotation needed: `.env.local` contains live staging credentials on disk

---

## Overview

PR #21 merges all 3 slices (participant flow, admin dashboard, coach portal) to main. This plan covers:

1. **Code gaps** that must be fixed before launch (discovered during spec flow analysis)
2. **4-phase launch checklist** (technical → operations → launch day → post-launch)
3. **Data operations** (new cohorts ALP-136, EF-1; roster update MLP-80)

**Cohort schedule:**
- ALP-136: selection opens immediately after launch
- EF-1: selection opens March 16
- EL-1: selection opens March 30 (not in this launch)

**Stakeholders:** Kari Sadler, Andrea, Greg, Tim

---

## Critical Code Gaps (Must Fix Before Launch)

Spec flow analysis identified 3 critical gaps and 2 important gaps that need code changes.

### Gap 1: `coachSelectionStart` Not Enforced (CRITICAL)

**Problem:** The code only checks `coachSelectionEnd < now` (window closed). There is NO check for `coachSelectionStart > now` (window not yet open). EF-1 participants could select coaches before March 16.

**Enforcement point:** Check at `verify-email` (not coaches GET). This is the earliest gate — prevents session creation entirely for early participants.

**Files to change:**
- `src/lib/server/participant-coach-service.ts` — `lookupParticipantForEmailAuth()`: add `coachSelectionStart <= now` to the cohort lookup query, return `WINDOW_NOT_OPEN` with `openDate`
- `src/lib/api-client.ts` — add `WINDOW_NOT_OPEN` error code AND add `openDate?: string` to the `VerifyEmailResponse` type (currently missing)
- `src/app/participant/page.tsx` — handle `WINDOW_NOT_OPEN` with date-specific message: "Coach selection for your cohort opens on [date]. Please return then." (Add a new `case "WINDOW_NOT_OPEN"` branch; the current `default` shows a generic "Something went wrong")

**Test:**
- Unit test: verify `WINDOW_NOT_OPEN` returned when `coachSelectionStart` is in the future
- Smoke test: EF-1 participant before March 16 → sees "not yet open" message with date

**Acceptance criteria:**
- [x] `verify-email` rejects participants whose cohort `coachSelectionStart > now`
- [x] Error response includes `openDate` field for client display
- [x] Participant sees friendly message with the opening date
- [x] Existing `WINDOW_CLOSED` behavior unchanged

#### Research Insights

**Spec flow analysis:** The current `lookupParticipantForEmailAuth` at line 183 finds any cohort with `coachSelectionEnd >= now` — crucially does NOT check `coachSelectionStart <= now`. An EF-1 participant with `coachSelectionStart = March 16` but `coachSelectionEnd = April 30` passes this check on March 15.

**Edge case — deploy timing:** Gap 1 MUST be deployed before EF-1 data is imported. Without it, EF-1 participants could select coaches immediately after data import on March 15. The critical path correctly shows Tasks 1-2 before Task 6.

---

### Gap 2: EF/EL Interview Info Card Not Implemented (CRITICAL)

**Problem:** The coach selector page has no program awareness. It cannot conditionally show the interview message for EF/EL cohorts. Plan exists at `docs/plans/2026-03-09-feat-ef-el-interview-info-card-plan.md` but is not implemented.

**Files to change (per existing plan):**
- `src/app/api/participant/coaches/route.ts` — include `programCode` in response
- `src/app/participant/select-coach/page.tsx` — render interview info card when `programCode` is `EF` or `EL`
- New component: `src/components/participant/InterviewInfoCard.tsx`

**Message text (client-approved 2026-03-11):**
> "If you would like to conduct 30-minute chemistry interviews with any of the coaches prior to selection, please reach out to andrea.sherman@franklincovey.com"

**Acceptance criteria:**
- [x] Info card appears ONLY for EF and EL cohort participants
- [x] Info card does NOT appear for MLP or ALP cohort participants
- [x] Andrea's email is a clickable `mailto:` link
- [x] Card styling consistent with FC design system

---

### Gap 3: Resend Domain Verification (CRITICAL — Non-Code)

**Problem:** Magic links are the ONLY auth mechanism for coaches and admins. If the production sending domain is not verified in Resend (SPF, DKIM, DMARC), emails will fail or land in spam.

**Verification steps:**
- [ ] Log into Resend production account
- [ ] Confirm sending domain matches `EMAIL_FROM` value (`coaching@coachinginnovationlab.com`)
- [ ] Verify SPF record exists for the domain
- [ ] Verify DKIM record exists for the domain
- [ ] Verify DMARC record is configured
- [ ] Send a test magic link to a real email address and confirm delivery (not spam)

#### Research Insights

**Resend-specific:** Resend restricts WHERE you can send FROM (domain verification) but NOT WHO you can send TO. Your application-level guards (DB lookup, rate limiter, email guard) are the only layer controlling recipient authorization. Consider creating a domain-scoped API key for production (sends only from your verified domain — prevents key misuse).

**Best practice:** Add `Referrer-Policy: no-referrer` on the magic link consume redirect response to prevent leaking the token URL via browser Referer headers. The one-time-use enforcement via `AuditEvent` token-hash tracking is solid.

---

### Gap 4: Manual Match Process for EF/EL Interviews (IMPORTANT)

**Problem:** No defined process for when Andrea reports interview-based coach selections. Risk of conflict if participant also uses in-app selector.

**Solution:** Create a runbook at `docs/checklists/manual-match-runbook.md` with:
- SQL template to set `engagement.status = COACH_SELECTED`, assign coach, set timestamp
- The status change blocks the in-app selector (participant sees confirmation page, not selector)
- Validation query to confirm match was applied correctly
- Andrea reports matches via email → dev runs script → confirms back to Andrea

**Acceptance criteria:**
- [x] Runbook documented with exact SQL/Prisma commands
- [ ] Process tested on staging with a test participant

#### Research Insights — CRITICAL Safety Requirements

**The manual match SQL MUST increment `statusVersion`** to prevent a race condition. Without it, the `transitionEngagement` optimistic locking is bypassed, and a participant's concurrent in-app selection could overwrite Andrea's match.

**Required SQL fields:**
```sql
UPDATE "Engagement"
SET status = 'COACH_SELECTED',
    "organizationCoachId" = '<matched_coach_org_coach_id>',
    "coachSelectedAt" = NOW(),
    "lastActivityAt" = NOW(),
    "statusVersion" = "statusVersion" + 1  -- CRITICAL: enables race detection
WHERE "participantId" = '<participant_id>'
  AND status = 'INVITED';  -- Pre-check: only match if still INVITED
```

**Pre-check before applying:** Query current engagement status. If already `COACH_SELECTED` or later, abort and notify Andrea the participant already selected in-app.

**Cross-flow interaction:** There is no mechanism to "lock" the in-app selector while an interview is in progress. If a participant emails Andrea AND self-selects in-app, the in-app selection is authoritative. The runbook must instruct the operator to check status before applying.

---

### Gap 5: Returning Participant Confirmation Page (IMPORTANT)

**Problem:** Returning participants (new browser session) hit the confirmation page without `selected-coach` in sessionStorage. The page likely shows blank/broken content because the confirmation page reads coach data from sessionStorage only.

**Action:** Verify on staging immediately. If broken (expected), add a server-fetch fallback:
- [ ] Test: Participant A selects coach → close browser entirely → reopen → navigate to `/participant` → enter same email → should redirect to confirmation with correct coach data
- [ ] If broken: confirmation page fetches coach data from server when sessionStorage is empty but `verify-email` returned `alreadySelected: true`. The `verify-email` response should include `selectedCoach` data for this case.

#### Research Insights

**Architecture review:** The confirmation page actually has a partial fallback at lines 110-116 — when `?already=true` is set but no sessionStorage data exists, it shows "You've already selected a coach. Your coach will reach out within 72 hours." This is degraded but NOT broken. No coach name, photo, or booking link displayed.

**Recommendation:** Extend the `verify-email` response to include selected coach card data when `alreadySelected: true`. This avoids creating a new API endpoint and follows the existing pattern. Priority is P1 (UX quality, not functionality).

---

### Gap 6: Seed Script Engagement Status Overwrite (BLOCKER — NEW)

**Problem:** The engagement upsert in `scripts/seed-staging-from-artifacts.mjs` (lines 288-305) unconditionally sets `status: "INVITED"` in the `update` clause. If the seed script is re-run against a database where participants have already selected coaches, their engagement status is corrupted from `COACH_SELECTED` back to `INVITED`.

**Blast radius:** All 175+ existing participants in staging/production who have selected coaches. MLP-80 and ALP-135 have been live since March 2.

**Fix:**
```javascript
// BEFORE (DANGEROUS)
update: {
  organizationId,
  programId: cohort.programId,
  cohortId: cohort.id,
  totalSessions: cohort.program.defaultSessions,
  status: "INVITED",  // <-- OVERWRITES LIVE STATUS
},

// AFTER (SAFE)
update: {
  organizationId,
  programId: cohort.programId,
  cohortId: cohort.id,
  // Do NOT reset status or totalSessions on existing engagements
},
```

**Acceptance criteria:**
- [x] `status` removed from the engagement upsert `update` clause
- [x] `totalSessions` also removed from `update` clause (could overwrite if forfeited sessions changed effective count)
- [ ] Script tested: re-run on staging does NOT change existing engagement statuses

---

### Gap 7: Email Case Normalization in Seed Data (POTENTIAL P0 — NEW)

**Problem:** The auth query in `lookupParticipantForEmailAuth` normalizes email to lowercase via `normalizeParticipantEmail()`. If the seed script stores emails in mixed case from the roster CSV, the exact-match Prisma query would fail. Government emails often have uppercase characters (e.g., `John.Doe@USPS.gov`).

**Verification:**
```sql
-- Run on staging immediately
SELECT email FROM "Participant" WHERE email != LOWER(email);
-- If any rows return, this is a P0 bug
```

**Fix (if needed):** Add `.toLowerCase().trim()` to the email normalization in the seed script before insertion.

**Acceptance criteria:**
- [ ] Query returns 0 rows on staging
- [ ] If rows found: seed script updated to normalize emails on insert

---

### Gap 8: Coach Photo Signed URL Performance (P1 — NEW)

**Problem:** `resolveCoachPhotoUrl` makes sequential HTTP calls to Supabase Storage to generate signed URLs. For 3 coaches, this adds 300-900ms latency. On EF-1 opening day, 30 simultaneous users would generate 90 signing requests.

**Fix options (choose one):**
1. **Switch headshots bucket to public mode** — Coach photos are not sensitive. Set `SUPABASE_HEADSHOTS_BUCKET_MODE=public`. Eliminates all signing overhead, returns instant CDN URLs. (15 min, highest impact)
2. **Add in-memory signed URL cache** — Cache key = photoPath, TTL = signedUrlTTL - 300s buffer. (30 min)

**Acceptance criteria:**
- [ ] Coach listing API responds in < 200ms (excluding DB query time)
- [ ] Photos load correctly on participant selector

---

## Phase 0: Pre-Launch Blockers (Must Complete Before Phase 1)

> These items were discovered by the research agents and are prerequisites for the existing Phase 1 work.

### Seed Script Safety Hardening
- [x] **Fix Gap 6:** Remove `status: "INVITED"` and `totalSessions` from engagement upsert `update` clause
- [ ] **Verify Gap 7:** Run email case normalization query on staging; fix seed script if needed
- [ ] Add environment safety gate to seed script: echo database host, require `--target` flag, add confirmation prompt for production
- [ ] Wrap seed operations in `prisma.$transaction()` with 60s timeout for atomic rollback on failure

### Security Headers (5 minutes each)
- [ ] Add HSTS header to `next.config.ts`: `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- [ ] Add Permissions-Policy header: `camera=(), microphone=(), geolocation=(), payment=()`

### Credential Rotation
- [ ] Rotate staging database password in Supabase (exposed in `.env.local` on disk)
- [ ] Rotate staging Resend API key
- [ ] Generate new staging AUTH_SECRET
- [ ] Verify `.env.local` was never committed: `git log --all -p -- '.env.local' '.env'`

### Branch Doc Sync (pre-main-priority-branch)
- [ ] Cherry-pick or copy 9 unique doc files from `pre-main-priority-branch` to main:
  - `docs/brainstorms/2026-02-27-admin-dashboard-scope-brainstorm.md`
  - `docs/brainstorms/2026-02-27-production-launch-qa-strategy-brainstorm.md`
  - `docs/brainstorms/2026-02-27-testing-strategy-brainstorm.md`
  - `docs/brainstorms/2026-02-28-wistia-coach-intro-videos-brainstorm.md`
  - `docs/brainstorms/2026-03-03-worktree-doc-sync-brainstorm.md`
  - `docs/plans/2026-02-27-chore-production-launch-and-smoke-test-plan.md`
  - `docs/plans/2026-02-28-feat-wistia-coach-intro-videos-plan.md`
  - `docs/solutions/security-issues/nextjs-app-router-csp-client-navigation-blocks-third-party-resources.md`
  - `docs/solutions/security-issues/participant-session-storage-carryover.md`
- [ ] Review diffs for 5 docs that exist on both branches (checklists, plans, README, CLAUDE.md)
- [ ] Copy `WHERE_AM_I.md` (exists only on branch)
- [ ] All CODE changes from the branch are already in PR #21 — no code sync needed
- [ ] After PR #21 merges: delete `pre-main-priority-branch` (local + remote)

### Email Allowlist — RESOLVED (No Action Needed)

**Finding:** The `EMAIL_ALLOWLIST` env var is only used in staging sandbox mode (`guard.ts:74-88`). In production with `EMAIL_MODE=live`, all recipients are allowed without allowlist check. This is correct because:
- The DB lookup in `magic-link/request/route.ts` (lines 99-108) already validates recipients exist as active ADMIN/COACH users — this IS the production allowlist
- Coaches use personal emails (not `@franklincovey.com`), so domain-based restriction would lock them out
- The `verify-email` endpoint never sends outbound email at all
- An env-var allowlist would create sync drift with the database

**No changes needed.** The database lookup IS the allowlist.

### Stakeholder Confirmation Required
- [ ] **Confirm EF-1 `coachSelectionEnd` date** with Kari/Andrea — currently using a fabricated 19-day fallback (April 4). The source timeline has NO end date for EF/EL programs.
- [ ] **Verify coach pool assignments** — dual-link = EF_EL, single-link = MLP_ALP. Cross-check against Kari's actual pool roster.

---

## Phase 1: Pre-Launch Technical (March 11-14)

### Code Changes
- [x] Fix Gap 1: `coachSelectionStart` enforcement
- [x] Fix Gap 2: EF/EL interview info card implementation
- [ ] Fix Gap 5: Verify returning participant flow (fix if broken)
- [ ] Fix Gap 8: Switch headshots bucket to public mode (or add signed URL cache)
- [ ] All tests passing (`npm test` — 134+ tests)
- [ ] Production build succeeds (`npm run build`)
- [ ] PR #21 CI green

### Data Pipeline — Staging
- [ ] Confirm roster files received from FC: ALP-136, EF-1, refreshed MLP-80, refreshed ALP-135
- [ ] Place updated roster files in `fc-assets/`
- [ ] Run `npm run data:build:staging` to normalize artifacts
- [ ] Run `npm run data:seed:staging` to seed new cohort data
- [ ] Run `npm run data:backfill:bios -- --apply` if any new coaches
- [ ] Run `npm run data:backfill:photo-paths -- --apply` if any new coaches
- [ ] Verify counts:

| Cohort | Expected Participants | Coach Pool | Selection Window |
|--------|----------------------|------------|-----------------|
| ALP-136 | TBD | MLP_ALP | Opens immediately |
| EF-1 | ~30 | EF_EL | Opens March 16 |
| MLP-80 | Current minus 1 (Lona Miller removed) | MLP_ALP | Already open |
| ALP-135 | Unchanged | MLP_ALP | Already open |

- [ ] Verify `coachSelectionStart` and `coachSelectionEnd` dates set correctly for EF-1
- [ ] Verify coach panel assignments: MLP/ALP shared panel, EF/EL shared panel
- [ ] Verify all coach `maxEngagements` = 20

#### Research Insights — Post-Seed Verification Queries

```sql
-- Verify email case normalization (P0 check)
SELECT email FROM "Participant" WHERE email != LOWER(email);
-- Expected: 0 rows

-- Verify no engagement status corruption after seed
SELECT e.status, COUNT(*)
FROM "Engagement" e
WHERE e."archivedAt" IS NULL
GROUP BY e.status;
-- Expect: existing COACH_SELECTED statuses preserved

-- Verify coach pool distribution
SELECT cpm.pool, COUNT(*)
FROM "CoachPoolMembership" cpm
GROUP BY cpm.pool;
-- Expected: MLP_ALP and EF_EL pools with expected counts

-- Verify booking links exist for all active coaches
SELECT cp."displayName", cp."bookingLinkPrimary"
FROM "CoachProfile" cp
WHERE cp.active = true AND (cp."bookingLinkPrimary" IS NULL OR cp."bookingLinkPrimary" = '');
-- Expected: 0 rows
```

### Capacity Audit
- [ ] Query MLP_ALP pool: total capacity minus active engagements = remaining slots
- [ ] Confirm remaining slots >= ALP-136 participant count
- [ ] Query EF_EL pool: total capacity minus active engagements = remaining slots
- [ ] Confirm remaining slots >= EF-1 participant count (~30)
- [ ] Document capacity numbers for stakeholder communication

#### Research Insights — Capacity Verification Query

```sql
WITH coach_load AS (
  SELECT oc.id, cp."displayName", oc."maxEngagements", cpm.pool,
         COUNT(e.id) AS current_load
  FROM "OrganizationCoach" oc
  JOIN "CoachProfile" cp ON oc."coachProfileId" = cp.id
  JOIN "CoachPoolMembership" cpm ON cpm."organizationCoachId" = oc.id
  LEFT JOIN "Engagement" e ON e."organizationCoachId" = oc.id
    AND e.status IN ('COACH_SELECTED', 'IN_PROGRESS', 'ON_HOLD')
    AND e."archivedAt" IS NULL
  WHERE oc.active = true
  GROUP BY oc.id, cp."displayName", oc."maxEngagements", cpm.pool
)
SELECT pool,
       COUNT(*) AS coaches_in_pool,
       SUM("maxEngagements") AS total_pool_capacity,
       SUM(current_load) AS current_pool_load,
       SUM("maxEngagements") - SUM(current_load) AS remaining_pool_capacity
FROM coach_load
GROUP BY pool;
-- Expected: MLP_ALP remaining > ALP-136 count; EF_EL remaining > 30
```

### Lona Miller Removal — Staging (MLP-80)
Same process runs on production in Phase 3, step 6.
- [ ] Query staging DB: does Lona Miller have an engagement? What status?
- [ ] If engagement exists with `COACH_SELECTED` or `IN_PROGRESS`: cancel engagement (`status = CANCELED`)
- [ ] Verify coach capacity is freed after cancellation
- [ ] Remove participant record
- [ ] Verify MLP-80 participant count is correct
- [ ] Document the exact SQL used — reuse for production in Phase 3

#### Research Insights — FK-Safe Deletion Sequence

The schema uses `onDelete: Restrict` on `Engagement.participantId`. You cannot delete a Participant while an Engagement references it. Run inside a transaction:

```sql
BEGIN;

-- 1. Find the participant and engagement
SELECT p.id AS participant_id, e.id AS engagement_id, e.status, e."organizationCoachId"
FROM "Participant" p
LEFT JOIN "Engagement" e ON e."participantId" = p.id
WHERE p.email = 'lona.e.miller@usps.gov'
AND p."cohortId" = (
  SELECT id FROM "Cohort" WHERE code = 'MLP-80'
  AND "organizationId" = (SELECT id FROM "Organization" WHERE code = 'USPS')
);

-- 2. Log an audit event before deletion
INSERT INTO "AuditEvent" (id, "organizationId", "actorEmail", "actorRole", "eventType", "entityType", "entityId", metadata, "createdAt")
VALUES (gen_random_uuid()::text, '<org_id>', 'amit@ridegoodwaves.com', 'ADMIN', 'PARTICIPANT_REMOVED', 'Participant', '<participant_id>',
  '{"reason": "Client request - Kari Sadler", "email": "lona.e.miller@usps.gov", "cohort": "MLP-80"}'::jsonb, now());

-- 3. Delete in FK order: children first
DELETE FROM "NeedsAttentionFlag" WHERE "engagementId" = '<engagement_id>';
DELETE FROM "Session" WHERE "engagementId" = '<engagement_id>';
DELETE FROM "Engagement" WHERE id = '<engagement_id>';
DELETE FROM "Participant" WHERE id = '<participant_id>';

COMMIT;

-- 4. Verify
SELECT COUNT(*) FROM "Participant" WHERE email = 'lona.e.miller@usps.gov';
-- Expected: 0
```

**Note:** If engagement status is `INVITED`, no coach slot is freed (INVITED is excluded from capacity counts). If `COACH_SELECTED`/`IN_PROGRESS`/`ON_HOLD`, the assigned coach gains one slot immediately.

### Environment Validation — Production
- [ ] Run `npm run env:validate:production` against production env
- [ ] Verify these critical values:

| Variable | Required Value | Why |
|----------|---------------|-----|
| `DATABASE_URL` | `:6543` + `?pgbouncer=true` | PgBouncer safety |
| `DIRECT_URL` | `:5432` | Migrations need direct connection |
| `AUTH_SECRET` | Unique (≠ staging) | Session security |
| `CRON_SECRET` | Unique (≠ staging) | Cron endpoint protection |
| `EMAIL_MODE` | `live` | Production email |
| `EMAIL_OUTBOUND_ENABLED` | `true` | Magic links must send |
| `TEST_ENDPOINTS_ENABLED` | `false` | No test endpoints in production |
| `NEXT_PUBLIC_APP_ENV` | `production` | Env identification |
| `LOG_REDACTION_ENABLED` | `true` | PII protection |

- [ ] Verify Vercel function region matches Supabase region (both `us-east-1`). Set in `vercel.json`: `{ "regions": ["iad1"] }`
- [ ] Verify Gap 3: Resend domain verification (SPF, DKIM, DMARC)
- [ ] Send test magic link from production Resend to verify delivery

### Staging Smoke Tests
- [ ] Run full 9-scenario smoke test (`docs/checklists/pre-deploy-smoke-test.md`)
- [ ] Additional tests for new functionality:
  - [ ] EF-1 participant before March 16 → sees "window not yet open" message
  - [ ] EF-1 participant → sees interview info card on coach selector
  - [ ] ALP-136 participant → does NOT see interview info card
  - [ ] Coach session logging form → saves session correctly
  - [ ] Admin dashboard → KPIs reflect new cohort data
  - [ ] Admin CSV export → includes new cohort data
  - [ ] Returning MLP-80 participant → confirmation page loads with correct coach

#### Research Insights — Additional Smoke Tests Recommended

- [ ] **Email case sensitivity:** Test with a mixed-case email (e.g., `John.Doe@USPS.gov` if such exists in roster) to verify auth lookup matches
- [ ] **Concurrent selection test:** Two participants select the same coach simultaneously (verify advisory lock returns `COACH_UNAVAILABLE` for the second)
- [ ] **Coach deactivation mid-flow:** If possible, verify the select API re-checks coach active status at selection time
- [ ] **Lona Miller blocked:** After removal, verify `lona.e.miller@usps.gov` → `UNRECOGNIZED_EMAIL`

### Known-Issue Verification (from docs/solutions/)
These 3 issues were previously fixed. Verify fixes hold in current build:
- [ ] **CSP + Wistia**: Navigate `/participant` → verify email → client-side nav to `/participant/select-coach` → Wistia videos load (not just direct URL)
- [ ] **Session carryover**: Participant A completes flow → same tab → Participant B enters email → B sees coach selector (NOT A's confirmation)
- [ ] **Coach batch pinning**: Land on selector → note 3 coaches → refresh → same 3 coaches appear. Remix → refresh → same remixed coaches, button disabled

---

## Phase 2: Pre-Launch Operations (March 14-15)

### Coach Onboarding
- [ ] Prepare written guide covering: sign-in (magic link), dashboard, engagement list, session logging workflow
- [ ] Schedule live walkthrough with MLP/ALP coach panel
- [ ] Schedule live walkthrough with EF/EL coach panel (even though EF-1 opens March 16, coaches should be familiar)
- [ ] Verify all coaches have correct emails in the system (test magic link delivery to 2-3 coaches)
- [ ] Document: when to log sessions, what fields to fill, session status meanings (Completed, Forfeited)
- [ ] Document escalation path: "If you do not receive the sign-in email within 5 minutes, check your spam folder. If not there, email [support contact]."

#### Research Insights

**Mobile limitation to document:** The `beforeunload` auto-save in the session logging form does NOT fire on mobile Safari swipe-back or app switch. The 5-second debounce auto-save mitigates this, but coaches typing notes for < 5 seconds on mobile could lose them. Note this in the coach guide as a "save frequently on mobile" tip.

### Stakeholder Communication
- [ ] Email Kari Sadler: admin dashboard live, walkthrough of KPIs and engagement table, CSV export
- [ ] Email Andrea: operations visibility, manual match process for EF/EL interviews, her role as interview coordinator
- [ ] Email Greg: launch status, participant counts, timeline confirmation
- [ ] Email Tim: technical launch details, monitoring plan
- [ ] Confirm: who sends ALP-136 and EF-1 invitation links to participants? (Answer: Kari/Andrea via FC comms)
- [ ] **Critical coordination:** Kari/Andrea must NOT send invitation links until dev team confirms production data import is complete (Phase 3, step 8). Agree on a signal (Slack message, email) for "data is live, safe to send links."
- [ ] Confirm: who handles participant support questions during launch window?
- [ ] Use dual-clause clarity in all comms (lesson from Calendly incident): state both what ships AND what was deferred

### Rollback Plan
- [ ] Vercel: confirm previous deployment is preserved (instant rollback available)
- [ ] Database: PR #21 migrations are backward-compatible → code-only rollback is safe
- [ ] Rollback triggers: define what constitutes must-rollback (e.g., auth broken for all users, data corruption)
- [ ] If rollback needed: Vercel instant rollback → verify site loads → notify stakeholders

#### Research Insights — Database Rollback Procedures

```sql
-- If data corruption detected: remove new cohort data
BEGIN;
DELETE FROM "NeedsAttentionFlag" WHERE "engagementId" IN (
  SELECT e.id FROM "Engagement" e JOIN "Cohort" c ON e."cohortId" = c.id WHERE c.code = 'EF-1'
);
DELETE FROM "Session" WHERE "engagementId" IN (
  SELECT e.id FROM "Engagement" e JOIN "Cohort" c ON e."cohortId" = c.id WHERE c.code = 'EF-1'
);
DELETE FROM "Engagement" WHERE "cohortId" IN (SELECT id FROM "Cohort" WHERE code = 'EF-1');
DELETE FROM "Participant" WHERE "cohortId" IN (SELECT id FROM "Cohort" WHERE code = 'EF-1');
-- Repeat for ALP-136 if needed
COMMIT;
```

If engagement status corruption occurs (Gap 6 not fixed):
```sql
-- Targeted rollback for status-corrupted engagements
UPDATE "Engagement"
SET status = 'COACH_SELECTED', "statusVersion" = "statusVersion" + 1
WHERE "organizationCoachId" IS NOT NULL AND status = 'INVITED';
```

### Manual Match Runbook
- [x] Write `docs/checklists/manual-match-runbook.md` (Gap 4)
- [ ] Test on staging: simulate Andrea reporting a match → run script → verify engagement updated
- [ ] Share process with Andrea so she knows what to expect

---

## Phase 3: Launch Day (March 15)

### Pre-Deploy Baseline (Save These Results)

Run against production BEFORE deploying:

```sql
-- Baseline: existing engagement status distribution
SELECT c.code AS cohort_code, e.status, COUNT(*) AS count
FROM "Engagement" e
JOIN "Cohort" c ON e."cohortId" = c.id
WHERE e."archivedAt" IS NULL
GROUP BY c.code, e.status
ORDER BY c.code, e.status;

-- Baseline: coach capacity
SELECT cp."displayName", oc."maxEngagements",
       COUNT(e.id) AS active_engagements,
       oc."maxEngagements" - COUNT(e.id) AS remaining_capacity
FROM "OrganizationCoach" oc
JOIN "CoachProfile" cp ON oc."coachProfileId" = cp.id
LEFT JOIN "Engagement" e ON e."organizationCoachId" = oc.id
  AND e.status IN ('COACH_SELECTED', 'IN_PROGRESS', 'ON_HOLD')
  AND e."archivedAt" IS NULL
WHERE oc.active = true
GROUP BY cp."displayName", oc."maxEngagements", oc.id
ORDER BY remaining_capacity ASC;
```

### Deploy Sequence
1. [ ] Final `npm test` + `npm run build` pass locally
2. [ ] Merge PR #21 to main
3. [ ] Verify Vercel production deployment triggers and succeeds
4. [ ] Check deployment logs for errors/warnings

### Production Data Import

**Important:** The project has no separate production scripts. The `data:*:staging` scripts work against whichever database is configured in your environment. For production, set `DATABASE_URL` and `DIRECT_URL` to production values before running.

5. [ ] **Safeguard:** Before running any seed command:
   - Echo `$DATABASE_URL` and confirm it points to the **production** Supabase project (not staging)
   - Run `npm run env:validate:production` to verify all env vars
   - Take a Supabase database snapshot/backup (document the snapshot name)
6. [ ] Run data pipeline for new cohorts (ALP-136, EF-1):
   - `npm run data:build:staging` — normalizes roster artifacts (local-only, no DB access)
   - `npm run data:seed:staging` — seeds to whatever DB is in `DIRECT_URL`
   - Coach backfills if needed (`data:backfill:bios`, `data:backfill:photo-paths`)
7. [ ] Run Lona Miller removal on production DB (reuse exact SQL from Phase 1 staging removal)
8. [ ] Verify production data counts match staging verification

**Timing note:** Steps 5-8 should happen immediately after deploy (step 4). Until data import completes, new cohort participants will get "UNRECOGNIZED_EMAIL." Coordinate with Kari/Andrea: **do NOT send invitation links until data import is confirmed complete.**

#### Research Insights — Post-Import Verification

```sql
-- Verify new cohort participant counts
SELECT c.code, COUNT(pt.id) AS participants, COUNT(e.id) AS engagements
FROM "Cohort" c
LEFT JOIN "Participant" pt ON pt."cohortId" = c.id AND pt."archivedAt" IS NULL
LEFT JOIN "Engagement" e ON e."cohortId" = c.id AND e."archivedAt" IS NULL
WHERE c.code IN ('ALP-136', 'EF-1', 'MLP-80', 'ALP-135')
GROUP BY c.code ORDER BY c.code;

-- Verify all new engagements are INVITED
SELECT c.code, e.status, COUNT(*)
FROM "Engagement" e JOIN "Cohort" c ON e."cohortId" = c.id
WHERE c.code IN ('ALP-136', 'EF-1')
GROUP BY c.code, e.status;

-- Verify EF-1 dates
SELECT code, "coachSelectionStart", "coachSelectionEnd"
FROM "Cohort" WHERE code = 'EF-1';

-- Verify Lona Miller removed
SELECT COUNT(*) FROM "Participant" WHERE email = 'lona.e.miller@usps.gov';
-- Expected: 0

-- Verify no email case issues
SELECT email FROM "Participant" WHERE email != LOWER(email);
-- Expected: 0 rows

-- Verify no coach over capacity
SELECT cp."displayName", oc."maxEngagements",
  COUNT(e.id) FILTER (WHERE e.status IN ('COACH_SELECTED','IN_PROGRESS','ON_HOLD')) AS active_count
FROM "OrganizationCoach" oc
JOIN "CoachProfile" cp ON cp.id = oc."coachProfileId"
LEFT JOIN "Engagement" e ON e."organizationCoachId" = oc.id AND e."archivedAt" IS NULL
WHERE oc."organizationId" = (SELECT id FROM "Organization" WHERE code = 'USPS')
GROUP BY cp."displayName", oc."maxEngagements"
ORDER BY active_count DESC;
```

### Production Smoke Tests
9. [ ] Scenario 1: Participant email verification (known participant)
10. [ ] Scenario 2: Coach cards load (3 cards, photos, bios)
11. [ ] Scenario 3: Remix one-way door
12. [ ] Scenario 4: Coach selection + confirmation page
13. [ ] Scenario 5: Returning participant redirect
14. [ ] Scenario 6: Capacity enforcement
15. [ ] Scenario 7: Coach magic link sign-in → dashboard → engagements → session logging
16. [ ] Scenario 8: Admin magic link sign-in → dashboard KPIs → engagement table → CSV export
17. [ ] Scenario 9: Selection window enforcement (EF-1 before March 16 → "not yet open")
18. [ ] Verify coach photos load (Supabase Storage signed URLs)
19. [ ] Verify Wistia videos load via client-side navigation
20. [ ] Spot-check: coach capacity counts match expected values
21. [ ] Verify Lona Miller email → `UNRECOGNIZED_EMAIL`

### Go/No-Go Decision

| # | Check | Blocking? |
|---|-------|-----------|
| 1 | Gap 1 (coachSelectionStart enforcement) merged and tested | BLOCKING |
| 2 | Gap 2 (EF/EL interview info card) merged and tested | BLOCKING |
| 3 | Gap 6 (seed script status overwrite) fixed | BLOCKING |
| 4 | Resend domain SPF/DKIM/DMARC verified, test email delivered | BLOCKING |
| 5 | Production env validation passes | BLOCKING |
| 6 | Staging 9-scenario smoke test passes | BLOCKING |
| 7 | Pre-deploy baseline SQL queries saved | BLOCKING |
| 8 | Capacity audit shows sufficient remaining capacity per pool | BLOCKING |
| 9 | PR #21 CI green | BLOCKING |
| 10 | Gap 5 (returning participant) fixed | Important, not blocking |
| 11 | Gap 7 (email case normalization) verified | Important, not blocking |
| 12 | Gap 8 (photo URL performance) addressed | Important, not blocking |
| 13 | Coach profiles all have booking links/bios | Important, not blocking |
| 14 | Stakeholder comms sent | Operational, not blocking |
| 15 | Manual match runbook documented | Operational, not blocking |

- [ ] All BLOCKING items pass → **GO**
- [ ] Any BLOCKING failure → **NO-GO** (fix first)
- [ ] Non-blocking failures → assess: can launch with known issues? Document and monitor

---

## Phase 4: Post-Launch Monitoring (March 15-18)

### Day 1 — Launch Day (March 15)
- [ ] Monitor Vercel function logs for 500 errors (check every 2 hours)
- [ ] Monitor Supabase dashboard: connection pool health, active connections
- [ ] Verify first real ALP-136 participant selections recorded correctly
- [ ] Verify first coach magic link sign-ins succeed
- [ ] Check admin dashboard reflects real-time data
- [ ] Respond to stakeholder questions within SLA (P0 = same-day)

#### Research Insights — Day 1 Monitoring Queries

```sql
-- Monitor selections (run hourly)
SELECT c.code AS cohort,
       COUNT(CASE WHEN e.status = 'INVITED' THEN 1 END) AS invited,
       COUNT(CASE WHEN e.status = 'COACH_SELECTED' THEN 1 END) AS selected,
       COUNT(*) AS total
FROM "Engagement" e
JOIN "Cohort" c ON e."cohortId" = c.id
WHERE c.code IN ('MLP-80', 'ALP-135', 'ALP-136')
  AND e."archivedAt" IS NULL
GROUP BY c.code ORDER BY c.code;

-- Check coaches approaching capacity
SELECT cp."displayName", oc."maxEngagements",
       COUNT(e.id) AS active_load,
       oc."maxEngagements" - COUNT(e.id) AS remaining
FROM "OrganizationCoach" oc
JOIN "CoachProfile" cp ON oc."coachProfileId" = cp.id
LEFT JOIN "Engagement" e ON e."organizationCoachId" = oc.id
  AND e.status IN ('COACH_SELECTED', 'IN_PROGRESS', 'ON_HOLD')
  AND e."archivedAt" IS NULL
WHERE oc.active = true
GROUP BY cp."displayName", oc."maxEngagements", oc.id
HAVING oc."maxEngagements" - COUNT(e.id) <= 3
ORDER BY remaining ASC;
```

### Day 2 (March 16 — EF-1 Opens)
- [ ] Confirm EF-1 selection window opens correctly at configured time
- [ ] Verify EF-1 participants see interview info card
- [ ] Verify EF-1 participants can select coaches
- [ ] Monitor ALP-136 selection rate
- [ ] Check for capacity issues (coaches approaching max 20)
- [ ] Verify coaches are logging sessions
- [ ] Review Notion feedback database for incoming items

### Day 3 (March 17)
- [ ] Status update to Kari/Andrea: launch metrics (selection rates, coach utilization)
- [ ] Review any support requests or error reports
- [ ] Check for any EF/EL interview requests to Andrea
- [ ] Verify no cross-cohort capacity conflicts

### Ongoing (First 2 Weeks)
- [ ] Daily: Vercel error logs, Supabase connection pool metrics
- [ ] Daily: Notion feedback database for new items
- [ ] Weekly: Monday digest email to Kari/Andrea (per feedback tracking SLA)
- [ ] Weekly: engagement completion rates, coach utilization, session logging rates
- [ ] As needed: process Andrea's manual match reports (EF/EL interviews)

---

## Task Summary

| # | Task | Priority | Est. Effort | Dependency |
|---|------|----------|-------------|------------|
| 0a | Fix seed script status overwrite (Gap 6) | P0-BLOCKER | 15 min | None |
| 0b | Verify email case normalization (Gap 7) | P0 | 15 min | None |
| 0c | Add HSTS + Permissions-Policy headers | P0 | 10 min | None |
| 0d | Rotate staging credentials | P0 | 30 min | None |
| 0e | Branch doc sync | P1 | 30 min | None |
| 0f | Confirm EF-1 coachSelectionEnd with stakeholders | P0 | 5 min | None |
| 1 | `coachSelectionStart` enforcement | P0 | 2-3 hours | None |
| 2 | EF/EL interview info card | P0 | 2-3 hours | Task 1 (shares API change) |
| 3 | Resend domain verification | P0 | 30 min | None (non-code) |
| 4 | Manual match runbook (with statusVersion!) | P1 | 1 hour | None |
| 5 | Returning participant verification | P1 | 1-2 hours | None |
| 6 | Data pipeline: staging import | P0 | 1-2 hours | Roster files received, Task 0a |
| 7 | Capacity audit query | P0 | 30 min | Task 6 |
| 8 | Lona Miller removal | P1 | 30 min | Task 6 |
| 8a | Coach photo performance (Gap 8) | P1 | 15 min | None |
| 9 | Staging smoke tests (full) | P0 | 2-3 hours | Tasks 1-2, 6 |
| 10 | Coach onboarding prep | P0 | 2-3 hours | None |
| 11 | Stakeholder comms | P0 | 1 hour | Task 10 |
| 12 | Merge + deploy + production import | P0 | 2-3 hours | Tasks 0a-1-9 |
| 13 | Production smoke tests | P0 | 2-3 hours | Task 12 |
| 14 | Post-launch monitoring | P0 | Ongoing | Task 12 |

**Critical path:** Tasks 0a-0b-0c (blockers) → Tasks 1-2 (code) → Task 6 (data) → Task 9 (smoke tests) → Task 12 (deploy)

**Parallelizable:** Tasks 0d, 0e, 0f, 3, 4, 5, 8a, 10, 11 can run in parallel with the critical path.

---

## Post-Launch Hardening (After March 18)

Items discovered by research agents that should be addressed after launch:

| Item | Effort | Source |
|------|--------|--------|
| Add seed script `--target` flag + preflight + transaction wrapping | 1.5 hours | Best Practices, Architecture |
| Rename `data:*:staging` scripts to `data:*` (remove misleading suffix) | 10 min | Architecture |
| Integrate Sentry or structured error tracking | 2-4 hours | Architecture |
| Move IP rate limiter to durable store (Upstash/Redis) | 2-4 hours | Security |
| Add CSRF Origin header validation in middleware | 1-2 hours | Security |
| Implement structured logging with redaction for `LOG_REDACTION_ENABLED` | 2-4 hours | Security |
| Add doc comment to `guard.ts` clarifying production scope | 15 min | Architecture |
| Plan AuditEvent retention policy (delete > 90 days) | 30 min | Performance |

---

## References

- Brainstorm: `docs/brainstorms/2026-03-11-mvp-launch-checklist-brainstorm.md`
- EF/EL info card plan: `docs/plans/2026-03-09-feat-ef-el-interview-info-card-plan.md`
- Pre-deploy smoke test: `docs/checklists/pre-deploy-smoke-test.md`
- Master plan: `docs/plans/2026-02-12-feat-mvp-backend-vertical-slices-plan.md`
- Production launch plan (March 2): `docs/plans/2026-02-27-chore-production-launch-and-smoke-test-plan.md`
- Environment split runbook: `docs/plans/2026-02-22-environment-split-execution-runbook.md`
- Documented solutions: `docs/solutions/` (CSP, session carryover, coach pinning, Calendly comms)
- Deferred hardening: `https://github.com/ridegoodwaves/franklin-covey/issues/6`
