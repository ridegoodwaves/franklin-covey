# MVP Foundation + Technical Sequence Brainstorm

**Date**: 2026-02-18
**Status**: Complete — approved approach documented
**Participants**: Amit + Claude
**Next Step**: `/workflows:plan` or begin Phase 0 directly (schema is fully designed)

---

## Context

All product decisions are locked (Feb 17 workshop). The schema ERD is finalized. The frontend has 9 pages with hardcoded demo data. Zero backend code exists.

**Hard deadline**: March 2 — coach selector live for first cohort (~60 USPS participants).
**Beta testing**: Feb 26 (committed to Kari).

---

## What We're Building (This Session)

The technical sequence to get from zero backend → March 2 launch, using Vercel + Supabase for MVP and designed to migrate cleanly to FC's production infrastructure (AWS ECS + RDS + Okta + SendGrid).

---

## Infrastructure: MVP vs Production

### MVP (now — Vercel + Supabase)
- **Hosting**: Vercel (Next.js native, no Docker needed for deployment)
- **Database**: Supabase managed PostgreSQL (Prisma connection via `DATABASE_URL`)
- **Email**: Resend (simple DX, fast setup, covered by MVP scope)
- **Auth (coach/admin)**: Auth.js magic links
- **Auth (participants)**: Custom OTP (Prisma `VerificationCode` table + iron-session)

### Production Target (future — per Blaine/IT, Feb 18)
- **Hosting**: AWS ECS + ECR (Docker container)
- **Database**: AWS RDS PostgreSQL (Terraform provisioned)
- **Email**: SendGrid (Blaine's explicit requirement)
- **Auth (coach/admin)**: Okta SSO (Auth.js Okta provider)
- **CI/CD**: GitHub Actions → ECR push → ECS deploy
- **Encryption**: AES-256 at rest (RDS flag), ACM for SSL
- **DNS**: FC controls — request `coaching.franklincovey.com`
- **Procurement**: Tim to email `datasecurity@franklincovey.com`

### Design-for-Portability Decisions (bake in now, free later)
| Concern | Decision | Why |
|---------|----------|-----|
| Docker | Write `Dockerfile` in Phase 0 even though Vercel doesn't need it | ECS needs it; costs 20 min now, saves days later |
| Database | Use `DATABASE_URL` only (Prisma default) | Supabase → RDS is a connection string swap |
| Email | Abstract behind `src/lib/email.ts` with a generic interface | Resend → SendGrid is a provider swap, not a rewrite |
| Auth | Use Auth.js (not Supabase Auth) | Adding Okta is adding a provider — Auth.js already has it |
| Env vars | Name vars generically, document in `.env.example` | Maps to AWS Secrets Manager without rename |

---

## Approved Sequence: Approach B (Schema-first, just-in-time utilities)

### Why Approach B over Foundation-first (A)
- Schema is already fully designed (ERD locked, no ambiguity)
- Phase 0 utilities are small (~30-100 lines each)
- Building utilities just-in-time prevents building things that turn out slightly wrong
- Gains one full day of buffer on Feb 26 beta testing

### Day-by-Day Plan

| Day | Date | Work |
|-----|------|------|
| 1 | Feb 18 | Install packages, write full Prisma schema, docker-compose (local dev), Supabase project, run migration |
| 2 | Feb 19–20 | OTP auth endpoints + iron-session + email.ts (sendOTP) + OTP email template |
| 3 | Feb 21–22 | Coach selection API (list with panel scoping, remix, select with row lock) + error classes + state machine |
| 4 | Feb 23–24 | Wire frontend: update select-coach page, add confirmation page, remove old engagement page from participant flow |
| **5** | **Feb 25** | **Deploy to Vercel + Supabase staging, run full Slice 1 smoke test** |
| **6** | **Feb 26** | **Beta testing with Kari — staging already running, full day of buffer for fixes** |
| 7–13 | Feb 27–Mar 2 | Bug fixes, load test, production deploy |

---

## Key Decisions

### 1. MVP Infrastructure: Vercel + Supabase
- Fastest path to March 2
- Greg confirmed CIL hosts the MVP
- Architecture is designed to migrate to FC's AWS infrastructure later (see portability decisions above)

### 2. Email Provider: Resend for MVP → SendGrid for Production
- Resend: simpler DX, faster setup, adequate for MVP
- SendGrid: Blaine's requirement for production
- Migration path: swap the provider in `email.ts`, update env vars, done

### 3. Dockerfile in Phase 0
- Write a 3-stage Dockerfile even though Vercel doesn't need it
- Cost: 20 minutes. Benefit: ECS deployment readiness, shows professionalism to Blaine/IT

### 4. Participant Auth: OTP Stays
- Okta is FC's tenant — USPS participants are not FC employees
- OTP with generic link is correct for external participants
- Blaine's Okta requirement applies to coaches (FC employees) and admins only (future)

### 5. Agent Strategy: Single-operator for Slice 1
- Schema + Slice 1 is tightly coupled — easier for one operator to own end-to-end
- Agent delegation becomes valuable in Slice 2+: parallel tracks (coach API + admin scaffolding) while main context handles frontend wiring

---

## Open Items Before Production (Not Blocking MVP)

| Item | Owner | Action |
|------|-------|--------|
| SendGrid account + sender domain | Tim/Amit | Set up when production migration begins |
| Okta application setup | Tim + Blaine | After MVP ships; Blaine owns Okta tenant |
| Terraform configs (RDS, ECS, ALB) | Amit | Write during Slice 3 or post-launch |
| `datasecurity@franklincovey.com` email | Tim | Start NDA/procurement process now |
| Production URL request | Amit → Blaine | Request `coaching.franklincovey.com` when ready |
| GitHub Actions → ECR workflow | Amit | After MVP is validated on Vercel |

---

*Next: Begin Phase 0 — install packages, write schema, spin up Supabase.*
