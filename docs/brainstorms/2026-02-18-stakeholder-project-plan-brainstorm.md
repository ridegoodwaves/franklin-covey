# Brainstorm: Stakeholder Project Plan

**Date**: 2026-02-18
**Status**: Design decided — ready for `/workflows:plan`

---

## What We're Building

A single tiered markdown document that serves two audiences from one file:

1. **FC-facing exec summary** (top section) — Tim can copy this section and send it directly to Greg, Blaine, or Kari. Contains: what's being built, key milestones, what FC needs to provide, and what CIL delivers.
2. **Full milestone timeline** (middle section) — Detailed dates, owners, and dependencies for each build phase. For Tim's situational awareness.
3. **Tim's action items** (bottom section) — Internal only. Blockers Tim personally needs to drive: Blaine intro, email domain, NDA, production URL, etc.

---

## Why This Approach

A single tiered doc is preferable to two separate files because:
- All milestones stay in one place — no sync drift
- Tim controls what he shares by choosing which section to forward
- Easier to maintain as the project evolves week-to-week
- Consistent with existing project doc conventions (all in `docs/`)

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Primary audience | Tim (CIL internal) | He needs to run FC conversations and knows which parts to share |
| FC-shareable layer | Exec summary at the top | Copy-paste friendly — Tim doesn't have to edit, just forward |
| Format | Markdown (in `docs/plans/`) | Lives in repo, version-controlled, no extra tooling |
| Scope of timeline | All 3 slices + beta testing | March 2 / 9 / 16 hard deadlines already locked |
| Blocker format | Numbered action list with owner name | Tim needs to know what HE has to drive vs. what Amit handles |

---

## Document Structure (Planned)

```
docs/plans/2026-02-18-fc-project-plan.md
│
├── ── FC-SHAREABLE SECTION ──
│   ├── Project Overview (2–3 sentences)
│   ├── What We're Building (brief feature list)
│   ├── Key Milestones (table: date, milestone, status)
│   ├── What FC Needs to Provide (coach bios, participant list, beta time)
│   └── What CIL Delivers (platform + support)
│
├── ── FULL TIMELINE ──
│   ├── Phase 0: Foundation (Feb 18–21)
│   ├── Slice 1: Participant Coach Selector (Feb 22–March 2)
│   ├── Beta Testing with Kari (Feb 26)
│   ├── Slice 2: Coach Engagement Portal (March 3–9)
│   └── Slice 3: Admin + Nudge Emails (March 10–16)
│
└── ── TIM'S ACTION ITEMS [INTERNAL] ──
    ├── Blaine: IT approval + production infrastructure intro
    ├── Email domain: Propose coaching@franklincovey.com to Blaine
    ├── NDA/Procurement: Email datasecurity@franklincovey.com
    ├── Production URL: Request coaching.franklincovey.com from DNS team
    └── Contract: Follow up on Blaine sign-off
```

---

## What FC Needs to Deliver (Inputs)

These are blocking or near-blocking for the build:

| Item | Owner at FC | Needed By | Status |
|------|-------------|-----------|--------|
| Coach bios (30 MLP/ALP coaches) | Kari Sadler | ASAP (Feb 21 ideal) | Requested at workshop |
| Participant list (60 first cohort) | Kari Sadler | Feb 24 | Requested at workshop |
| Coach scheduling links (Calendly, etc.) | Kari Sadler | Feb 24 | Requested at workshop |
| Beta testing time (Kari + 1–2 staff) | Kari Sadler | Feb 26 (full day) | Verbally confirmed |
| IT approval (Blaine) | Tim to introduce | ASAP | Not yet reached |
| Email sender domain decision | Tim + Blaine | Feb 21 | Question raised |

---

## Open Questions — Resolved

1. **Post-MVP roadmap in exec summary?** → **Yes, brief teaser only.** One line: "Phase 2 roadmap (April+) available upon request." Signals CIL is thinking ahead without over-promising.
2. **Risk register?** → **Yes, top 3 risks only.** Blaine approval delay, coach data late from Kari, contract not signed before March 2. Shows CIL is tracking blockers proactively.
3. **Living doc or point-in-time?** → Treat as a living doc Tim updates as milestones complete. Date in filename makes the version clear.

---

## Approach Considered and Rejected

**Two separate docs** (`-shareable.md` + `-internal.md`): Cleaner separation but requires maintaining two files in sync. Given the project's fast cadence, they'd drift within days. Single tiered doc wins.

---

## Next Step

Run `/workflows:plan` to produce `docs/plans/2026-02-18-fc-project-plan.md`.
