# Session Handoff - Backend Foundation Ready to Build

**Date**: 2026-02-18
**Branch**: feat/fc-brand-component-migration
**Status**: 🟡 In Progress — all decisions locked, zero backend code written, ready to build

---

## ✅ Accomplished This Session

### Doc Update Campaign (all 6 tasks complete)
- **Workshop agenda** (`docs/workshop-agenda-feb-18.md`) — added full Outcomes section with all Feb 17 decisions
- **Open questions** (`docs/drafts/2026-02-16-workshop-open-questions.md`) — all 6 sections marked ANSWERED with specific decisions
- **Brainstorm** (`docs/brainstorms/2026-02-12-mvp-ship-strategy-brainstorm.md`) — nudge strategy reversed, open questions resolved, pre-dev checklist updated
- **Implementation plan** (`docs/plans/2026-02-12-feat-mvp-backend-vertical-slices-plan.md`) — 20+ edits: filters removed, participant flow simplified, session statuses updated, nudge emails re-scoped, auto-assign added
- **Delta analysis** (`docs/CIL-BRIEF-DELTA-ANALYSIS.md`) — all 11 delta items marked with resolution status
- "Kari" → "Carrie Sadler" fixed across all 6 docs + pre-commit hook installed

### Schema & Domain Model Finalized
- **`src/lib/config.ts`** — replaced placeholder topics with real USPS competencies from Carrie:
  - `MLP_SESSION_TOPICS` (7 managerial competencies)
  - `EXECUTIVE_SESSION_TOPICS` (7 executive competencies for ALP/EF/EL)
  - `SESSION_TOPICS_BY_PROGRAM` map (program-aware lookup)
  - `NUDGE_THRESHOLDS` updated to Day 5/10/15 email schedule
  - `COACH_CAPACITY = 15`, `PROGRAM_TYPES` map added
- **ERD updated** in implementation plan:
  - `CoachProgramPanel` many-to-many join table (coaches ↔ programs)
  - `SessionStatus` enum: `COMPLETED | FORFEITED_CANCELLED | FORFEITED_NOT_USED`
  - `NudgeType` enum: `REMINDER_DAY5 | REMINDER_DAY10 | AUTO_ASSIGN | COACH_ATTENTION | OPS_ESCALATION`
  - `SessionNote` simplified to `topicDiscussed` + `sessionOutcome` (from arrays to single strings)
  - `NudgeLog` updated with `emailSent`, `sentAt`, `assignedCoachId`
  - `Program.code` + `Program.track` added; `Participant.programTrack` removed (track is on Program now)
  - `Engagement.autoAssigned` boolean added

### Infrastructure Decisions Locked
- **Blaine (FC IT) responses received** — AWS ECS, Terraform, Okta, SendGrid for production
- **MVP stays**: Vercel + Supabase. Greg confirmed. Production migration is post-MVP.
- **Design-for-portability** decisions documented:
  - Write `Dockerfile` in Phase 0 (ECS readiness)
  - Email abstracted behind `email.ts` (Resend now → SendGrid later)
  - Auth.js (magic links now → Okta provider later)
  - `DATABASE_URL` only (Supabase now → RDS later)
- **New brainstorm**: `docs/brainstorms/2026-02-18-mvp-foundation-sequence-brainstorm.md`

### CLAUDE.md Updates
- Participant flow documented: one-shot, ends at selection, no return visits
- Session status enum updated with real values
- Font/typography section auto-updated (system fonts, not Google Fonts)

---

## 🔄 In Progress

- Approach B (schema-first, just-in-time utilities) approved but not started
- Zero Prisma code written — ERD is fully designed and ready to implement

---

## 📋 Next Steps (Priority Order)

### TODAY — Phase 0 Foundation

1. **Install backend packages** (~15 min)
   ```bash
   npm install prisma @prisma/client iron-session @auth/prisma-adapter next-auth@beta resend react-email
   npm install -D tsx
   npx prisma init
   ```

2. **Write full Prisma schema** (~1–1.5 hrs)
   - File: `prisma/schema.prisma`
   - All models from ERD: Organization, Program, CoachProgramPanel, User, CoachProfile, Participant, VerificationCode, Engagement, Session, SessionNote, NudgeLog
   - All enums: EngagementStatus, SessionStatus, NudgeType, Role, ProgramTrack
   - All indexes and unique constraints from the plan
   - Use `--schema` flag to confirm against ERD in plan

3. **Set up Supabase + run migration** (~30 min)
   - Create Supabase project at supabase.com
   - Copy `DATABASE_URL` + `DIRECT_URL` to `.env`
   - `npx prisma migrate dev --name init`
   - `npx prisma generate`

4. **Create docker-compose.yml** (~20 min) — for local dev only
   - PostgreSQL 16 + PgBouncer + Mailpit
   - Mailpit: SMTP port 1025, web UI port 8025

