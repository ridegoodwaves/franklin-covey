# FranklinCovey Coaching Platform — Security Overview

**Prepared by:** CIL (Amit Bhatia)
**Date:** February 24, 2026
**Last Updated:** February 25, 2026
**For:** FranklinCovey Security Review

---

## What We Are Building

CIL is delivering a custom coaching platform for FranklinCovey's leadership development programs. The platform enables approximately 400 USPS participants to browse a curated panel of FranklinCovey-approved coaches, select their coach, and book their first session. Coaches log session notes through a dedicated portal; FC Ops manages participant data and program outcomes through an admin dashboard.

**Three portals. One purpose.** Help USPS participants connect with FranklinCovey coaches — simply, securely, and on time.

| Portal | Users | Core Function |
|--------|-------|---------------|
| Participant | ~400 USPS employees | One-time coach selection; access via roster-matched email entry from USPS cohort welcome email |
| Coach | 31 coaches (MLP/ALP + EF/EL pools) | Session logging, engagement tracking |
| Admin | Kari Sadler, Andrea (FC Ops) | Participant import, KPI dashboard, CSV export |

---

## Infrastructure Overview

The MVP runs on enterprise-grade managed services, purpose-selected for launch speed and compliance posture:

| Layer | Provider | Compliance |
|-------|----------|------------|
| Application hosting | **Vercel Pro** | SOC 2 Type II, ISO 27001 |
| Database | **Supabase Pro** (managed PostgreSQL 16) | SOC 2 Type II |
| Transactional email | **Resend or AWS SES** (coach/admin magic links only) | SOC 2 (provider-dependent) |

**Architecture diagram is attached.** It covers data flows, auth paths, environment isolation, and the post-launch migration path to FC production infrastructure.

---

## Security Controls in Place

### Identity and Access

- **Participants** authenticate via roster-matched email entry only (MVP, FC-confirmed). Safeguards: cohort-window gating, per-IP limiter plus per-email DB-backed lockout, generic auth error responses (no enumeration leakage), and audit logging for security events.
- **Coaches and admins** authenticate via magic link (`/auth/signin`). Magic-link tokens expire in 30 minutes and are one-time-use at consume. Signed portal sessions use a 12-hour TTL. No passwords are stored.
- **Role boundaries** are enforced at the API layer: participants see only their own data, coaches see only their assigned engagements, admins have scoped read and import access.

### Data Protection

- All data encrypted in transit (TLS) and at rest (Supabase-managed encryption).
- **Row Level Security (RLS)** is enforced at the PostgreSQL layer — not just at the application layer — for all user-facing tables.
- **Coach private notes** are restricted at the RLS level: only the assigned coach can read them.

### Environment Isolation

- Staging and production run in **completely separate** Vercel and Supabase projects, with separate secrets, API keys, database URLs, and auth configurations. Nothing is shared across environments.
- **Staging data handling is controlled.** Current staging includes USPS MVP seed data for launch-realistic testing; non-launch QA imports should stay sanitized by default.
- **Email is sandboxed in staging.** A hard recipient allowlist prevents any email from reaching external addresses during QA. Non-allowlisted sends are blocked, not queued.
- **Outbound kill switch is enforced.** `EMAIL_OUTBOUND_ENABLED=false` blocks all sends in staging, and all send paths must use the shared guard (`src/lib/email/guard.ts` + `src/lib/email/send-with-guard.ts`).
- **Supabase pooler safety is enforced.** Pooler `DATABASE_URL` values must include `?pgbouncer=true`; `DIRECT_URL` remains direct Postgres for migration/administrative paths.

### AI and Data Use

The core application **does not use AI** to process, store, or analyze any FranklinCovey client data. This platform is a structured CRUD application — coach profiles, participant records, session notes, and engagement states. No AI models, no LLM integrations, no automated inference on participant or coach data.

### Application Security

