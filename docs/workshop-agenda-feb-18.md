# Workshop Agenda — Feb 18, 2026

**Duration**: 90 minutes
**Attendees**: Amit, Tim, FC stakeholders (Andrea, Kari, Greg, Blaine/CTO)
**Objective**: Align on the minimum viable coach selector, coach portal, and ops dashboard — using their real data and constraints — so we can lock scope, decisions, and tradeoffs to confidently hit March 2 and March 16.
**Approach**: Partnership-style facilitation. Open-ended questions first, decisions emerge from understanding their world. We've built recommendations — we validate, not extract.

---

## Pre-Workshop Prep

- [x] Google Sheets shared with Tim (Decisions, Blockers, Timeline)
- [x] Open-ended questions prepared (docs/drafts/2026-02-16-workshop-open-questions.md)
- [ ] Amit reviews Tim's corrected proposal deck
- [ ] CSV template ready to hand Andrea
- [ ] 8:45 am sync with Tim on Feb 17 (dress rehearsal)
- [ ] Confirm attendee list — is Blaine joining?

---

## Workshop Flow (90 min)

### Opening — Tim leads (5 min)

Tim sets the tone. Relationship warmth, then the frame:

> "We've been heads down building. You're about to see what we've built. To make it real with your coaches and your participants, we need to align on a few key decisions today. This is the first step in a larger platform — what you see is designed to grow with your coaching practice."

Tim introduces Amit: "This is Amit — he built what you're about to see."

### Prototype Walkthrough — Amit leads (10 min)

Walk the participant happy path: landing page → enter email → OTP code → coach cards → select → engagement page. 3-4 minutes, clean.

Flash coach dashboard and ops dashboard — 1 minute each.

Then stop: "That's what ships March 2 with your real coaches and real participants. To get there, we need to align on a few things."

**Narrow questions during the walkthrough:**
- At coach cards: "Are these the right data points on each card? Anything missing?"
- At selection confirmation: "Is this the right next step after selecting a coach?"

**Redirect if design feedback comes up:** "We'll share a link so your team can click through and send UI feedback this week. Today let's focus on the decisions that unlock the build."

### Long-Term Vision Beat — Tim leads (3 min)

> "What we're building isn't a one-off tool for this engagement. The architecture supports multiple programs, multiple clients, and scales with your coaching practice. The March 2 launch is one program on a system built to handle many."

This addresses Greg's "infrastructure for the full platform" requirement and positions the MVP as step 1.

Transition question for Greg: **"Beyond this first engagement, what does success look like for the coaching platform a year from now?"**

### Understanding Coach-Participant Matching (15 min)

**Open-ended questions:**
- "Walk us through what happens today when a new participant gets matched with a coach. What does that process look like manually?"
- "When a participant is looking for a coach, what matters most to them? Is it location? Language? Specialty? Or more of a gut feeling from the bio and video?"
- "How do you think about coach-participant fit — is it something the participant should drive, or something your team has better judgment on?"
- "What would a bad match look like? What are you trying to avoid?"

**What we're listening for:** Whether the filtering approach should be participant-driven (they browse and filter), system-driven (algorithm matches), or a hybrid (1-2 filters + shuffled pool). Our recommendation is the hybrid, but let the answer emerge.

**If time:** "For the 5-session participants, tell us about the intro call. What's the goal of that conversation and how does it work today?"

### Understanding Their IT & Email Environment (10 min)

**Open-ended questions:**
- "Help us understand your IT environment. When you think about where this platform lives long-term, what does that look like?"
- "What's your team's experience been with deploying new tools? How does that process typically work with your IT group?"
- "When your participants get emails from FC today — coaching assignments, reminders — where do those come from? Internal system or third-party tool?"
- "Have you run into issues with internal mail systems blocking emails from external tools?"
- "Is there a preference for where participant data lives? Any data residency requirements?"

**What we're listening for:** Whether we can deploy on cloud now (we've already started), what email constraints exist, and how long their IT procurement process takes. If the answer suggests months of procurement, the case for cloud-first makes itself.

### Understanding Participant Re-Engagement (10 min)

