# Session Handoff - Coach Selector MVP UI + Brainstorm

**Date**: 2026-02-12
**Branch**: main
**Repo**: franklin-covey
**Status**: UI Updated, Backend Pending

---

## Accomplished This Session

### Brainstorming (Complete)
- Explored Coach Selector MVP scope through collaborative dialogue
- Made 7 key design decisions (see below)
- Assessed existing codebase (640-line select-coach, 836-line engagement page)
- Identified 15 open questions across 3 research agents

### Design Decisions Made
| Decision | Choice |
|----------|--------|
| Filtering | Participant-facing: location, language, skills/focus, credentials |
| UX Flow | Filter first, then show 3 matching coaches |
| Backend | Full stack: Next.js API routes + Prisma + PostgreSQL |
| Coach Video | Thumbnail on cards with play button overlay |
| Interview | Optional 20-min intro call for 5-session participants |
| Remix | "See Different Coaches" from same filtered pool, max 1 per visit |
| Build Strategy | Incremental: Week 1 = core + API, Week 2 = filters + video |

### UI Updates (Complete)
1. **Tailwind config** - Added FC brand color scale (`fc-50` through `fc-950`) based on Blue Ribbon `#3253FF` and Mirage `#141928`
2. **Select-coach page** (complete rewrite):
   - Expanded from 8 to 15 coaches with new fields: credentials, languages, location, videoUrl, meetingBookingUrl
   - Added working filter bar (location, language, focus area, credentials) with active filter badges
   - Added video thumbnail component with play button overlay
   - Added video player modal (placeholder for hosted content)
   - Added intro call CTA in confirmation modal for 5-session participants
   - Updated Fisher-Yates shuffle algorithm
   - Updated branding from gold to FC blue accent
   - Mobile-responsive filter toggle
   - "No coaches match" empty state for filter combinations
3. **Landing page** - Updated to FC blue branding (bg-fc-950, fc-600 accents, fc-400 hero text)
4. **Engagement page** - Added credentials, languages, location, meetingBookingUrl to coach data model; updated branding to FC blue

### Implementation Plan (Complete)
- Full plan at `.claude/plans/fluttering-stirring-jellyfish.md`
- Covers Week 1 (backend + core) and Week 2 (filters + video + polish)
- ~30 new files, ~5 modified files identified
- API route design, Prisma schema, component hierarchy documented

---

## Key Files Modified

- `tailwind.config.ts` - Added `fc` color scale (FC brand blue #3253FF)
- `src/app/participant/select-coach/page.tsx` - Full rewrite: 15 coaches, filters, video, intro call CTA
- `src/app/page.tsx` - Landing page FC blue branding
- `src/app/participant/engagement/page.tsx` - Coach model expanded, FC blue branding

## Key Files to Reference

- `.claude/plans/fluttering-stirring-jellyfish.md` - Full implementation plan
- `franklin-covey/docs/CIL-BRIEF-DELTA-ANALYSIS.md` - CIL Brief deltas
- `prd_for_apps/franklincovey-coaching-platform-prd.md` - Full PRD

---

## Next Steps (Priority Order)

1. **Backend infrastructure** - Set up Prisma + PostgreSQL, create schema, seed 35 coaches (~2 hours)
2. **Auth flow** - iron-session email verification, middleware, participant email entry page (~2 hours)
3. **API routes** - `/api/coaches/match`, `/api/engagement/select-coach`, `/api/engagement/remix` (~3 hours)
4. **Swap hardcoded data for API calls** - Connect select-coach page to real backend (~2 hours)
5. **Review Kari's Lovable prototype** - Browse and document findings before Feb 18 workshop (~1 hour)
6. **Prepare Feb 18 workshop** - Mockups, open questions (Q31-Q40), recommended model (~2 hours)
7. **Commit all changes** - Stage and commit all files to franklin-covey repo

---

## Open Questions for Feb 18 Workshop

| # | Question | Must resolve by |
|---|----------|----------------|
| Q31 | Coaches program-specific or shared across all 4? | Feb 25 |
| Q26 | What booking tools do coaches use? | Feb 25 |
| NEW | Who provides 35 coach profiles? What format? | Feb 18 |
| NEW | Where are coach videos hosted? (YouTube/Vimeo/self?) | Feb 22 |
| NEW | Location format: city/state, timezone, or region? | Feb 22 |

---

## Uncommitted Changes

All changes are uncommitted. Files to stage:
- `tailwind.config.ts`
- `src/app/participant/select-coach/page.tsx`
- `src/app/page.tsx`
- `src/app/participant/engagement/page.tsx`

## Build Status

Build passes (`npm run build` succeeds). No type errors.

---

## Quick Start Next Session
```
Read the implementation plan at .claude/plans/fluttering-stirring-jellyfish.md.
Read franklin-covey/CLAUDE.md for project conventions.

Key context:
- Coach Selector MVP must ship March 2, 2026 to 400 participants
- UI is updated with filters, video thumbnails, FC blue branding, 15 demo coaches
- Next step: Set up Prisma + PostgreSQL backend (Week 1 of the plan)
- FC brand colors added to Tailwind: fc-50 through fc-950 (Blue Ribbon #3253FF)
- Design decisions captured: participant-facing filters, full stack, incremental delivery
- All changes are uncommitted — review and commit

Priority: Start backend infrastructure (Prisma schema + docker-compose + seed data).
```
