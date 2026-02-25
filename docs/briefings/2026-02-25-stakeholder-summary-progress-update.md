# FranklinCovey Coaching Platform — Stakeholder Summary (Feb 25, 2026)

## What shipped today

- We shipped the full Slice 1 participant wiring on staging:
  - live participant auth (`verify-email`)
  - live coach list
  - one-time remix
  - live coach selection + confirmation
- We shipped coach/admin magic-link auth routes and guard enforcement.
- We shipped headshot + bio pipeline fixes so participant coach cards now render from real staging data.
- We shipped launch-safety hardening:
  - `WINDOW_CLOSED` and `ALREADY_SELECTED` lock behavior
  - concurrent coach-selection race protection
  - one-time magic-link consume (replay blocked)
  - per-email participant auth lockout (in addition to per-IP limiting)
  - PgBouncer safety enforcement for Supabase pooler URLs

## Data baseline now active in staging

- 4 programs
- 14 cohorts
- 32 coach memberships
- 175 participants
- 175 engagements
- Admin users seeded for Amit + Tim

## Launch safety controls now in code

- No participant outbound emails in MVP.
- Staging email sends remain gated behind shared guard controls:
  - `EMAIL_OUTBOUND_ENABLED=false` default
  - sandbox mode + allowlist required when temporarily enabled
- Environment validation now enforces `?pgbouncer=true` for Supabase pooler `DATABASE_URL` values.

## What remains operational (not architecture)

1. Kari + Andrea admin emails (to complete admin access seed for staging acceptance)
2. Explicit EF/EL coach-selection end dates (replace current fallback defaults)
3. Remaining roster imports to move from 175 loaded participants toward full launch baseline
4. Final sender identity confirmation for production coach/admin magic-link communications

## March 2 launch signal

- Core Slice 1 architecture and security controls are now implemented in staging.
- Remaining launch risk is primarily execution inputs/timing from operations.

## Detailed record

- Full commit-level changelog: `docs/briefings/2026-02-25-shipped-changelog.md`