**Open-ended questions for Andrea:**
- "When an engagement stalls today — a participant hasn't booked a session in a few weeks — how do you find out about it? What does your current process look like?"
- "When a participant goes quiet, what's worked in the past to re-engage them?"
- "How much communication volume is too much? Are participants already getting a lot of emails from FC?"

**What we're listening for:** Whether dashboard flags are sufficient or whether email reminders are needed. Our recommendation is dashboard + one reminder email type (since the email pipes already exist for OTP). Let Andrea's workflow inform the approach.

### Decision Speed & Coach Data (10 min)

**Open-ended questions:**
- "Between now and March 2, there are going to be moments where we need a quick answer to keep moving. How does your team prefer to handle those? Who's the best person to go to?"
- "For the coach data — names, bios, photos, booking links — who on your side owns that information? Is it centralized or spread across different people?"
- "What does your ideal timeline look like for getting us that data?"

**Hand Andrea the CSV template** during this section. Concrete deliverable shows we're prepared.

### The Big Question (5 min)

Ask the room: **"What's the biggest risk you see between now and March 2? What keeps you up at night about this launch?"**

And: **"If we could only ship one thing perfectly by March 2, what would it be?"**

These reveal true priorities and give us permission to de-scope everything that isn't the answer.

### Decision Readback & Close — Together (12 min)

Amit reads back the decisions and alignment points from the session. Tim confirms: "That's what we agreed."

Tim leads the wrap:
- FC action items with owners and dates
- Amit/Tim action items and timeline
- Schedule Workshop #2 for admin/reporting deep-dive
- "We start building Wednesday. You'll see progress weekly."

**Buffer:** 10 minutes of slack built into the above. If a topic runs long, absorb it here.

---

## Parking Lot — Topics for Workshop #2

If these come up, acknowledge and park: "Great question — let's dig into that in our follow-up session."

- Reporting parameters in depth (what Kari wants vs Greg)
- Bulk import workflow (CSV format, duplicate handling, invitation email content)
- Coach portal session topics and outcomes (calibrated to FC methodology)
- Future roadmap (sponsor teams, AI matching, SurveyMonkey, multi-program admin UI)
- Workflow audit (map FC's manual processes for automation)

---

## Complexity Triggers — Have Ready If Needed

Not to present proactively, but to have on hand if FC asks for something that sounds simple but isn't:

| If they ask for... | The pragmatic version | Full version is... |
|---|---|---|
| Host on FC infrastructure day 1 | Build on cloud now, migrate when IT is ready. Same code, different address. | Blocked until we have infra access — could delay weeks |
| Free coach switching for participants | Ops handles reassignment manually for launch. Self-service post-launch. | State machine changes, capacity recalc, notifications to both coaches |
| 10 filters on coach selector | Pick the 2 that matter most. Add more based on real usage. | Each filter = query logic, zero-result UX, testing combinations |
| Full automated email nudges | Dashboard flags + one reminder email covers 90% of the need at 10% of the cost. | Template design, deliverability testing, inbox volume, DPA |
| Real-time dashboard updates | 60-second refresh handles 400 engagements fine. | WebSockets, connection management, fallback — different architecture |

**Response pattern:** Acknowledge the value → "Help me understand what you're hoping that solves" → collaboratively arrive at the pragmatic version → position full version as next phase.

---

## Tag-Team Roles

| Moment | Tim | Amit |
|---|---|---|
| Opening, warmth, framing | Lead | Listen, learn the room |
| Prototype walkthrough | Watch reactions | Drive the demo |
| Long-term vision beat | Deliver the business message | Support with technical credibility |
| Open-ended exploration questions | Translate to business impact | Ask the questions, listen |
| Pushback or emotional moments | Step in, use the relationship | Stay quiet |
| "Can we also add X?" | "Love it — let's capture for next phase" | Write it on parking lot |
| Decision readback | Confirm "that's what we agreed" | Read back the decisions |
| Close | Lead | Confirm dates and deliverables |

---

*Updated 2026-02-16. Revised from directive question style to partnership-style facilitation based on Tim's guidance. Reference: docs/drafts/2026-02-16-workshop-open-questions.md, docs/drafts/2026-02-16-workshop-prep-note-to-tim.md*