- Pre-push build gate enforces a clean TypeScript build and lint pass before any code reaches staging or production.
- Secrets are managed via environment variables — no credentials in source code.
- Log redaction is enabled: participant emails and auth tokens are not written to logs.
- CSRF protection and `same-origin` credential policies on all authenticated requests.
- `/api/test/*` endpoints are gated by explicit staging controls (`TEST_ENDPOINTS_ENABLED=true` + `X-Test-Secret`), not `NODE_ENV`, because Vercel deploys run with `NODE_ENV=production` in both staging and production.
- Concurrency controls are in place for coach selection to reduce over-assignment race risk under simultaneous requests.

### Incident Response

| Priority | Definition | Response Target |
|----------|------------|-----------------|
| P0 | Core flow broken (auth failure, data access error) | Same-day triage; frequent status updates until resolved |
| P1 | Degraded experience or milestone risk | Next build window, ≤24 hours |
| P2 | Non-blocking enhancement or polish | Scheduled against milestone capacity |

**Ownership:** CIL owns application support and incident triage. Managed providers (Vercel, Supabase) own their platform layer under their published SLAs.

---

## What We Are Providing for Security Review

### Available Now

| Document | Status | Description |
|----------|--------|-------------|
| **Architecture diagram** | ✅ Ready | Full data flow, auth paths, environment isolation, migration path |
| **MVP contract (v1)** | ✅ Signed | Frozen scope, API contracts, data state model |
| **Environment and email safety SOP** | ✅ Ready | Staging isolation, data sanitization, email sandboxing |
| **Sub-processor list** | ✅ Ready | Vercel, Supabase, email provider — with compliance posture |
| **Incident/SLA model** | ✅ Ready | P0/P1/P2 definitions, response targets, escalation model |
| **Project plan with security baseline** | ✅ Ready | Includes Vercel Pro + Supabase Pro baseline, RLS, backup posture, log retention |
| **Staging schema + seed execution record** | ✅ Ready | Prisma migration applied, USPS baseline seeded, environment and email controls validated |

### Available Upon Formal Engagement

The following are prepared and will be packaged for FC's formal VSA process (Wizedic) upon contract finalization:

| Document | Contents |
|----------|----------|
| Full VSA submission package | Architecture PDF, data flow narrative, PII classification |
| Dependency inventory | Current `package.json` + planned backend dependencies addendum |
| GitHub security scanning plan | FC org repo setup, automated scanning, access model |
| Sub-processor compliance reports | Vercel SOC 2 Type II, Supabase SOC 2 Type II |
| Migration plan with owners and dates | Vercel → AWS ECS, Supabase → RDS, magic link → Okta, target: ~30 days post-March 2 |
| Backup / RPO / RTO detail | Supabase Pro daily backups, 7-day restore window, provider SLA |
| Data retention and deletion statement | Participant PII lifecycle, export/delete on request |

---

## Post-Launch Migration to FC Infrastructure

The MVP is built for migration, not lock-in. Within approximately 30 days of the March 2 launch, the platform migrates to FC production standards:

```
MVP (Vercel + Supabase)          →       FC Production (AWS)
────────────────────────────────────────────────────────────
Vercel (Next.js)                 →       AWS ECS / ECR
Supabase (PostgreSQL 16)         →       AWS RDS PostgreSQL
Magic link auth                  →       Okta (FC identity tenant)
Email provider                   →       SendGrid (FC standard)
```

This is a dependency-driven cutover — same application, migrated infrastructure. No rewrite required. The containerized build (Dockerfile) is scheduled for delivery within 30 days of launch.

---

## A Note on Our Approach

We take the same care with your participants' data that FranklinCovey takes with their development. Every control above is implemented now — not planned for later. The staging environment is live, isolated, and running launch-realistic USPS seed data with strict send controls. The production environment will receive its first real participant data only after FC-approved sender identity, Blaine's security sign-off, and a clean staging beta with Kari on February 26.

We are committed to this relationship. The full VSA package is assembled and ready to submit the moment the formal process kicks off.

---

*Architecture diagram: `2026-02-24-architecture-diagram.md`*
*Project plan: `docs/plans/2026-02-18-fc-project-plan.md`*
*MVP contract: `docs/drafts/2026-02-18-mvp-contract-v1.md`*
*Environment SOP: `docs/briefings/2026-02-18-status-note-for-tim-implementation-readiness.md`*
