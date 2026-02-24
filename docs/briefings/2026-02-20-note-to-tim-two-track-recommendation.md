# Note to Tim — Recommendation After Blaine Discussion

**Date:** 2026-02-20  
**Audience:** Tim  
**Tone:** Direct and execution-focused

## Recommendation

We should run two parallel tracks immediately:

1. **MVP Delivery Track** (protect March 2/9/16 milestones)
2. **FC Operationalization Track** (security/VSA + FC GitHub + DevOps + migration readiness)

With current capacity (Amit + Tim), we should not make unconditional promises on full FC operationalization by a fixed date unless FC dependencies are time-bound with named owners.

We should explicitly ask FC to choose between two paths:

1. **Path A: build directly in FC AWS from day one** (lower security friction, higher risk to March launch timeline).
2. **Path B (recommended): launch MVP on Vercel + Supabase bridge with conditional controls while VSA runs, then migrate into FC AWS (~30 days post-launch, dependency-driven).**

If FC chooses Path A, we should explicitly rebaseline March 2 as at-risk.

## What We Can Commit To Now

1. VSA kickoff with Karen via `datasecurity@franklincovey.com` (initiated).
2. Security evidence starter pack within 24 hours of Wizedic access.
3. Docker baseline in repo by **Feb 24, 2026**.
4. FC GitHub mirror by **Feb 24, 2026** (contingent on FC org access).
5. DevOps working session with Mike/Ivan scheduled by **Feb 24, 2026**.
6. Weekly migration workplan with named owners/dates once FC confirms path.

## What We Cannot Honestly Commit To Yet

1. CIL SOC 2 claim (unless formal report exists).
2. Full Okta cutover by a guaranteed date.
3. Full SendGrid cutover by a guaranteed date.
4. Full FC production migration by a guaranteed date without FC dependency SLAs.

## Biggest Risk (Explicit)

Running full MVP build and FC operationalization work in parallel with limited team capacity is high risk without strict dependency ownership and turnaround SLAs from FC.

## Proposed Approach to De-risk VSA as a Launch Blocker

Request a **conditional launch while VSA is in progress**, with minimum pre-launch controls:

1. Staging sanitized-only data policy.
2. Staging email sandbox + allowlist.
3. Environment isolation and secret separation.
4. Active P0 incident process and communication cadence.
5. Daily 24-hour change log.
6. No `@franklincovey.com` sending before FC DNS authorization.

## Decision Needed from FC

Request FC to confirm preferred path by **end of day Feb 23, 2026** so March 2 launch planning remains viable.

CC on this decision request should include: **Blaine, Karen, Mike, Ivan, Christian**.

## Decision Needed from Tim in Next 24 Hours

Approve this framing and drive owner/due-date commitments with Blaine/Karen/Mike/Ivan/Christian for all FC-side dependencies.
