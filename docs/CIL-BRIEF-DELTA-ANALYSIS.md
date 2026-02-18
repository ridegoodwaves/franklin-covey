# CIL Brief Delta Analysis

**Source**: CIL - FranklinCovey Coaching Portal Brief (Feb 2026)
**Compared against**: PRD v2.1 (franklincovey-coaching-platform-prd.md)
**Date**: 2026-02-11
**Updated**: 2026-02-17 (resolutions from workshop)

## Critical Deltas (Change our approach)

### 1. Scale: 35 coaches + 150+ worldwide, NOT 5-10 — RESOLVED
- **PRD says**: 5-10 coaches, "list that fits on one screen"
- **Brief says**: 35 coaches for this engagement, 150+ coaches worldwide
- **Impact**: The "shuffle + take 3" simplification still works for participant selection, but coach management, admin dashboard, and filtering need to handle 35+ coaches. The "fits on one screen" rationale that justified simplifying coach matching is wrong at 35 coaches — but the 3-card selection UX is still correct because participants only see 3 at a time.
- **Action**: Update PRD scale assumptions. Admin coach management page needs search/filter/pagination.
- **Resolution (Feb 17)**: Confirmed ~30 coaches for MLP/ALP shared panel. First cohort ~60 participants (not 400 all at once). 400 = total across all programs over 6 months. 15 per coach capacity fixed.

### 2. 4 programs from day 1, NOT 1 — RESOLVED
- **PRD says**: Single government contract, 400 participants
- **Brief says**: 400 participants across **4 programs**
- **Impact**: Need a `Program` entity in the data model from MVP. Engagements belong to a Program. Admin dashboard needs program-level filtering. This was flagged as "future" in the strategic pivot section — it's actually MVP.
- **Action**: Add Program model to schema. Update admin dashboard for multi-program views.
- **Resolution (Feb 17)**: Programs clarified: MLP (2-session, new managers), ALP (2-session, experienced), EF (5-session, new execs), EL (5-session, execs). MLP+ALP share ~30 coaches. EF+EL have separate panel (launches later). Schema `Program` model already in plan.

### 3. Timeline: Coach Selector live March 2, NOT March 16 — RESOLVED
- **PRD says**: March 16 go-live for everything
- **Brief says**: Coach Selector preview late Feb, **LIVE March 2**. Full portal March 16.
- **Impact**: Coach selector is 2.5 weeks from brief date. This is the top priority — everything else can follow.
- **Action**: Prioritize coach selector as Phase 1. Coach portal + ops dashboard are Phase 2 (March 16).
- **Resolution (Feb 17)**: Timeline confirmed. Feb 26 beta, March 2 coach selector live, March 9 first cohort training, March 23 first 5-session program. Already reflected in vertical slices plan.

### 4. Participant auth: Generic link + email lookup (Option B from Q19) — RESOLVED
- **PRD says**: Open question (unique link vs generic link)
- **Brief says**: "Participant receives email link, enters approved email" + "No login required"
- **Impact**: This answers Q19 — it's a hybrid. They get an email with a link, but the link leads to an email verification screen (not a unique per-person token). Simpler than HMAC tokens.
- **Action**: Resolve Q19 as Option B. Simplify participant auth.
- **Resolution (Feb 17)**: Confirmed. Generic link + OTP. Initial access link sent by USPS internally (not from FC/CIL domain). Already in vertical slices plan.

### 5. Coach filtering: location, credential, skills, language — RESOLVED (REMOVED)
- **PRD says**: Shuffle + take 3 (random selection, capacity-aware)
- **Brief says**: "Filter by location, credential, skills, language" before seeing 3 coaches
- **Impact**: Participant may need to filter/narrow before seeing 3 matches. Or: system uses these attributes for smarter matching. Need to clarify with client.
- **Action**: New question — is filtering participant-facing (they choose filters) or system-side (matching algorithm uses these attributes)?
- **Resolution (Feb 17)**: **Filters REMOVED entirely.** No participant-facing filters. Participants see 3 capacity-weighted randomized coaches. Bio + video are the primary selection drivers. "Our coaches are all excellent" — filtering is unnecessary for MVP.

### 6. 5-session cohort gets 20-min interview option — RESOLVED (DEFERRED)
- **PRD says**: Chemistry interviews DEFERRED entirely
- **Brief says**: "5-session cohort gets 20-min interview option"
- **Impact**: Interviews are partially back in scope — but only for ~200 participants (5-session track). This is simpler than the full chemistry interview system we deferred (which had coach+participant confirmation, multiple states). A 20-min interview is likely just "book a short intro call via coach's Calendly link."
- **Action**: Clarify — is this a formal system feature or just "the 5-session people can book a 20-min call on the coach's Calendly before committing"?
- **Resolution (Feb 17)**: EF/EL (5-session programs) launch later with separate coach panel. Not in scope for March 2 launch. Interview feature deferred to when 5-session programs go live.

