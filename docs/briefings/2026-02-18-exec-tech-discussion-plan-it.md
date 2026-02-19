# Executive Coaching Technology Discussion Plan (IT Version)

**Date:** 2026-02-18  
**Audience:** FranklinCovey IT, Security, Procurement, Platform Owners  
**Context:** USPS coaching MVP launch with phased migration to FranklinCovey production ecosystem

## 1) Objective

Establish technical, security, and operational alignment required to:
- Launch MVP on committed dates (Mar 2, Mar 9, Mar 16)
- Maintain controlled risk handling of PII and role-based access
- Execute a no-rewrite migration from MVP stack to FranklinCovey production standards
- Finalize procurement/governance ownership for continuity post-launch

## 2) Scope and Delivery Baseline

## In Scope (MVP)

- Participant portal: OTP access, 3-coach selection, one remix, final selection, Calendly handoff
- Coach portal: engagement visibility, session status + structured note logging
- Admin portal: participant CSV import, Day 5/10 nudges, Day 15 auto-assign, KPI dashboard, CSV export

## Locked Milestones

- 2026-02-26: staging beta with FC ops
- 2026-03-02: Slice 1 live (participant auth + coach selection + booking handoff)
- 2026-03-09: Slice 2 live (coach session logging + engagement tracking)
- 2026-03-16: Slice 3 live (admin import + nudges + dashboard + export)

## Locked Product/Domain Decisions

- Day 0 for nudge timing is `cohortStartDate`
- Session outcomes (coach-entered only): `COMPLETED`, `FORFEITED_CANCELLED`, `FORFEITED_NOT_USED`
- Separate coach pools (MLP/ALP vs EF/EL), no cross-pool matching in MVP
- API/state contract change control is active (breaking changes require explicit approval)

## 3) Target Technical Architecture

## Stage A: MVP Runtime (current delivery path)

- App runtime: Next.js 15 (App Router + API routes)
- Hosting: Vercel
- Data: Supabase PostgreSQL
- Auth (participant): OTP-based verification flow
- Auth (coach/admin): magic-link auth (MVP)
- Email: Resend (MVP)
- Scheduling integration: Calendly link handoff (no webhook dependency in MVP)

## Stage B: FranklinCovey Production Runtime (post-MVP)

- Compute: AWS ECS (containerized workload)
- Registry: ECR
- Data: AWS RDS PostgreSQL
- Infra as code: Terraform (RDS/ECS/ALB/ACM and related resources)
- Identity: Okta SSO for coach/admin personas
- Transactional email: SendGrid
- CI/CD: GitHub Actions pipeline to ECR/ECS
- DNS/TLS: FC-managed domain and certificate lifecycle

## Portability Design Principle

Migration is structured as integration/configuration transition, not domain-logic rewrite:
- PostgreSQL -> PostgreSQL
- Auth.js provider evolution for coach/admin (magic link -> Okta)
- Email provider abstraction (`email.ts` boundary)
- Containerized deployment artifact reused across environments

## 4) Security and Compliance Control Plan

## Data Classification and Boundaries

- System processes participant and coach PII, coaching metadata, and operational reporting data
- Environment separation required: dev/staging/prod with no raw production PII in non-prod by default
- Non-prod import path uses sanitize-by-default behavior; raw import requires explicit override

## Identity and Access Management

- Portal-segmented access: participant, coach, admin
- Least-privilege role enforcement across routes and data access
- Coach private notes isolated to coach context
- Coach/admin production auth target: Okta SSO
- Participant auth remains OTP due to external-user model

## Encryption and Transport

- At rest (production): AES-256 via RDS encryption configuration
- In transit: TLS enforced for all external endpoints
- Secrets: environment secret stores (Vercel now; AWS Secrets Manager target)

## Application Security Controls

- Input validation and enum constraints at API boundaries
- OTP controls: expiry, attempts threshold, replay prevention
- Rate limiting on auth-sensitive endpoints
- Immutable audit events for key state changes
- Audit event scope: OTP verification outcomes
- Audit event scope: coach selection and assignment state changes
- Audit event scope: session status updates
- Audit event scope: nudge execution actions

## Operational Security Controls

- Incident severity rubric with owner/on-call path
- Backup policy + restore verification cadence
- Access review cadence for privileged roles
- Change-control gate for breaking API/state transitions

## 5) Reliability and SLA Baseline

## Service Objectives

- Availability target: 99.9% monthly (production)
- P1 incident response: <= 1 hour
- P1 stakeholder update cadence: every 2 hours until mitigation
- P2 response: <= 4 business hours
- P3 response: next business day

## Recovery Objectives

- RPO: <= 24 hours
- RTO: <= 8 hours

## Change/Release Operations

- Weekly scheduled release window
- Emergency patch process for P1/P2 defects
- Versioned release notes and post-incident summaries

## 6) Procurement and Governance Workflow

## Required Procurement Actions

- Initiate workflow via `datasecurity@franklincovey.com`
- Assign FC owner: security review
- Assign FC owner: legal/procurement
- Assign FC owner: infrastructure onboarding
- Approve sender identity and domain posture
- Recommended sender: `coaching@franklincovey.com`
- Recommended app domain: `coaching.franklincovey.com`

## Governance Model

- Named decision owner on FC side with 24-hour turnaround on blockers
- Joint change-review for scope and breaking contract requests
- Weekly technical + operations governance checkpoint

## 7) Migration Workplan (Post-MVP)

1. Finalize procurement/security intake and owners.
2. Stand up Terraform baseline for RDS/ECS/ALB/ACM and secrets.
3. Configure Okta app and role claims for coach/admin authorization.
4. Integrate SendGrid sender identity and policy alignment.
5. Implement CI/CD promotion path to ECR/ECS.
6. Run cutover rehearsal in staging-equivalent environment.
7. Execute production cutover with rollback protocol and verification checklist.

## 8) Risks and Mitigations

- Procurement delay:
- Mitigation: start security intake immediately; track owner/date in call readout.
- Undefined sender/domain policy:
- Mitigation: lock sender and domain decision in current call.
- Decision latency near milestones:
- Mitigation: enforce 24-hour decision-owner SLA through Mar 16.
- Security expectation mismatch (MVP vs production):
- Mitigation: maintain explicit control matrix with milestone tags: "in place now" vs "due by production cutover."

## 9) Decisions Required in This Meeting

1. Approve staged ecosystem strategy (MVP stack now, FC production stack next).
2. Approve SLA baseline and incident severity definitions.
3. Confirm procurement entry and owner map.
4. Confirm production sender identity and DNS path.
5. Confirm production security sign-off checkpoints and approvers.

## 10) Immediate Post-Call Artifacts

- Decision log with owner + due date for each approved item
- Updated risk register with procurement/security dependencies
- Security control matrix versioned by milestone
- Migration backlog with acceptance criteria per workstream
