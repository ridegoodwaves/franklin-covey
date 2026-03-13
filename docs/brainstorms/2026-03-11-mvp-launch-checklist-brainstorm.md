# MVP Full Launch Checklist — Brainstorm

**Date:** 2026-03-11
**Status:** Draft
**Launch target:** Before March 16, 2026 (EF-1 coach selection opens March 16)

---

## What We're Building

A pre-launch and post-launch checklist for the full MVP launch of the FranklinCovey Coaching Platform. PR #21 merges all 3 slices (participant flow, admin dashboard, coach portal) to main and deploys to production.

**Launch scope:**
- All 3 portals going live to real users for the first time as a unified product
- New cohorts launching: ALP-136, EF-1
- Updated rosters for existing cohorts: MLP-80, ALP-135
- Coach portal is net-new — coaches need onboarding
- Admin dashboard is net-new — Kari/Andrea get visibility for the first time

**Stakeholders to notify:** Kari Sadler, Andrea, Greg, Tim

---

## Why This Approach

A phased checklist (not a single flat list) because the launch has distinct stages with different owners and dependencies. Data import must happen before smoke tests. Coach onboarding must happen before coaches use the portal. Post-launch monitoring catches what pre-launch testing can't.

---

## Key Decisions

1. **4-phase structure:** Pre-Launch Technical → Pre-Launch Operations → Launch Day → Post-Launch Monitoring
2. **Roster import before merge:** New cohort data (ALP-136, EF-1) and updated rosters (MLP-80, ALP-135) need to go through the data pipeline on staging first, verified, then imported to production after deploy
3. **Coach onboarding:** Live walkthrough + written guide before coaches get magic links
4. **Monitoring window:** 48-72 hours post-launch active monitoring across all portals

---

## Phase 1: Pre-Launch Technical (Before Merge)

### Code & Build
- [ ] All tests passing (`npm test` — expect 134+ tests, 27 files)
- [ ] Production build succeeds (`npm run build`)
- [ ] PR #21 reviewed and approved
- [ ] No open P0/P1 issues in GitHub
- [ ] CI pipeline green on PR #21

### Data Pipeline — Staging
- [ ] Receive updated roster files from FC (ALP-136, EF-1, refreshed MLP-80, refreshed ALP-135)
- [ ] Normalize roster artifacts (`npm run data:build:staging`)
- [ ] Seed new cohort data (`npm run data:seed:staging`)
- [ ] Backfill coach bios if any new coaches (`npm run data:backfill:bios -- --apply`)
- [ ] Backfill coach photo paths if any new coaches (`npm run data:backfill:photo-paths -- --apply`)
- [ ] Verify cohort counts match expected: ALP-136 participant count, EF-1 participant count
- [ ] Verify existing cohort roster changes are correct (MLP-80, ALP-135 — adds/removes/corrections)
- [ ] Verify coach panel assignments: MLP/ALP shared panel, EF/EL shared panel
- [ ] Verify coach capacity is set correctly (max 20 per coach)
- [ ] Verify `coachSelectionStart` and `coachSelectionEnd` dates for new cohorts

### Environment Validation — Production
- [ ] `DATABASE_URL` uses pooler (`:6543`) with `?pgbouncer=true`
- [ ] `DIRECT_URL` uses direct Postgres (`:5432`)
- [ ] `AUTH_SECRET` is unique (different from staging)
- [ ] `CRON_SECRET` is unique (different from staging)
- [ ] `RESEND_API_KEY` is production key (not staging-restricted)
- [ ] `EMAIL_MODE=live`
- [ ] `EMAIL_OUTBOUND_ENABLED=true`
- [ ] `EMAIL_FROM` is correct production sender address
- [ ] `TEST_ENDPOINTS_ENABLED=false`
- [ ] `NEXT_PUBLIC_SITE_URL` is production URL
- [ ] `NEXT_PUBLIC_APP_ENV=production`
- [ ] `LOG_REDACTION_ENABLED=true`
- [ ] `NEXT_PUBLIC_ENABLE_WISTIA_COACH_VIDEOS` — confirm desired setting for production
- [ ] Run env validation script (`scripts/validate-env-safety.mjs`) against production env

