# Session Handoff - Design Audit + Spec Violation Fixes

**Date**: 2026-02-19
**Branch**: feat/phase-0-backend
**Status**: 🟡 In Progress — spec violations identified, fix in progress

---

## ✅ Accomplished This Session

### Repo Hygiene
- Merged `feat/fc-brand-component-migration` → `main` (fast-forward, no conflicts)
- Deleted dead branch `feat/fc-brand-foundation-alignment` (fully absorbed)
- Created `feat/phase-0-backend` branch off clean main

### Name Correction — Kari Sadler
- "Carrie" was the wrong spelling throughout all docs — correct name is **Kari Sadler**
- Replaced across 12 files using Python regex (preserved `@CarrieSadler` handle, unconfirmed)
- Pre-commit hook inverted: now flags "Carrie" as the misspelling
- MEMORY.md updated with correct name

### Cohort Schedule (FY26 Coaching Timelines — Kari Sadler)
- Full cohort schedule documented in `docs/plans/2026-02-18-fc-project-plan.md`
- MLP-80/81, ALP-135/136/137/138, EF-1 thru 5, EL-1 thru 3
- **ALP-135 starts 3/12** (not 3/16 — earliest participant access date; March 2 launch gives 10-day buffer)
- ALP-138 is new (June cohort, Session 2 ends Nov 6)
- EF has 5 cohorts, EL has 3 — platform runs through November 2026
- ⚠️ ALP-138 Session 2 start date conflict (shows 8/4 but Week 2 ends 8/6 — assumed 8/7, confirm with Kari)

### Clarifications Received and Documented
- **EF/EL coaches by March 16**: Confirmed hard date. Low added complexity — data task not feature task.
- **"Use or lose" enforcement**: Platform DOES need to enforce. Recommended: auto-forfeit cron + Day -7 pre-deadline email (medium complexity, fits Slice 3).
- **Session 2 nudge cadence**: Different from Day 5/10/15. Proposed: Day 14, Day 45, Day 75, Day -7 pre-deadline. Final numbers TBD with Kari.

### Doc Hygiene — Source of Truth Established
- Archived 14 historical/superseded docs to `docs/archive/`
- Active docs now: 2 plans + 1 brainstorm (sheet-sync) + solutions/
- Added **Agent Quickstart** block to CLAUDE.md with explicit 4-file read order
- `docs/briefings/` — new exec discussion docs (4 files, uncommitted)
- `google-sheets/` — Tim's sheet-sync CSVs and markdown (uncommitted)

