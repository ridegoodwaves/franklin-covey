# CIL Brief Delta Analysis

**Source**: CIL - FranklinCovey Coaching Portal Brief (Feb 2026)
**Compared against**: PRD v2.1 (franklincovey-coaching-platform-prd.md)
**Date**: 2026-02-11

## Critical Deltas (Change our approach)

### 1. Scale: 35 coaches + 150+ worldwide, NOT 5-10
- **PRD says**: 5-10 coaches, "list that fits on one screen"
- **Brief says**: 35 coaches for this engagement, 150+ coaches worldwide
- **Impact**: The "shuffle + take 3" simplification still works for participant selection, but coach management, admin dashboard, and filtering need to handle 35+ coaches. The "fits on one screen" rationale that justified simplifying coach matching is wrong at 35 coaches — but the 3-card selection UX is still correct because participants only see 3 at a time.
- **Action**: Update PRD scale assumptions. Admin coach management page needs search/filter/pagination.

### 2. 4 programs from day 1, NOT 1
- **PRD says**: Single government contract, 400 participants
- **Brief says**: 400 participants across **4 programs**
- **Impact**: Need a `Program` entity in the data model from MVP. Engagements belong to a Program. Admin dashboard needs program-level filtering. This was flagged as "future" in the strategic pivot section — it's actually MVP.
- **Action**: Add Program model to schema. Update admin dashboard for multi-program views.

### 3. Timeline: Coach Selector live March 2, NOT March 16
- **PRD says**: March 16 go-live for everything
- **Brief says**: Coach Selector preview late Feb, **LIVE March 2**. Full portal March 16.
- **Impact**: Coach selector is 2.5 weeks from brief date. This is the top priority — everything else can follow.
- **Action**: Prioritize coach selector as Phase 1. Coach portal + ops dashboard are Phase 2 (March 16).

### 4. Participant auth: Generic link + email lookup (Option B from Q19)
- **PRD says**: Open question (unique link vs generic link)
- **Brief says**: "Participant receives email link, enters approved email" + "No login required"
- **Impact**: This answers Q19 — it's a hybrid. They get an email with a link, but the link leads to an email verification screen (not a unique per-person token). Simpler than HMAC tokens.
- **Action**: Resolve Q19 as Option B. Simplify participant auth.

### 5. Coach filtering: location, credential, skills, language
- **PRD says**: Shuffle + take 3 (random selection, capacity-aware)
- **Brief says**: "Filter by location, credential, skills, language" before seeing 3 coaches
- **Impact**: Participant may need to filter/narrow before seeing 3 matches. Or: system uses these attributes for smarter matching. Need to clarify with client.
- **Action**: New question — is filtering participant-facing (they choose filters) or system-side (matching algorithm uses these attributes)?

### 6. 5-session cohort gets 20-min interview option
- **PRD says**: Chemistry interviews DEFERRED entirely
- **Brief says**: "5-session cohort gets 20-min interview option"
- **Impact**: Interviews are partially back in scope — but only for ~200 participants (5-session track). This is simpler than the full chemistry interview system we deferred (which had coach+participant confirmation, multiple states). A 20-min interview is likely just "book a short intro call via coach's Calendly link."
- **Action**: Clarify — is this a formal system feature or just "the 5-session people can book a 20-min call on the coach's Calendly before committing"?

### 7. Coach videos on profile
- **PRD says**: Bio, photo, specialties
- **Brief says**: "bio, video, Calendly link"
- **Impact**: Coach profiles need video embed/link support. Likely a YouTube/Vimeo URL displayed as embedded player.
- **Action**: Add `videoUrl` field to CoachProfile schema.

### 8. Sponsor teams (NEW concept)
- **PRD says**: Not mentioned
- **Brief says**: "Create/manage sponsor teams (coachee, leader, HR/talent partner)"
- **Impact**: Each engagement may have a "sponsor team" — the participant's manager and HR partner who have visibility into progress. This is a new entity and a new role type.
- **Action**: Need clarification on MVP scope. Is this March 16 or future?

### 9. Ops self-service: add programs, update profiles, change methodologies
- **PRD says**: Admin can manage coaches and import participants
- **Brief says**: "Configurable: add new programs, update profiles, change methodologies without needing us"
- **Impact**: Admin portal needs program CRUD, methodology management, and more self-service than currently designed.
- **Action**: Expand admin portal scope. Program management is MVP (see delta #2).

### 10. Monthly reports: new activity only, not historical dumps
- **PRD says**: CSV export
- **Brief says**: "Monthly reports show only new activity (not 20+ page historical dumps)" + "printable reports"
- **Impact**: Reporting needs a date-range filter and incremental view. Printable format needed (not just CSV).
- **Action**: Add report generation with date filtering and print-friendly layout.

### 11. Multiple dashboard views by role
- **PRD says**: Single admin dashboard
- **Brief says**: Dashboards for ops (all engagements), Kari (per-coach status across clients), Greg (portfolio-level quality)
- **Impact**: Need at least 3 dashboard views, not 1. Role-based dashboard customization.
- **Action**: Clarify which dashboards are MVP vs. future.

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
- **Kari Saddler** — Director of Coaching (master coach). Built Lovable prototypes. Success metric: "stability → space to disrupt"
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

### Kari's Lovable Prototype
- URL: https://lovable.dev/projects/e91f5432-4586-4210-a51d-f66e8b54378a
- Features she uses: Supervision workspace, Coaches page, Milestone report, Group Coaching, SurveyMonkey dashboard
- Main dashboard "not helpful" per Kari
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

- Q31: Is coach filtering (location, credential, skills, language) participant-facing or system-side matching?
- Q32: Is the "20-min interview option" for 5-session cohort a system feature or just "book a short call on coach's Calendly"?
- Q33: Are sponsor teams (coachee's manager + HR partner) MVP scope or future?
- Q34: Which dashboard views are MVP? (Ops view / Kari's per-coach view / Greg's portfolio view)
- Q35: What are the "top 20 objectives" for session topic dropdowns? (Mentioned but not listed)
- Q36: Does "printable reports" mean browser print CSS or generated PDF?
- Q37: What methodologies need to be configurable? (Referenced but not defined)
- Q38: Kari's Lovable prototype — which features should we match vs. reimagine?
- Q39: NDA/IT procurement timeline — blocking factor for accessing FC infrastructure?
- Q40: March 9 week (Amit at Mayo Clinic) — what's the continuity plan?