### EF/EL Interview Info Card
- [ ] Implement conditional interview message on coach selector for EF/EL program cohorts
- [ ] Message text: "If you would like to conduct 30-minute chemistry interviews with any of the coaches prior to selection, please reach out to andrea.sherman@franklincovey.com"
- [ ] Verify message appears ONLY for EF and EL cohort participants (not MLP/ALP)
- [ ] Test on staging with an EF-1 participant

### MLP-80 Roster Correction
- [ ] Check if Lona Miller has already selected a coach (query production DB)
- [ ] If engagement exists: cancel engagement, verify coach capacity is freed
- [ ] Remove Lona Miller participant record from MLP-80
- [ ] Verify MLP-80 participant count is correct after removal

### Staging Smoke Tests
- [ ] Run full pre-deploy smoke test checklist (all 9 scenarios) against staging
  - Reference: `docs/checklists/pre-deploy-smoke-test.md`
  - Must include: participant flow, coach magic link + portal, admin magic link + portal
- [ ] Verify new cohort participants can enter email and see coach selector
- [ ] Verify EF-1 cohort shows correct selection window behavior (opens March 16)
- [ ] Verify coach session logging form works end-to-end
- [ ] Verify admin dashboard KPIs reflect correct data after new roster import
- [ ] Verify CSV export includes new cohort data

---

## Phase 2: Pre-Launch Operations (Before Go-Live)

### Coach Onboarding
- [ ] Prepare written guide for coach portal (sign-in, dashboard, engagement list, session logging)
- [ ] Schedule live walkthrough with coaches (MLP/ALP panel + EF/EL panel)
- [ ] Confirm all coaches have correct email addresses in the system for magic links
- [ ] Test magic-link delivery to at least 2-3 coach email addresses (verify Resend delivery)
- [ ] Document session logging expectations: when to log, what fields to fill, session statuses

### Stakeholder Communication
- [ ] Notify Kari Sadler: admin dashboard is live, walkthrough of KPIs and engagement table
- [ ] Notify Andrea: operations visibility, CSV export capabilities
- [ ] Notify Greg: launch status, participant counts, timeline
- [ ] Notify Tim: technical launch details, monitoring plan
- [ ] Confirm who handles participant questions/support during launch window
- [ ] Confirm participant communication plan (who sends the selection invitation emails/links for ALP-136 and EF-1)

