# Demo Accounts for USPS Staging Environment

**Date:** 2026-03-02
**Status:** Plan (deepened)
**Purpose:** Create 5 demo participant accounts in staging for client demo recordings

---

## Enhancement Summary

**Deepened on:** 2026-03-02
**Research agents used:** 6 (seed pipeline explorer, learnings checker, best-practices researcher, security sentinel, data integrity guardian, admin dashboard explorer)

### Key Findings from Research

1. **CRITICAL: Do NOT use `@usps.gov` emails** — real government domain, RFC 2606 violation, email delivery risk, PII implications
2. **Reset script is the highest-risk element** — must be scoped exclusively by demo cohort ID with safety guards
3. **Two existing solutions are directly relevant** — session carryover fix and coach selector state fix both affect demo flows
4. **Admin dashboard has no cohort filter** — demo accounts will appear in KPIs and exports without mitigation
5. **Coach capacity consumption is real** — 5 demo selections = up to 25% of a coach's capacity

---

## Decision: Good Staging Practice? Yes, With Guardrails

Creating dedicated demo accounts is standard practice. The main risk is **data contamination**, not system failure.

## Risks (Ranked)

| # | Risk | Severity | Mitigation |
|---|------|----------|------------|
| 1 | Using real `@usps.gov` domain for fake accounts | **Critical** | Use `@demo.usps.example` (RFC 2606 reserved) |
| 2 | Reset script accidentally resets real participant data | **Critical** | Scope by demo cohort ID + count guard + `--confirm` flag |
| 3 | Demo selections consume real coach capacity (20 max) | **Medium** | Reset script clears `organizationCoachId`; run promptly after demos |
| 4 | Demo accounts pollute admin KPIs and CSV exports | **Medium** | Separate demo cohort; document staging includes demo data |
| 5 | Demo state drift — account stuck in "already selected" | **Medium** | Reset script returns engagement to `INVITED` |
| 6 | Email delivery if staging outbound accidentally enabled | **Medium** | Already mitigated: `EMAIL_OUTBOUND_ENABLED=false` + email guard |
| 7 | QA confusion — demo data mistaken for real cohort data | **Low** | Clear cohort naming (`DEMO-*` prefix) |
| 8 | Audit trail pollution from demo verify-email events | **Low** | Acceptable with synthetic domain |

---

## Recommended Email Domain

**Do NOT use:** `imaclient1-5@usps.gov`

**Use instead:** `imaclient1@demo.usps.example` through `imaclient5@demo.usps.example`

**Why:**
- `@usps.gov` is a real government domain — emails could route to real USPS mailboxes
- Storing `@usps.gov` in staging creates appearance of processing government PII
- If outbound email is ever enabled, messages go to real government infrastructure
- RFC 2606 reserves `.example` for exactly this purpose — it will never resolve
- The verify-email route does a DB lookup only (`lookupParticipantForEmailAuth`) — any email format works as long as it matches the Participant table

If the demo recording must show `@usps.gov` in the UI, use the synthetic domain for auth and note this in demo talking points.

---

## Implementation Plan

### Step 1: Create Demo Cohort

No schema change needed. Create a cohort under the existing ALP program (most likely demo target per client request for ALP-135 cohort launch):

```
Cohort code: DEMO-ALP-REC1
Program: ALP (TWO_SESSION track, MLP_ALP coach pool)
coachSelectionStart: 2026-03-01
coachSelectionEnd: 2026-06-01 (generous window for repeated demos)
session1Start/End: 2026-03-15 / 2026-05-15
session2Start/End: 2026-05-15 / 2026-07-15
```

### Step 2: Seed Script (`scripts/seed-demo-accounts.mjs`)

Idempotent upsert script following the existing `seed-staging-from-artifacts.mjs` pattern:

```javascript
// Key design decisions:
// 1. Upsert by (cohortId, email) — safe for reruns
// 2. Tag sourceFile = "demo-seed-2026-03-02"
// 3. Tag sourcePayload = { demo_batch: "usps_recording_2026_03_02" }
// 4. Create engagement with status INVITED, totalSessions from program
// 5. Advisory lock at script start to prevent concurrent runs

const DEMO_EMAILS = [
  "imaclient1@demo.usps.example",
  "imaclient2@demo.usps.example",
  "imaclient3@demo.usps.example",
  "imaclient4@demo.usps.example",
  "imaclient5@demo.usps.example",
];

const DEMO_COHORT_CODE = "DEMO-ALP-REC1";
```

**npm script:** `"data:seed:demo": "node scripts/seed-demo-accounts.mjs"`

### Step 3: Reset Script (`scripts/reset-demo-accounts.mjs`)

Run before each demo recording to return accounts to clean state:

```javascript
// Safety guards:
// 1. Scope ONLY by demo cohort (code must start with "DEMO-")
// 2. Count guard: abort if > 10 engagements match
// 3. Require --confirm flag for execution (dry-run by default)
// 4. Acquire advisory locks for each affected coach ID
// 5. Single transaction wrapping all operations

// Reset sequence (inside $transaction):
// 1. Find demo engagements by cohort code prefix "DEMO-"
// 2. Validate count <= 10 (safety guard)
// 3. Lock affected coach IDs with pg_advisory_xact_lock
// 4. Delete Session records for demo engagements
// 5. Delete NeedsAttentionFlag records for demo engagements
// 6. Reset engagement: status=INVITED, organizationCoachId=null,
//    coachSelectedAt=null, lastActivityAt=null, statusVersion=1
```

**npm script:** `"data:reset:demo": "node scripts/reset-demo-accounts.mjs"`

### Step 4: Pre-Demo Verification Checklist

Before recording, verify these known issues are resolved in staging:

- [ ] **Session carryover fix deployed** (commit `29cae1d`) — Without this, switching between demo accounts in the same browser tab shows the wrong coach. Verified by: enter email A, select coach, go back, enter email B → B should see coach selector, not A's confirmation.
- [ ] **Coach selector state fix deployed** — Without this, browser refresh re-randomizes the coach batch. Verified by: land on coach selector, note 3 coaches, refresh → same 3 coaches appear.
- [ ] **Reset script run** — `npm run data:reset:demo -- --confirm`
- [ ] **EMAIL_OUTBOUND_ENABLED=false** confirmed in staging env vars

---

## What This Does NOT Require

- No schema migration (uses existing Cohort, Participant, Engagement models)
- No application code changes (demo accounts go through the same participant flow)
- No new environment variables
- No admin dashboard changes (demo data appears in staging metrics — acceptable for staging)

## Longer-Term Hardening (Optional, Not Blocking)

These are nice-to-haves if demo usage becomes frequent:

1. Add `isDemo` boolean to Cohort model for dashboard filtering
2. Add cohort filter dropdown to admin dashboard
3. Add `.gov` domain rejection rule to email guard for non-production environments
4. Add `validate-env-safety.mjs` to CI pipeline for staging deployments

---

## Operational Workflow

```
Before demo:  npm run data:reset:demo -- --confirm
              → All 5 accounts return to INVITED status, clean slate

During demo:  Use imaclient1-5@demo.usps.example in the participant flow
              → Each account goes through: email verify → coach select → confirmation

After demo:   No action required (accounts stay in COACH_SELECTED state)
              → Run reset again before next demo
```

## Files to Create

| File | Purpose |
|------|---------|
| `scripts/seed-demo-accounts.mjs` | One-time: create demo cohort + 5 participants + 5 engagements |
| `scripts/reset-demo-accounts.mjs` | Repeatable: reset demo accounts to clean state before each demo |