### 7. Coach videos on profile — RESOLVED
- **PRD says**: Bio, photo, specialties
- **Brief says**: "bio, video, Calendly link"
- **Impact**: Coach profiles need video embed/link support. Likely a YouTube/Vimeo URL displayed as embedded player.
- **Action**: Add `videoUrl` field to CoachProfile schema.
- **Resolution (Feb 17)**: 32 of 34 coach videos already recorded. `videoUrl` field already in schema. Videos are a primary driver of participant coach selection (confirmed by Carrie).

### 8. Sponsor teams (NEW concept) — RESOLVED (DEFERRED)
- **PRD says**: Not mentioned
- **Brief says**: "Create/manage sponsor teams (coachee, leader, HR/talent partner)"
- **Impact**: Each engagement may have a "sponsor team" — the participant's manager and HR partner who have visibility into progress. This is a new entity and a new role type.
- **Action**: Need clarification on MVP scope. Is this March 16 or future?
- **Resolution (Feb 17)**: Not discussed in meeting. Remains deferred from MVP scope (confirmed by Tim in earlier call). Future roadmap.

### 9. Ops self-service: add programs, update profiles, change methodologies — PARTIALLY RESOLVED
- **PRD says**: Admin can manage coaches and import participants
- **Brief says**: "Configurable: add new programs, update profiles, change methodologies without needing us"
- **Impact**: Admin portal needs program CRUD, methodology management, and more self-service than currently designed.
- **Action**: Expand admin portal scope. Program management is MVP (see delta #2).
- **Resolution (Feb 17)**: Coach management + participant import confirmed for MVP. Program CRUD and methodology management deferred. Admin dashboard filtering by status and coach for MVP. Org/program filtering deferred.

### 10. Monthly reports: new activity only, not historical dumps — PARTIALLY RESOLVED
- **PRD says**: CSV export
- **Brief says**: "Monthly reports show only new activity (not 20+ page historical dumps)" + "printable reports"
- **Impact**: Reporting needs a date-range filter and incremental view. Printable format needed (not just CSV).
- **Action**: Add report generation with date filtering and print-friendly layout.
- **Resolution (Feb 17)**: Printable reports via `@media print` CSS already in plan. Date-range filtering for reports deferred to post-MVP. CSV export with filters confirmed. Session receipts (coach attestation) added as parking lot nice-to-have.

### 11. Multiple dashboard views by role — RESOLVED
- **PRD says**: Single admin dashboard
- **Brief says**: Dashboards for ops (all engagements), Carrie (per-coach status across clients), Greg (portfolio-level quality)
- **Impact**: Need at least 3 dashboard views, not 1. Role-based dashboard customization.
- **Action**: Clarify which dashboards are MVP vs. future.
- **Resolution (Feb 17)**: Ops dashboard (Andrea's daily workflow) + Executive summary view (Carrie/Greg). Two views, not three. "Needs Attention" as default dashboard view (top of page). Filtering by status and coach for MVP.

## Confirmed Alignments (Brief matches PRD)

| Feature | PRD | Brief | Status |
|---------|-----|-------|--------|
| 3-coach selection | Shuffle + take 3 | See 3 available coaches | Aligned |
| Capacity-weighted | maxEngagements, disappear when full | Capacity-weighted randomization | Aligned |
| Structured dropdowns | Topics/outcomes arrays, no free text | Structured dropdowns ONLY | Aligned |
| Automated nudges | 7/14/21 day thresholds | Overdue flags, automated alerts | Aligned |
| CSV export | Streaming CSV endpoint | CSV export | Aligned |
| Docker deployment | Docker standalone | Dockerized application | Aligned |
| PostgreSQL | Prisma + PostgreSQL | Managed PostgreSQL | Aligned |
| Coach Calendly links | meetingBookingUrl on CoachProfile | Calendly link on coach profile | Aligned |
| Role-based access | COACH, ADMIN roles | Role-based access control | Aligned (but needs more roles) |

## New Information (Not in PRD at all)

### Stakeholders
- **Greg Smith** — VP, budget authority. Success metric: "Do more with less."
- **Carrie Sadler** — Director of Coaching (master coach). Built Lovable prototypes. Success metric: "stability → space to disrupt"
- **Andrea Sherman** — Director of Operations. Success metric: "proactive instead of reactive"
- **Blaine** — CTO (technical questions sent to him)
- **Abby** — Ops coordinator (on maternity leave)

### Business Context
- FranklinCovey: publicly traded, global, 150+ coaches, 250+ active engagements, 65+ client orgs
- 97% coaching success rate (vs 50% industry)
- $6.9M USPS deal in pipeline — data reporting is key evaluation criterion
- Legacy portal: built 2011, crashed 2023, $20K to restore
- Manual reporting: 2+ weeks per cycle, Abby spends 40% of job on PDF reports
- CIL = Coaching Innovation Lab (Tim's entity)

### Carrie's Lovable Prototype
- URL: https://lovable.dev/projects/e91f5432-4586-4210-a51d-f66e8b54378a
- Features she uses: Supervision workspace, Coaches page, Milestone report, Group Coaching, SurveyMonkey dashboard
- Main dashboard "not helpful" per Carrie
- Must review before Feb 18 discovery workshop

### Technical Questions for Blaine (CTO) — Already Sent
1. Current hosting environment?
2. Docker container registry?
3. CI/CD pipeline?
4. Database provisioning?
5. Production URL + DNS?
6. Security/compliance (SSO, encryption, data residency)?
7. Outbound email restrictions?
8. NDA / IT procurement timeline?

These overlap heavily with our Q13-Q27. Many may get answered simultaneously.

## New Questions to Add to Tracker

- ~~Q31: Is coach filtering participant-facing or system-side?~~ **ANSWERED (Feb 17)**: No filters. 3 randomized coaches.
- ~~Q32: 20-min interview option — system feature or Calendly link?~~ **ANSWERED (Feb 17)**: Deferred. EF/EL launch later.
- ~~Q33: Sponsor teams — MVP or future?~~ **ANSWERED (Feb 17)**: Deferred. Future roadmap.
- ~~Q34: Which dashboard views are MVP?~~ **ANSWERED (Feb 17)**: Ops dashboard + executive summary. Two views.
- ~~Q35: What are the "top 20 objectives" for session topic dropdowns?~~ **ANSWERED (Feb 17)**: Two competency lists by program type (see `src/lib/config.ts`).
- Q36: Does "printable reports" mean browser print CSS or generated PDF? **→ Browser print CSS** (already in plan)
- Q37: What methodologies need to be configurable? **→ Deferred post-MVP**
- Q38: Carrie's Lovable prototype — which features to match? **→ Not discussed in workshop. Deferred.**
- ~~Q39: NDA/IT procurement timeline?~~ **ANSWERED (Feb 18)**: Tim to email `datasecurity@franklincovey.com` to start process.
- Q40: March 9 week (Amit at Mayo Clinic) — continuity plan? **→ Still open. Slice 2 deadline is March 9.**

---

## Production Infrastructure — Blaine (IT) Responses

**Received**: 2026-02-18 (Blaine = FC Head of IT / Procurement gatekeeper)

> These are the **production target** requirements. MVP is built on Vercel + Supabase and designed to migrate cleanly to this stack. See `docs/brainstorms/2026-02-18-mvp-foundation-sequence-brainstorm.md` for migration strategy.

| Question | Blaine's Answer | Impact |
|----------|----------------|--------|
| **Hosting environment** | AWS | Target: AWS ECS |
| **Container registry** | AWS ECS (accepts Docker images) | Push to ECR; ECS runs containers |
| **CI/CD** | GitHub with Actions | GitHub Actions → ECR push → ECS deploy |
| **Database provisioning** | PostgreSQL fine; prefer Terraform | Terraform configs needed for RDS provisioning |
| **Production URL / DNS** | Yes, they control DNS; need URL proposal | Request `coaching.franklincovey.com` when ready |
| **Security / compliance** | SSO with Okta required; AES-256 at rest; modern SSL | Auth.js + Okta provider for coaches/admins; RDS encryption flag; ACM for SSL |
| **Outbound email** | Integrate with SendGrid; asked what email it sends from | SendGrid replaces Resend in production; need to propose sender address |
| **NDA / procurement** | Start by emailing `datasecurity@franklincovey.com` | **Action: Tim to send this email** |

### Production Migration Checklist (post-MVP)

| Task | Owner | Notes |
|------|-------|-------|
| Email `datasecurity@franklincovey.com` | Tim | Start NDA + procurement now |
| Propose sender email address to Blaine | Tim/Amit | e.g. `coaching@franklincovey.com` |
| Request `coaching.franklincovey.com` DNS entry | Amit → Blaine | When production deploy is ready |
| Set up SendGrid account + sender domain | Tim/Amit | Swap from Resend; 1-line change in `email.ts` |
| Set up Okta application (coach/admin auth) | Blaine + Amit | Auth.js Okta provider; participants stay on OTP |
| Write Terraform configs (RDS, ECS, ALB, ACM) | Amit | After MVP validated on Vercel |
| GitHub Actions workflow: ECR push + ECS deploy | Amit | Replace Vercel deploy |
| Verify AES-256 at rest (RDS encryption flag) | Amit | Terraform: `storage_encrypted = true` |

### Design-for-Portability Decisions (already baked into MVP)

These decisions mean the migration is a config change, not a rewrite:

| Concern | MVP | Production | How it's portable |
|---------|-----|------------|-------------------|
| Database | Supabase PostgreSQL | AWS RDS PostgreSQL | `DATABASE_URL` only — Prisma is provider-agnostic |
| Email | Resend | SendGrid | Abstracted behind `src/lib/email.ts` |
| Auth (coach/admin) | Auth.js magic links | Auth.js + Okta provider | Same library, different provider config |
| Auth (participants) | Custom OTP (iron-session) | Custom OTP (unchanged) | USPS participants are not in FC's Okta tenant |
| Container | Dockerfile written in Phase 0 | AWS ECS pulls from ECR | Same Docker image, different registry destination |
| Env vars | Vercel dashboard | AWS Secrets Manager | Generic names (`DATABASE_URL`, `EMAIL_API_KEY`) map cleanly |
