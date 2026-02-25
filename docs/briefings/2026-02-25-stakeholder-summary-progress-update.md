# FranklinCovey Coaching Platform — Stakeholder Summary (Feb 25, 2026)

## What changed today

- We completed the core staging setup so the platform is now running with real MVP structure and data.
- We loaded the USPS baseline into staging:
  - 4 programs
  - 14 cohorts
  - 32 coach memberships
  - 175 participants
- We seeded admin access for Amit and Tim in staging.

## Safety and launch controls added

- Participant emails remain USPS-owned (no participant outbound emails from the system in MVP).
- We added a strict staging email safety model so test emails cannot accidentally go out broadly:
  - staging outbound email default is OFF
  - only allowlisted test inboxes can be used when testing is temporarily enabled
  - all email sends must pass one shared safety check before sending

## Platform readiness beyond USPS

- We implemented the data foundation so this can support additional organizations after USPS without redesigning the database.
- This keeps MVP focused for March launch while reducing Phase 2 rework risk.

## What is still needed from FC Ops

1. Kari + Andrea admin email addresses (to complete staging admin access setup)
2. EF/EL coach-selection end dates (currently missing in the shared timeline source)
3. Remaining cohort roster files (to move from current loaded participants to full planning baseline)
4. Final confirmation on sender identity target (`coaching@coachinginnovationlab.com`) for coach/admin magic-link communications

## What this means for March launch

- The biggest foundation work is now in place.
- Remaining launch risk is mostly operational inputs/timing (final missing dates, remaining roster files, final admin access setup), not platform architecture.
