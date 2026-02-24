# Blaine (CTO) Call Prep — Friday, Feb 20, 2026

## Goal for This Call

Lock the minimum technical and governance decisions needed to protect March MVP delivery while keeping a clean path to FranklinCovey production standards.

## 20-Minute Agenda

1. Context + current status (3 min)
2. MVP architecture and why it is time-safe (4 min)
3. Security and domain/email authorization decisions (5 min)
4. Managed services + SLA/support posture (3 min)
5. Production migration handshake (3 min)
6. Owners, dates, and close (2 min)

## 60-Second Opener (Use This)

"We have locked MVP scope and dates, and we are implementing on Vercel + Supabase for launch speed. We designed the stack for portability so we can migrate to FC's AWS/Okta/SendGrid standards without rewrite. Today we want to lock five CTO-level decisions so there is no delay risk to March delivery and no ambiguity on production governance."

## Five Decisions to Lock on This Call

1. Sender identity decision  
- Confirm whether FC approves `coaching@franklincovey.com` as sender.
- If yes, confirm FC IT will complete Resend domain authorization DNS records.
- If no, approve interim sender domain we control for MVP.

2. Domain authorization path  
- Confirm who owns DNS updates and expected turnaround.
- Confirm SPF/DKIM/DMARC alignment requirements for outbound mail.

3. Procurement/security owner map  
- Confirm who owns security intake and procurement workflow.
- Confirm kickoff route via `datasecurity@franklincovey.com`.

4. Production target confirmation  
- Reconfirm AWS ECS/ECR, RDS PostgreSQL, Okta (coach/admin), SendGrid.
- Confirm this is post-MVP cutover, not a March 2 blocker.

5. Sign-off checkpoints  
- Define security sign-off checkpoint for MVP launch.
- Define production-readiness sign-off checkpoint for migration.

## What to Say If Challenged on MVP Stack

### "Why not deploy directly into FC infra now?"

"Given the March timeline, MVP on Vercel + Supabase reduces setup lead time and protects launch date. We are still building to portable boundaries: PostgreSQL-to-PostgreSQL, auth provider swap, email provider abstraction, and container path for ECS."

### "How are you handling identity and PII?"

"Participants use OTP because they are external users. Coach/admin access moves to Okta in FC production. We enforce role boundaries, limit sensitive data visibility (coach private notes), and keep non-prod data handling sanitized by default."

### "Can you legally send from franklincovey.com today?"

"Only with FC-approved sender authorization and DNS verification. Without that, we use an approved interim sender domain to avoid spoofing and deliverability risk."

## If Asked: Managed Services + SLA/Support

### Managed Services Position

- MVP uses managed services intentionally for speed and reliability: Vercel (app hosting) and Supabase (managed PostgreSQL).
- Shared responsibility: platform providers handle infrastructure reliability/patching at their layer.
- Shared responsibility: CIL owns application behavior, access controls, release quality, and incident response workflow.
- Post-MVP production target remains FC-standard AWS/Okta/SendGrid with equivalent operating controls.

### SLA/Support Position (Proposed Baseline)

- Availability target: 99.9% monthly (production target posture).
- Incident target P0: 1-hour initial response, same-day active triage.
- Incident target P1: next build window (typically <=24 hours).
- Incident target P2: scheduled via backlog and milestone capacity.
- Communication cadence for P0: frequent status updates until stabilized.
- Build-phase communication: daily "last 24 hours" change log summary.

### One-Liner if Blaine Asks "Who Owns Support?"

"CIL owns application support and incident triage; managed providers own their platform layer; FC owns domain/DNS/identity approvals and production infrastructure governance for final cutover."

## Non-Negotiables (Do Not Leave Ambiguous)

- Sender/domain decision and owner.
- DNS authorization turnaround expectation.
- Procurement/security intake owner.
- Confirmation that production stack decisions do not block March 2 MVP go-live.

## Items That Can Wait (Without Blocking Start)

- EF/EL window-close reporting rule details.
- KPI presentation preferences.
- CSV duplicate-handling behavior tuning.
- ALP-138 schedule correction.

## Live Notes Template (Fill During Call)

| Decision | Owner | Due Date | Status |
|----------|-------|----------|--------|
| Sender identity approved |  |  |  |
| DNS records for sender complete |  |  |  |
| Security/procurement intake started |  |  |  |
| MVP vs production stack sign-off |  |  |  |
| Security sign-off checkpoints defined |  |  |  |

## 30-Second Close

"Great, we will send a decision readout today with owners and dates. Anything unresolved will be tagged as risk with an owner and deadline. That keeps implementation moving immediately while preserving security and infrastructure alignment."
