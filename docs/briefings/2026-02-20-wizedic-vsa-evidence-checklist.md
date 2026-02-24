# Wizedic VSA Evidence Checklist

**Date:** 2026-02-20  
**Purpose:** Prepare a complete first-pass VSA submission package for Karen Ballou with clear owners, sources, and open gaps.

## 1) Kickoff Info to Request from Karen

Ask Karen to confirm these before filling the questionnaire:

1. VSA due date and target review window.
2. Whether a conditional launch path is allowed while VSA is in progress.
3. Minimum controls/evidence required pre-launch vs post-launch.
4. Who final sign-off approvers are (security + legal + IT).
5. How remediation comments are tracked in Wizedic.

## 2) Submission Owners

| Workstream | Primary Owner | Backup |
|---|---|---|
| Security questionnaire completion | Amit | Tim |
| Legal/commercial responses (NDA/MSA/SOW) | Tim | Christian Olson |
| Infrastructure/security control details | Amit | Blaine + Mike/Ivan |
| Evidence file collection and upload | Amit | Tim |

## 3) Evidence Checklist (Fill Status)

Status values: `Not Started`, `In Progress`, `Ready`, `Submitted`

| Item | Why VSA asks for it | Owner | Source / Where to get it | Status | Gap / Action |
|---|---|---|---|---|---|
| Company profile (legal entity, service description) | Vendor identity and scope | Tim | CIL company profile + engagement summary | Not Started | Prepare 1-page profile |
| Architecture overview (MVP + target FC production) | Security and hosting model | Amit | `franklin-covey/docs/briefings/2026-02-20-blaine-cto-call-prep.md` | In Progress | Add diagram image/PDF |
| Data flow + PII categories | Privacy and risk classification | Amit | `franklin-covey/docs/plans/2026-02-18-fc-project-plan.md` + status note | In Progress | Add explicit retention/deletion statement |
| Auth model (current + migration) | IAM and identity assurance | Amit | `franklin-covey/docs/drafts/2026-02-18-mvp-contract-v1.md` | Ready | Confirm Okta migration milestone date |
| Email sending model and domain authorization | Spoofing/deliverability risk | Tim + Amit | Project plan + CTO prep docs | In Progress | Confirm approved sender + DNS owner |
| Current dependencies inventory | Supply chain security | Amit | `franklin-covey/package.json` | Ready | Add planned backend dependencies addendum |
| Vulnerability scanning process | SDLC security controls | Amit | FC GitHub scanning plan (to be created) | Not Started | Set up FC org repo + scans |
| Code access/review model | Secure development governance | Amit + Blaine | FC GitHub access model | Not Started | Confirm fork/mirror and reviewers |
| Environment isolation controls | Prevent cross-env risk | Amit | `franklin-covey/docs/briefings/2026-02-18-status-note-for-tim-implementation-readiness.md` | Ready | None |
| Incident response + severity model | Operational resilience | Tim + Amit | Project plan P0/P1/P2 + SLA sections | Ready | Add contact/escalation roster |
| Backup/restore posture and RPO/RTO | Disaster recovery | Amit | CTO prep + infrastructure notes | In Progress | Add provider-specific backup cadence |
| Subprocessor list (current + planned) | Third-party risk transparency | Tim + Amit | Current: Vercel/Supabase/Resend; planned: AWS/Okta/SendGrid | In Progress | Confirm exact services by environment |
| Security attestations (SOC 2 or equivalent) | Control assurance evidence | Tim | Vendor trust center docs + CIL docs | Not Started | Only submit verified evidence |
| Privacy/legal docs (NDA/MSA/SOW status) | Contractual risk controls | Tim + Christian Olson | Legal thread/docs | In Progress | Confirm current status and approvers |
| Migration plan to FC infra (~30 days post launch) | Operationalization confidence | Amit + Mike/Ivan | CTO prep + implementation timeline | In Progress | Add dated milestone plan with owners |

## 4) Likely Wizedic Question Buckets (Prep Answers)

1. Company and service scope.
2. Data handling, PII, retention, and deletion.
3. Identity and access control model.
4. Infrastructure/hosting and change management.
5. Secure development lifecycle and vulnerability management.
6. Incident response and business continuity.
7. Subprocessors and third-party risk.
8. Legal/compliance artifacts and contractual controls.

## 5) 24-Hour Prep Pack (Recommended)

Compile these files into a single VSA folder before kickoff:

1. One-page architecture and migration summary (MVP -> FC production).
2. Dependency inventory (`package.json`) with planned backend dependencies section.
3. Data classification and PII handling note.
4. Incident/SLA note (P0/P1/P2, response targets, escalation).
5. Subprocessor register (current and planned by environment).
6. Legal status summary (NDA/MSA/SOW owners + current state).
7. GitHub security scanning plan for FC org repository.

## 6) Red Flags to Avoid in Responses

1. Do not claim SOC 2 unless you can provide formal evidence.
2. Do not describe controls as implemented if they are still planned.
3. Do not imply `@franklincovey.com` sending is active before FC DNS authorization.
4. Do not leave owner/date fields blank on remediation items.

## 7) Suggested Response Style in Wizedic

- Be explicit about `current state` and `target state`.
- Include owner + date for any control not yet fully in place.
- Keep language factual and implementation-specific.
- Link each answer to a document or artifact whenever possible.