### Rollback Plan
- [ ] Document rollback procedure: Vercel instant rollback to previous deployment
- [ ] Identify rollback triggers: what constitutes a "must rollback" scenario
- [ ] Ensure previous production deployment is preserved in Vercel (don't auto-delete)
- [ ] Confirm database migration rollback path (if any new migrations in PR #21)

---

## Phase 3: Launch Day (Merge + Deploy)

### Deploy
- [ ] Merge PR #21 to main
- [ ] Verify Vercel production deployment triggers and completes successfully
- [ ] Check Vercel deployment logs for build errors or warnings

### Production Data Import
- [ ] Run data pipeline against production for new cohorts (ALP-136, EF-1)
- [ ] Run data pipeline for roster updates (MLP-80, ALP-135)
- [ ] Run coach bio/photo backfills if needed
- [ ] Verify production data counts match staging verification

### Production Smoke Tests
- [ ] Run full pre-deploy smoke test (all 9 scenarios) against production URL
- [ ] Verify participant flow: email verify → coach selector → selection → confirmation
- [ ] Verify coach portal: magic link → dashboard → engagement list → session logging
- [ ] Verify admin portal: magic link → dashboard KPIs → engagement table → coach roster
- [ ] Verify coach photos load (Supabase Storage signed URLs)
- [ ] Verify email delivery works in production (magic links arrive)
- [ ] Spot-check capacity counts for coaches with existing engagements

### Go/No-Go
- [ ] All 9 smoke test scenarios pass
- [ ] Data counts verified
- [ ] Email delivery confirmed
- [ ] **Decision: GO or ROLLBACK**

---

## Phase 4: Post-Launch Monitoring (48-72 Hours)

### Day 1 (Launch Day)
- [ ] Monitor Vercel function logs for 500 errors
- [ ] Monitor Supabase dashboard for connection pool health
- [ ] Verify first real participant selections are recorded correctly
- [ ] Verify coach magic links work for first coach sign-ins
- [ ] Check admin dashboard reflects real-time engagement data
- [ ] Respond to any stakeholder questions within SLA (P0 = same-day)

### Day 2
- [ ] Review participant selection rate (how many of new cohorts have selected?)
- [ ] Check for any capacity-related issues (coaches approaching max 20)
- [ ] Verify coaches are successfully logging sessions
- [ ] Review any error reports or support requests
- [ ] Check Notion feedback database for incoming items

### Day 3 (Pre-EF-1 Opening)
- [ ] Confirm EF-1 selection window opens correctly on March 16
- [ ] Verify EF-1 participants can access the coach selector
- [ ] Check EF/EL coach panel availability and capacity
- [ ] Status update to Kari/Andrea on launch metrics

### Ongoing Monitoring Checklist
- [ ] Daily: check Vercel logs for error spikes
- [ ] Daily: check Supabase connection pool metrics
- [ ] Daily: review Notion feedback database for new items
- [ ] Weekly: engagement completion rates, coach utilization, session logging rates
- [ ] Weekly: Monday digest email to Kari/Andrea (per feedback tracking SLA)

---

## Resolved Questions

1. **EF/EL interview message** — YES, shipping. Client wants this message on the coach selector for EF/EL cohorts: _"If you would like to conduct 30-minute chemistry interviews with any of the coaches prior to selection, please reach out to andrea.sherman@franklincovey.com"_. Andrea handles interview scheduling manually, participants report selections back to her, and she reports matches for database import.
2. **Wistia videos in production** — Already enabled (`NEXT_PUBLIC_ENABLE_WISTIA_COACH_VIDEOS=true`). No change needed.
3. **Participant invitation emails** — Kari/Andrea (FC ops) send the generic selection link to participants via their own communications. Platform does not send outbound participant emails.
4. **Roster format** — Same USPS import format. Existing data pipeline works as-is.
5. **MLP-80 roster update** — Remove Lona Miller from MLP-80. Need to check: did she already select a coach? If so, cancel her engagement in DB.
6. **Demo accounts** — Staging only. No demo accounts in production.

## Remaining Open Questions

1. **Lona Miller removal** — Has she already selected a coach in production? If yes, need to cancel engagement and free up coach capacity.
2. **EF/EL interview message implementation** — Does this need a code change (conditional info card on coach selector for EF/EL programs), or can it be handled outside the platform?
3. **Andrea's manual match workflow** — What format will Andrea report matches in? Need a process for database updates when she reports interview-based selections.

---

## References

- PR #21: Admin Dashboard Slice 2 (+ accumulated Slice 3 work)
- Pre-deploy smoke test: `docs/checklists/pre-deploy-smoke-test.md`
- Master plan: `docs/plans/2026-02-12-feat-mvp-backend-vertical-slices-plan.md`
- Coach session logging plan: `docs/plans/2026-03-09-feat-coach-session-logging-portal-wiring-plan.md`
- Environment split runbook: `docs/plans/2026-02-22-chore-environment-split-execution-runbook.md`
- Production launch plan: `docs/plans/2026-02-27-chore-production-launch-and-smoke-test-plan.md`
- Data pipeline: `npm run data:build:staging` → `data:seed:staging` → `data:backfill:bios` → `data:backfill:photo-paths`
- Deferred hardening: `https://github.com/ridegoodwaves/franklin-covey/issues/6`