5. **Write Dockerfile** (~20 min) — 3-stage build, non-root user, ready for ECS

6. **Seed script** (`prisma/seed.ts`) (~45 min)
   - 1 org (USPS engagement)
   - 4 programs: MLP, ALP, EF, EL (with correct tracks)
   - 5 sample coaches with CoachProgramPanel entries for MLP + ALP
   - 8 test participants (alice@test..., bob@test..., etc. per plan)
   - Sample engagements at various states

7. **`.env.example`** — document all required vars

### THEN — Slice 1 (March 2 deadline)

8. **OTP auth endpoints** (Days 2–3)
   - `src/lib/prisma.ts` — singleton
   - `src/lib/email.ts` — Resend wrapper (`sendOTP`, `sendMagicLink`, `sendNudge`)
   - `src/lib/errors.ts` — typed error classes
   - `src/app/api/participant/auth/request-otp/route.ts`
   - `src/app/api/participant/auth/verify-otp/route.ts`
   - `src/lib/participant-session.ts` — iron-session
   - `src/emails/participant-otp.tsx` — React Email template

9. **Coach selection API** (Day 3)
   - `src/lib/engagement-state.ts` — state machine
   - `src/app/api/participant/coaches/route.ts` — panel-scoped query
   - `src/app/api/participant/coaches/remix/route.ts`
   - `src/app/api/participant/coaches/select/route.ts` — SELECT FOR UPDATE

10. **Wire frontend + confirmation page** (Day 4)
    - Update `src/app/participant/select-coach/page.tsx` (remove filters, wire API)
    - Add `src/app/participant/confirmation/page.tsx` (flow ends here)
    - Remove/redirect `src/app/participant/engagement/page.tsx`

11. **Deploy to Vercel + Supabase** (Feb 25)
    - Set env vars in Vercel dashboard
    - Run `prisma migrate deploy` against Supabase

---

## 🔧 Key Files Modified This Session

- `src/lib/config.ts` — real USPS competencies, updated nudge thresholds, COACH_CAPACITY, PROGRAM_TYPES
- `docs/plans/2026-02-12-feat-mvp-backend-vertical-slices-plan.md` — ERD + 20+ workshop edits
- `docs/CIL-BRIEF-DELTA-ANALYSIS.md` — all deltas resolved, Carrie name fixed
- `docs/brainstorms/2026-02-12-mvp-ship-strategy-brainstorm.md` — questions resolved, nudge reversed
- `docs/drafts/2026-02-16-workshop-open-questions.md` — all sections ANSWERED
- `docs/workshop-agenda-feb-18.md` — Outcomes section added
- `docs/brainstorms/2026-02-18-mvp-foundation-sequence-brainstorm.md` — NEW (Vercel+Supabase + Blaine IT responses)
- `CLAUDE.md` — participant flow, session statuses, font system updated
- `.git/hooks/pre-commit` — "Kari" misspelling check for docs

---

## ⚠️ Blockers / Decisions Needed

1. **Email sender address** — Blaine explicitly asked "What email would it be coming from?" Need to decide before production. Suggestion: `coaching@cil.com` or `coaching@franklincovey.com`. Tim should propose this to Blaine.

2. **Production URL** — Need to request `coaching.franklincovey.com` from Blaine/DNS team when ready.

3. **NDA/Procurement** — Tim needs to email `datasecurity@franklincovey.com` to start the process.

4. **Supabase project** — Not yet created. Need to create at supabase.com and get `DATABASE_URL` before starting Phase 0.

5. **Old handoff files** — 3 old `SESSION_HANDOFF_*.md` files are deleted in working tree. These should be committed or cleaned up.

---

## 🚀 Quick Start Next Session

```
We're starting Phase 0 of the FranklinCovey Coaching Platform backend. All decisions are locked and the ERD is fully designed.

Today's goal: Write the Prisma schema, spin up Supabase, run the first migration, and write the seed script.

Reference:
- ERD: docs/plans/2026-02-12-feat-mvp-backend-vertical-slices-plan.md (ERD section)
- Domain constants: src/lib/config.ts
- Full implementation plan: docs/plans/2026-02-12-feat-mvp-backend-vertical-slices-plan.md

Start with:
1. `npm install prisma @prisma/client iron-session next-auth@beta resend react-email && npm install -D tsx && npx prisma init`
2. Write `prisma/schema.prisma` (full schema — all models, enums, indexes)
3. Set up Supabase project, add DATABASE_URL to .env
4. `npx prisma migrate dev --name init`
5. Write `prisma/seed.ts`
```

---

**Uncommitted Changes:** Yes — docs (all from this session), `src/lib/config.ts`, deleted old handoff files
**Tests Passing:** N/A — no backend code yet