### Stakeholder Project Plan
- `docs/plans/2026-02-18-fc-project-plan.md` — tiered doc (FC-shareable top, Tim's action items bottom)
- Includes: cohort schedule, open questions table, risk register, working cadence + feedback P0/P1/P2 system

### Design Research
- Audited current UI: identified 7 spec violations + "vibe codey" patterns
- Researched FC's actual digital brand (white, authoritative, no glassmorphism)
- Found design references: Lattice (multi-role), Rippling (portal switching), Chronus (coaching analog)
- Figma: OE Enterprise Design System, SmartHR UI Kit, Designo LMS Dashboards

---

## 🔄 In Progress

- **7 spec violations being fixed** (see Next Steps #1)
- `google-sheets/`, `docs/briefings/`, and several modified files uncommitted

---

## 📋 Next Steps (Priority Order)

### 1. Fix 7 Spec Violations (~45 min) ← IN PROGRESS THIS SESSION

| # | File | Violation | Fix |
|---|------|-----------|-----|
| 1 | `src/app/page.tsx` | Dark landing page + ambient blur orbs | White background, remove orbs |
| 2 | `src/app/participant/select-coach/page.tsx` | Glassmorphism filter bar (`bg-white/60 backdrop-blur-sm`) | Solid white card, remove backdrop-blur |
| 3 | Throughout | `emerald-*` and `amber-*` Tailwind classes (not in brand spec) | Replace with `fc-green` / `fc-golden` tokens |
| 4 | `src/app/participant/select-coach/page.tsx:439-480` | Video thumbnails with play button overlay | Text link only (`<a>Watch video</a>`) |
| 5 | `src/app/participant/select-coach/page.tsx:30,60,90` | `languages` field on coaches | Remove — not in bios, not in MVP spec |
| 6 | Coach cards in select-coach | Specialty badges rendered on card | Remove — not in MVP spec |
| 7 | All pages | Decorative stagger animations (`stagger-1` thru `stagger-6`) on every section | Remove decorative stagger; keep only intentional transitions |

### 2. Phase 0 — Backend Foundation (~3–4 hrs)
```bash
npm install prisma @prisma/client iron-session next-auth@beta resend react-email
npm install -D tsx
npx prisma init
```
Then:
- Write full Prisma schema (`prisma/schema.prisma`) — all 11 models, enums, indexes
- Create Supabase project, add `DATABASE_URL` + `DIRECT_URL` to `.env`
- `npx prisma migrate dev --name init`
- `docker-compose.yml` (PostgreSQL + Mailpit)
- `Dockerfile` — 3-stage, non-root user, ECS-ready
- `prisma/seed.ts` — 1 org, 4 programs, 5 sample coaches, 8 test participants
- `.env.example`

### 3. Open Questions for Kari (send this week)
1. ALP-138 Session 2 start — 8/4 or 8/7? (Week 2 ends 8/6)
2. MLP/ALP panel size — 15 coaches or ~30?
3. EF/EL coaching window close dates
4. Participant counts per cohort (for capacity math)
5. Session 2 nudge cadence — confirm Day 14/45/75/-7 proposal?

### 4. Pending Commits
- `google-sheets/` — Tim's sheet-sync CSV workflow
- `docs/briefings/` — exec discussion docs
- Modified: `CLAUDE.md`, `config.ts`, both plan docs

---

## 🔧 Key Files Modified This Session

- `CLAUDE.md` — Agent Quickstart block added
- `src/lib/config.ts` — Kari name fix, updated comment
- `docs/plans/2026-02-18-fc-project-plan.md` — full cohort schedule, P0 decisions, working cadence
- `docs/plans/2026-02-12-feat-mvp-backend-vertical-slices-plan.md` — updates
- `google-sheets/*.csv` + `google-sheets/*.md` — Tim's sheet-sync (new, uncommitted)
- `docs/briefings/` — 4 exec discussion docs (new, uncommitted)
- `.git/hooks/pre-commit` — now flags "Carrie" not "Kari"

---

## ⚠️ Blockers / Decisions Needed

1. **Supabase project** — still not created. Need `DATABASE_URL` before Phase 0 migration can run.
2. **Session 2 nudge cadence** — needs Kari confirmation before Slice 3 nudge implementation.
3. **EF/EL coaching window close** — needed for nudge system for exec programs.
4. **Panel size (15 vs ~30 for MLP/ALP)** — needed to validate capacity math.
5. **`@CarrieSadler` email handle** — if her name is Kari, her handle may be `@KariSadler`. Worth confirming before any email references to her handle in production.
6. **"Use or lose" cron complexity** — approach (B+C: auto-forfeit + pre-deadline email) approved in concept, not yet planned in detail.

---

## 🚀 Quick Start Next Session

```
We're on branch feat/phase-0-backend of the FranklinCovey Coaching Platform.

Session goal: Phase 0 backend foundation — Prisma schema, Supabase setup, Docker, seed.

Before writing any code, read:
1. CLAUDE.md (Agent Quickstart section)
2. docs/plans/2026-02-12-feat-mvp-backend-vertical-slices-plan.md (ERD + task checklist)
3. src/lib/config.ts (domain constants)
4. docs/plans/2026-02-18-fc-project-plan.md (cohort schedule + confirmed decisions)

Then:
1. npm install prisma @prisma/client iron-session next-auth@beta resend react-email && npm install -D tsx && npx prisma init
2. Write prisma/schema.prisma — all 11 models, all enums, all indexes from ERD
3. Set up Supabase project (supabase.com), add DATABASE_URL + DIRECT_URL to .env
4. npx prisma migrate dev --name init && npx prisma generate
5. Write docker-compose.yml (PostgreSQL 16 + Mailpit)
6. Write Dockerfile (3-stage, non-root, ECS-ready)
7. Write prisma/seed.ts

Hard deadline: platform live March 2. ALP-135 first participants access March 12.
```

---

**Uncommitted Changes:** Yes — `google-sheets/`, `docs/briefings/`, `CLAUDE.md`, `config.ts`, 2 plan docs
**Tests Passing:** N/A — no backend code yet
**Latest commits pushed:**
- `2fb64cb` chore: archive historical docs and add Agent Quickstart to CLAUDE.md
- `2dd38a4` docs: add full FY26 cohort schedule from Kari official timeline doc
- `dcde1d5` fix: correct Kari Sadler name across all docs and update pre-commit hook
