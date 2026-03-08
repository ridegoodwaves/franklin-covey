---
date: 2026-02-27
topic: admin-dashboard-scope
---

# Admin Dashboard Scope + Slice Reorder

## What We're Building

The admin dashboard gives Kari, Andrea, and Greg real-time visibility into participant coach-selection status, lagging engagement flags, and CSV-exportable reports. It's the primary ops tool for monitoring the two-week uptake window (March 2–16) before coaching sessions begin.

**Key decision:** Swap Slice 2 (coach portal, originally March 9) and Slice 3 (admin dashboard, originally March 16) to close a critical reporting gap. Admin dashboard ships March 9. Coach session logging portal ships March 16.

## Why This Approach

Kari needs a "has selected / has not" report by March 6 — four days after ALP-135 launches March 2. The original plan had the admin portal live on March 16, leaving no visibility during the highest-stakes uptake window.

The swap is feasible because:
- Admin dashboard depends only on Slice 1 data (participants + engagements), which exists from March 2.
- Session logging (coach portal) isn't needed until ALP-135 coaching starts March 12, and the 4-day gap (March 12–16) is accepted: coaches use booking links for scheduling, and any sessions can be retroactively logged once the portal is live March 16.

## Scope Alignment: Client Request vs Existing Plan

| Client Request | Plan Coverage | Notes |
|---|---|---|
| "Has / has not selected a coach" view | Engagement table, filterable by status | ✅ Already scoped |
| Simple report by March 6 | CSV export + dashboard | ✅ Now covered by March 9 target |
| Weekly coach selection report | Dashboard + on-demand CSV export | ✅ Pull-based (no scheduled email digest in MVP) |
| Identify lagging participants for USPS | Needs-Attention flags + CSV export | ✅ Already scoped |
| Who has scheduled a session (later) | Slice 3 coach portal (now March 16) | ✅ Still in scope, slightly later |
| Operational monitoring before coaching begins | Needs-Attention workflow, Day 5/10/15 flags | ✅ Aligned |

## Key Decisions

- **Slice reorder confirmed**: Admin dashboard → March 9 | Coach portal → March 16
- **ALP-135 gap accepted**: March 12–16 coaches self-manage via booking links; retroactive logging once portal is live
- **Weekly reports are pull-based**: Kari/Andrea pull CSV on demand or view the dashboard; no scheduled email digest in MVP
- **Simple binary report is served by existing scope**: The engagement table filtered by `INVITED` vs `COACH_SELECTED`, plus CSV export, covers the March 6 ask without new scope
- **March 6 deadline shifts to March 9**: No bridge or interim export needed. Kari's March 6 ask is being reset to March 9 — she needs to be informed of this change before launch.

## Open Questions

- Should the dashboard default view on login be the "Needs Attention" tab or the full engagement table? (Original plan says Needs Attention, but during early uptake the coach-selection list may be more useful)
- Who owns USPS nudge coordination — does Kari export + hand off to USPS ops, or does she need a formatted handoff template?

## Revised Slice Deadlines

| Slice | Feature | Deadline |
|---|---|---|
| Slice 1 | Participant auth + coach selection + scheduling link | March 2 ✅ unchanged |
| **Slice 2** | **Admin dashboard: KPIs, engagement table, needs-attention, CSV export** | **March 9 ← moved up** |
| **Slice 3** | **Coach portal: session logging + engagement tracking** | **March 16 ← moved out** |

## Next Steps

→ `/workflows:plan` to update the vertical slices plan with the new slice ordering and confirm Slice 2 task breakdown against the March 9 deadline.
