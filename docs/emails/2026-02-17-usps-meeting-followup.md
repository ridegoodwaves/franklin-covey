# Meeting Follow-Up: USPS Coaching Platform MVP
**Date:** February 17, 2026
**To:** Kari Sadler, Andrea [Last Name], Greg [Last Name]
**From:** Tim & Amit, Coaching Innovation Lab
**Re:** USPS Coaching Platform — Decisions, Action Items & Next Steps

---

Hi Kari, Andrea, and Greg,

Thank you all for a productive session today. We covered a lot of ground and have clear direction on what we're building and how to get there. Below is a summary of what we decided, what we need, and what's next.

---

## Decisions Confirmed

### Coach Selector (Target: Live March 2)

| Decision | What We Agreed |
|---|---|
| **Access method** | Email link, no password — participants verify via email only |
| **Coach display** | 3 coaches shown per participant, randomized with capacity weighting |
| **Remix** | One remix allowed (3 new coaches). Original 3 are gone. One-way door with confirmation warning |
| **Selection flow** | Participant views coach profile → confirms selection → sees Calendly link to book first session. No intro call option for MLP/ALP |
| **Participant journey** | Ends at confirmation. Participants do NOT return to the platform after selecting a coach — no session tracking view for them |
| **Filters/search** | Removed. Participants see only their assigned 3 coaches, no filtering needed |
| **Auto-assignment** | Day 5: reminder email. Day 10: second reminder. Day 15: system auto-assigns a coach. Participants are informed upfront of this timeline |
| **Initial access link** | Sent by someone internal at USPS (not from FC/CIL domain) to avoid spam filters |

### Coach Portal

| Decision | What We Agreed |
|---|---|
| **Dashboard priority** | "Needs Attention" items displayed at top (not buried) |
| **Session logging** | Dropdowns only — no free-text on core fields. Fields: Date, Time, Session Number, Topic Category, Session Outcome |
| **Topic categories** | Based on managerial competencies list (Kari sending). Includes "Other" option with static note: *"Please email the coaching practice to describe the topic"* |
| **Session statuses** | Three options: (1) Session Completed, (2) Session Forfeited — Cancelled <24 hours, (3) Session Forfeited — Did Not Use |
| **Private notes** | Kept. Free-text field visible only to the individual coach — no one else sees it |
| **Session notes section** | Simplified to only show Topic Discussed + Session Outcome (previous session context section removed) |
| **Completion rate widget** | Kept — useful even for 2-session programs |

### Ops/Admin Dashboard

| Decision | What We Agreed |
|---|---|
| **Default view** | "Needs Attention" loads first |
| **Summary stats** | Total engagements, In Progress, Needs Attention, Completed, Cancelled |
| **Coach directory** | Shows each coach's active count, capacity, and status |
| **Filtering for MVP** | By status and by coach. Organization/program filtering deferred to future phase |

### Capacity & Matching

| Decision | What We Agreed |
|---|---|
| **Coach capacity** | Fixed at 15 per coach for MVP. No per-coach variability for now |
| **Matching approach** | Simple capacity-weighted randomization for MVP. Smart/AI matching is a future phase |
| **Coach panels** | MLP + ALP share one panel of ~30 coaches. EF + EL will have a separate panel (future) |
| **Scheduling tool** | Calendly across the board — all coaches must have a Calendly link |

### Infrastructure

| Decision | What We Agreed |
|---|---|
| **Hosting** | CIL builds on our own secure, Dockerized environment. Migrates to FC infrastructure when timing is right |
| **Front-end impact** | Zero. Coaches and participants see the same interface regardless of where it's hosted — "same furniture, different plumbing" |

---

## Deferred to Future Phases (Parking Lot)

These items were discussed and intentionally set aside for the MVP timeline:

1. **Smart coach-participant matching** (AI/background-based) — strong future value, needs a matching philosophy
2. **Variable capacity per coach** — will add a mechanism for coaches to set their own limits
3. **Participant background info in Coach Portal** — agreed it's valuable; coaches would see participant bio, job title, etc. when viewing their caseload
4. **Session receipts with coach attestation** — late-add from USPS client. We have the example receipt Kari shared and will assess feasibility separately
5. **Organization and program hierarchy filtering** in ops dashboard — critical for scaling beyond USPS
6. **Free-text session notes + AI insight extraction** — pending IT data governance clarity
7. **Coach capacity by program type** (4 categories from Kari's tracker) — future feature for opt-in by engagement type
8. **Automated email notification to coach on selection** — ops dashboard provides real-time visibility as interim solution

---

## Action Items

### From Franklin Covey

| # | Item | Owner | Due |
|---|---|---|---|
| 1 | Send coach bios and headshots | Kari | **Today (Feb 17)** |
| 2 | Send coach videos (32 of ~34 available) | Kari | **Today (Feb 17)** |
| 3 | Send participant data (names, emails, titles, bios) for first cohort | Kari | **Today (Feb 17)** |
| 4 | Send managerial competencies list (session logging dropdowns) | Kari | **Today (Feb 17)** |
| 5 | Send FY26 Coaching Timelines document | Kari | **Sent during meeting** |
| 6 | Follow up on 2 remaining coach videos | Kari/Andrea | **Feb 18** |
| 7 | Get Calendly links from all coaches (identify who needs to create one) | Kari | **Feb 19-20** |
| 8 | Reach Blaine for IT approval, NDA, and procurement | Kari/Greg | **Today / Tomorrow AM at latest** |
| 9 | Send example session receipt from client | Kari | **Sent in meeting chat** |
| 10 | Send capacity tracker screenshot (4 coaching types) | Kari | **When convenient (future reference)** |

### From Coaching Innovation Lab

| # | Item | Owner | Due |
|---|---|---|---|
| 1 | Review all received data and confirm data model | Amit | **Feb 18** |
| 2 | Set up secure hosting environment and database | Amit | **Feb 18-19** |
| 3 | Build Coach Selector core flow | Amit | **Feb 18-25** |
| 4 | Provide image/file requirements for coach photos | Amit | **Feb 18** |
| 5 | Share architecture diagram for IT review when Blaine is available | Amit | **Ready by Feb 19** |
| 6 | Assess session receipt feasibility | Tim/Amit | **Feb 20** |

---

## Key Dates

| Date | Milestone |
|---|---|
| **Feb 17-18** | Coach + participant data received from FC |
| **Feb 18** | Green light from FC (target) |
| **Feb 26** | Beta testing — internal testers (Kari, Andrea, Greg, Ashley Howard) + 2 USPS client contacts |
| **March 2** | Coach Selector goes live — USPS sends access links to first cohort (~60-90 participants) |
| **March 9** | First cohort in-person training begins — goal is most participants have already selected a coach |
| **March 16** | Five-session program prep (EF/EL selector launches week of March 16-23) |
| **March 23** | First five-session program (ALP cohort) goes live |

---

## One Critical Blocker

We need the green light from Blaine and IT to formally move forward. We understand you're pushing on this today, Kari, and we appreciate it. To be transparent about the timeline math: with March 2 as the launch date and a beta target of Feb 26, every day of delay compresses our testing window — which is where we catch the issues that matter most.

We're ready to begin the moment we hear back.

---

## How to Reach Us

For urgent blockers, reach out to Amit directly. For everything else, email Tim and Amit together and we'll turn it around same-day.

We're excited to make this real. Talk soon.

— Tim & Amit
Coaching Innovation Lab
