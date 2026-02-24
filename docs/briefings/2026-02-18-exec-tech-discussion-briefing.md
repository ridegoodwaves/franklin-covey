# Executive Coaching Technology Discussion Briefing

**Date:** 2026-02-18  
**Audience:** Greg Smith, Blaine Carter, FranklinCovey leadership  
**Prepared by:** Coaching Innovation Lab

## 1) Meeting Objective

Align on technology ecosystem, security posture, procurement path, and operating model so MVP can launch on time and migrate cleanly to FranklinCovey production standards.

## 2) How to Frame the Conversation (60-second opener)

"We have locked product scope and delivery milestones, and we have designed the platform to be portable from MVP hosting to FranklinCovey production standards without a rewrite. Today we want to confirm security and procurement guardrails, agree support/SLA expectations, and lock final ownership decisions so delivery risk stays low."

## 3) Project Decisions Already Locked

- MVP scope is fixed across 3 slices: Mar 2 (participant coach selection), Mar 9 (coach session logging), Mar 16 (admin import/nudges/dashboard).
- Platform model is fixed: participant portal, coach portal, admin portal.
- Program model is fixed for 4 programs: MLP, ALP, EF, EL.
- Coach pools are fixed and separated: MLP/ALP pool and EF/EL pool.
- Participant journey is intentionally simple: one visit, coach selection, Calendly booking, done.
- Day 0 for nudge timing is fixed to cohort start date.
- Session outcomes are coach-entered only in MVP: `COMPLETED`, `FORFEITED_CANCELLED`, `FORFEITED_NOT_USED`.
- Contract and change-control model are locked for MVP behavior/API/state transitions.

## 4) Delivery Status (Be Explicit)

- Frontend product surfaces are in place.
- Backend architecture, schema, security controls, and migration plan are documented and locked.
- Core backend implementation is not yet complete in the current repo state, so security should be presented as "implemented controls" vs "committed controls by milestone."

## 5) Technology Ecosystem Briefing

### MVP ecosystem (speed + controlled risk)

- App: Next.js 15 (single repo, API routes + portals)
- Data: PostgreSQL on Supabase (Prisma planned as ORM layer)
- Hosting: Vercel
- Auth: Participant OTP; Coach/Admin magic link (MVP)
- Email: Resend (MVP path)
- Scheduling: Calendly links

### Production target ecosystem (FC standard)

- Hosting: AWS ECS/ECR
- Database: AWS RDS PostgreSQL (Terraform-provisioned)
- SSO: Okta for coach/admin access
- Email: SendGrid
- CI/CD: GitHub Actions -> ECR -> ECS
- DNS/TLS: FC-managed domain + modern SSL (ACM)

### Portability message

The system is being built so migration is configuration/integration work, not product rewrite:
- PostgreSQL to PostgreSQL
- Auth.js provider swap for coach/admin
- Email provider swap behind one abstraction
- Dockerized deployment path

## 6) Security Briefing (Industry-standard baseline)

### Identity and access

- Role-segmented access model by portal (participant, coach, admin).
- Coach private notes remain coach-only.
- Coach/admin migrate to Okta SSO in FC production.
- Participant OTP flow remains external-user friendly and independent of FC identity tenant.

### Data protection

- AES-256 at rest in production (RDS encryption).
- TLS in transit.
- PII minimization in logs and exports.
- Sanitized import workflow for non-production test data.

### Application security controls

- Input validation and constrained enums for critical status transitions.
- Rate limiting and OTP attempt/expiry controls.
- Auditability for key state changes (selection, auto-assign, session status updates).
- Environment segregation: dev/staging/prod controls and secret management.

### Operational security controls

- Incident triage and escalation path.
- Backup and restore validation for production DB.
- Access review cadence for admin/coach roles.
- Change control for API/state-contract breaks.

## 7) Standard SLA Package to Propose

### Service levels

- Availability target: 99.9% monthly uptime (production).
- Support window: business-hours coverage with on-call escalation for P1 incidents.
- P1 response: 1 hour; restore/update cadence every 2 hours.
- P2 response: 4 business hours.
- P3 response: next business day.

### Reliability and recovery

- RPO target: <= 24 hours.
- RTO target: <= 8 hours for production outage.
- Daily automated backups with recovery drill cadence.

### Change and release

- Weekly release cadence with emergency patch path.
- Versioned change log for stakeholder visibility.
- Formal change request process for scope/contract changes.

### Reporting cadence

- Weekly: open incidents, bug queue, delivery status.
- Monthly: uptime summary, security events summary, performance trends.

## 8) Procurement and Governance Briefing

- NDA/procurement entry point: `datasecurity@franklincovey.com`.
- Confirm legal/commercial owner and security review owner on FC side.
- Confirm production sender identity (recommended: `coaching@franklincovey.com`).
- Confirm production DNS target (recommended: `coaching.franklincovey.com`).
- Define code ownership, access model, and handoff expectations before production cutover.
- Keep a named FC decision owner with 24-hour turnaround for blockers through Mar 16.

## 9) Decisions to Ask For on This Call

1. Approve MVP-to-production ecosystem path (Vercel/Supabase now -> AWS/Okta/SendGrid next).
2. Approve SLA baseline and incident severity definitions.
3. Confirm procurement start date and owner workflow.
4. Confirm production email sender/domain and DNS path.
5. Confirm security sign-off checkpoints and approver names.

## 10) Close Script (30 seconds)

"If we lock these five decisions today, we keep the launch dates intact while meeting FranklinCovey's long-term security and infrastructure standards. We'll send a one-page decision readout immediately after the call with owners and dates."
