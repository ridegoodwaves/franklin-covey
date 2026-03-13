---
title: "EF/EL Coach Interview Message on Participant Selector"
type: brainstorm
date: 2026-03-09
trigger: Client request (Kari Sadler) — allow EF/EL participants to interview coaches before selecting
urgency: EF-1 coach selection opens March 16 (1 week)
---

# EF/EL Coach Interview Message — Brainstorm

## What We're Building

A conditional message on the coach selector page for **EF and EL participants only** (5-session programs) informing them they can contact Andrea Sherman to schedule an interview with a coach before making their selection.

**This is a lightweight workaround** — not a full interview scheduling feature. The full interview system is deferred to Phase 2. This gives EF/EL participants the option while keeping Phase 1 scope intact.

## Why This Approach

- **Phase 2 deferral stands** — building interview scheduling into the platform now risks the timeline and may only work for USPS
- **The platform already supports the return flow** — participants can re-enter their email and see their coaches again, so "interview then come back and select" works with zero backend changes
- **Minimal code change** — one conditional message block on the select-coach page, gated by program track

## Key Decisions

| # | Decision | Locked |
|---|----------|--------|
| 1 | **EF/EL only** — MLP and ALP participants do not see the interview message | Yes |
| 2 | **Contact person: Andrea Sherman** — consistent with existing HelpFooter; Kari's "contact me" routed through Andrea for ops consistency | Yes |
| 3 | **Placement: below coach cards** on the select-coach page, above the HelpFooter | Yes |
| 4 | **Post-interview flow: participant logs back into the platform** and selects their coach through the normal flow (no manual entry by ops) | Yes |
| 5 | **Minimal backend change** — coaches API needs to include `programTrack` in response (already available internally) | Yes |
| 6 | **Gate condition: `ProgramTrack.FIVE_SESSION`** (covers both EF and EL; future 5-session programs inherit this automatically) | Yes |

## User Flow

```
EF/EL participant enters email → verified → sees 3 coach cards
                                              ↓
                            [Below cards, above HelpFooter]
                     "Want to interview a coach first?"
                     "Contact Andrea Sherman at andrea.sherman@franklincovey.com
                      to schedule a brief introductory call."
                     "You can return to this page anytime to make your selection."
                                              ↓
            Option A: Select coach now     Option B: Contact Andrea → interview
                    ↓                               ↓
             Confirmation page              Interview happens offline
                                                    ↓
                                         Participant returns to platform link
                                                    ↓
                                         Re-enters email → sees coaches → selects
                                                    ↓
                                             Confirmation page
```

## Implementation Notes

- **Data gap:** The select-coach page currently has `programTrack` as hardcoded stub data (`CURRENT_PARTICIPANT` at line 53). The verify-email and coaches APIs do not return `programTrack` to the frontend today. The coaches API (`/api/participant/coaches`) already has the program context internally (line 38 references `context.program.pool`), so including `programTrack` in the response is a small addition — but it is a backend change.
- Gate on `ProgramTrack.FIVE_SESSION` rather than hardcoding program codes (`EF`, `EL`) so future 5-session programs inherit the behavior
- Style as an `fc-50` info card (consistent with existing informational blocks on the confirmation page)
- No new components needed — inline conditional in `select-coach/page.tsx`

## Message Copy (Draft — Needs Client Approval)

> **Want to meet your coach first?**
> You have the option to schedule a brief introductory call with a coach before making your selection. Contact Andrea Sherman at andrea.sherman@franklincovey.com to arrange an interview. You can return to this page anytime to make your final selection.

**Note:** Exact copy should be reviewed with Kari/Andrea before shipping. The above is a starting point.

## Timeline

| Cohort | Coach Selection Opens | Status |
|--------|----------------------|--------|
| EF-1 | March 16 | **Ship by March 15** |
| EL-1 | March 30 | Covered by same change |
| EF-2 | April 13 | Covered |
| EL-2 | May 4 | Covered |

## Known Trade-offs

- **Coach randomization on return:** When a participant returns after interviewing, they may not see the same 3 coaches in their batch. They can use their one remix, or contact Andrea if the interviewed coach doesn't appear. This is an accepted limitation of the workaround approach — a pinned-coach mechanism would require backend changes and is out of scope.

## Open Questions

1. **Message copy approval** — Does Kari/Andrea want to review the exact wording before it goes live?
2. **Contact method** — Email only, or should a phone number also be included?

## Out of Scope

- Full interview scheduling system (Phase 2)
- Calendar/scheduling integration
- Interview tracking in the platform
- Any backend changes
- Changes to MLP/ALP participant experience

## References

- Client request: Kari Sadler (March 2026)
- Interview feature history: `docs/archive/CIL-BRIEF-DELTA-ANALYSIS.md` — "5-session cohort gets 20-min interview option"
- Deferred decision: `docs/archive/2026-02-17-usps-meeting-followup.md` — "No intro call option for MLP/ALP"
- Coach selector page: `src/app/participant/select-coach/page.tsx`
- HelpFooter component: `src/components/participant/HelpFooter.tsx`
- Program admin config: `src/lib/config.ts` → `PROGRAM_ADMIN`
- EF/EL timeline: `fc-assets/cohort-timelines/FY26 Coaching Timelines_FranklinCovey-v3.md`
