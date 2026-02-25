# FranklinCovey Coaching Platform — Shipped Changelog (2026-02-25)

## Scope

This changelog summarizes all commits shipped on **February 25, 2026** for the active staging branch.

## Commit Log (Chronological)

| Time (CT) | Commit | Summary |
|---|---|---|
| 10:29 | `7bcf544` | Staging schema baseline, seed tooling, outbound email safety guard |
| 10:30 | `3c402d9` | Core docs sync for staging execution + security controls |
| 11:06 | `67e7b94` | Slice 1 API wiring, magic-link routes, headshot pipeline |
| 12:33 | `eab6ddd` | Headshot resolver support for legacy storage folder names |
| 12:43 | `b1653c2` | Targeted coach bio backfill script |
| 12:58 | `b93d341` | Credential display + participant coach-card UI fixes |
| 13:07 | `aa28e43` | `WINDOW_CLOSED` handling + concurrent coach-selection lock |
| 13:11 | `bbf56e2` | Verify-email debug hardening for hidden 500 diagnosis |
| 13:15 | `fd728d3` | Verify-email outer try/catch + PgBouncer env documentation |
| 13:48 | `d0ae55a` | Enforce `?pgbouncer=true` for Supabase pooler URLs |
| 13:58 | `d3941a8` | Coach bio modal redesign + data pipeline cleanup |
| 14:05 | `e79c98b` | Remove dead participant selector sample-data code |
| 14:15 | `df2fa94` | Fix Supabase signed headshot URL prefix (`/storage/v1`) |
| 14:38 | `93fe6a9` | One-time magic-link consume + per-email participant auth lockout |

## What Shipped

### Slice 1 platform wiring

- Real participant APIs shipped and integrated:
  - `POST /api/participant/auth/verify-email`
  - `GET /api/participant/coaches`
  - `POST /api/participant/coaches/remix`
  - `POST /api/participant/coaches/select`
- Frontend now uses live data for participant coach selection and confirmation flows.
- Locked-state handling now includes:
  - `UNRECOGNIZED_EMAIL`
  - `WINDOW_CLOSED`
  - `ALREADY_SELECTED`
  - `RATE_LIMITED`
  - `REMIX_ALREADY_USED`
  - `CAPACITY_FULL`

### Coach/admin magic-link auth

- Magic-link request/consume flow is live under `/api/auth/magic-link/*`.
- All send paths are guarded through shared staging safety controls.
- Magic-link consume is now **one-time-use** (token replay blocked after first successful consume).

### Coach profile data quality

- Staging bio backfill tooling added and run path documented.
- Headshot resolver now supports both canonical and legacy storage folder names.
- Signed URL generation fixed for Supabase Storage path format.

### Security hardening

- Participant auth now has both:
  - per-IP limiter (in-memory)
  - per-email limiter (DB-backed, distributed-safe via `audit_events`)
- Coach selection transaction hardened with advisory lock to prevent over-assignment races.
- Environment validation now enforces `?pgbouncer=true` when using Supabase pooler URLs.

## Operational Notes

- `DATABASE_URL` for Supabase pooler usage must include `?pgbouncer=true`.
- `DIRECT_URL` remains direct Postgres (used for migration/administrative workflows).
- Staging outbound email remains launch-safe by default with:
  - `EMAIL_OUTBOUND_ENABLED=false`
  - sandbox mode
  - allowlist checks

## Related Core Docs Updated

- `docs/briefings/2026-02-25-stakeholder-summary-progress-update.md`
- `docs/briefings/2026-02-24-architecture-diagram.md`
- `docs/briefings/2026-02-24-security-overview-for-fc.md`
- `docs/plans/2026-02-18-fc-project-plan.md`
- `docs/plans/2026-02-22-environment-split-execution-runbook.md`
- `docs/plans/2026-02-25-supabase-schema-spec-and-field-mapping.md`
