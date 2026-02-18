# Workshop Open-Ended Questions — Feb 18

> **STATUS: ANSWERED** — Workshop ran Feb 17, 2026. All questions below have been resolved. Answers inline.

Tim's guidance: ask open-ended questions. FC doesn't have all the answers — they're looking for partnership to work through this together. Understand WHY they want something before jumping to solutions.

The shift: instead of "pick Option A or B," ask questions that explore their world. The decisions we need will emerge from the conversation naturally.

---

## Coach Matching & Selection — ANSWERED

**Decision**: No participant-facing filters. 3 coaches shown via capacity-weighted randomization. 1 remix allowed (one-way door). Single selection → Calendly link. Participant flow ends at selection.

- **"Walk us through what happens today when a new participant gets matched with a coach. What does that process look like manually?"**
  - ANSWERED: Currently manual assignment by Andrea/Kari. Participants have no choice today — this platform gives them choice for the first time.

- **"When a participant is looking for a coach, what matters most to them? Is it location? Language? Specialty? Or is it more of a gut feeling from the bio and video?"**
  - ANSWERED: Bio and video are the primary drivers. Kari confirmed "our coaches are all excellent" — gut feeling from profile is sufficient. No filters needed.

- **"How do you think about coach-participant fit? Is it something the participant should drive, or is it something your team has better judgment on?"**
  - ANSWERED: Participant-driven from 3 randomized options. FC trusts all coaches on the panel. The 3-card randomized selection gives participant agency without overwhelming choice.

- **"What would a bad match look like? What are you trying to avoid?"**
  - ANSWERED: Capacity overflow (too many participants for one coach) is the main concern. Fixed at 15 per coach. System handles this via capacity-weighted randomization.

---

## Infrastructure & Hosting — ANSWERED

**Decision**: CIL builds on own Dockerized infrastructure. Migration to FC infrastructure later (pending Blaine). Microsoft ecosystem — no SharePoint access for external partners.

- **"Help us understand your IT environment. When you think about where this platform lives long-term, what does that look like?"**
  - ANSWERED: FC runs Microsoft ecosystem. Long-term: FC infrastructure. Short-term: CIL builds independently. Blaine (IT) was NOT present — still unreachable as of Feb 17. Critical blocker.

- **"What's your team's experience been with deploying new tools? How does that process typically work with your IT group?"**
  - ANSWERED: Blaine handles all IT/procurement. Nobody else in the room had visibility into the approval process. Target: Feb 18 green light from Blaine.

- **"Is there a preference for where participant data lives? Any data residency requirements we should know about?"**
  - ANSWERED: Not explicitly discussed. US-based deployment assumed (USPS government contract). No SharePoint access for external partners — send data as zip/Excel attachments.

---

## Email & Authentication — ANSWERED

**Decision**: Initial access link sent by USPS internally (not from FC/CIL domain — spam filter risk). OTP auth confirmed. Nudge emails BACK in scope (Day 5, Day 10, Day 15 auto-assign).

- **"When your participants get emails from FC today — coaching assignments, reminders, that kind of thing — where do those come from? Is there an internal system, or does it go through a third-party tool?"**
  - ANSWERED: USPS sends the initial access link internally. This avoids spam filter issues with external domains. Subsequent emails (OTP, nudges) come from CIL/platform domain.

- **"One thing we've seen in similar environments is that internal mail systems sometimes block emails from external tools. Has that been an issue for your team before?"**
  - ANSWERED: Yes, this is a known risk. Solution: USPS sends initial link. All subsequent comms from platform domain. Deliverability testing needed before launch.

- **"How do your participants typically access their work email? Are they on mobile, desktop, government-managed devices?"**
  - ANSWERED: Not explicitly discussed. Assumption: standard government email (Outlook). OTP flow confirmed as auth method.

---

## Stalled Engagements & Nudges — ANSWERED (DECISION CHANGED)

**Decision**: Email nudges ARE in scope (reverses 2026-02-13 de-scoping). Day 5 reminder, Day 10 second reminder, Day 15 auto-assign coach. Dashboard flags PLUS email nudges.

- **"Andrea, when an engagement stalls today, how do you find out about it? What does your current process look like?"**
  - ANSWERED: Andrea and Kari both confirmed they need proactive outreach, not just dashboard visibility. Participants who never log in can't see dashboard flags — email is the only channel to reach them.

- **"When a participant goes quiet — hasn't logged in, hasn't booked a session — what's the ideal way to re-engage them? What's worked in the past?"**
  - ANSWERED: Email reminders, with escalation to auto-assignment at Day 15. FC wants the system to handle re-engagement automatically rather than relying on ops to manually chase participants.

- **"How much communication volume is too much? Are participants already getting a lot of emails from FC, or is this a relatively low-touch engagement?"**
  - ANSWERED: Three touches over 15 days is acceptable. Day 5 gentle reminder, Day 10 firmer reminder, Day 15 auto-assign (no more choice). Volume is manageable for ~60 first cohort.

---

## Decision Speed & Data Handoff — ANSWERED

**Decision**: Kari Sadler is primary contact. `@CarrieSadler` in email body = same-day response. Text cell for critical blockers only. Andrea handles day-to-day coach/participant comms.

- **"Between now and March 2, there are going to be moments where we need a quick answer to keep moving. How does your team prefer to handle those? Who's the best person to go to?"**
  - ANSWERED: Kari Sadler. She's covering two roles for 3 months (her own + Abby's while on maternity leave). Email with `@CarrieSadler` in body gets same-day response. Text her cell only for critical blockers.

- **"For the coach data — the names, bios, photos, booking links — who on your side owns that information? Is it centralized or spread across different people?"**
  - ANSWERED: Kari owns it. Coach bios exist, 32 of 34 videos already recorded. Participant data and competency list coming from Kari. Data is centralized on FC's side.

- **"What does your ideal timeline look like for getting us that data? We want to make sure we're building against real information, not placeholders."**
  - ANSWERED: Feb 17-18 for coach bios, videos, participant data, competency list. Kari committed to delivering this week.

---

## Big Picture / Long-Term Vision — ANSWERED

**Decision**: Multi-org architecture confirmed. Coach selector is the #1 priority. Blaine/IT engagement is the biggest risk.

- **"Beyond this first engagement, what does success look like for the coaching platform a year from now? What would make this a home run for your organization?"**
  - ANSWERED: Greg confirmed scalable platform vision, not one-off tool. Multi-org architecture is the right direction. Greg left at ~60 min mark but his vision was clear.

- **"Kari, you built a prototype on Lovable. What was the one thing it got right that you'd want us to keep? And what was the biggest gap?"**
  - ANSWERED (name corrected: Kari, not Kari): Not discussed in detail during meeting. Focus was on decisions and alignment, not prototype comparison.

- **"What's the biggest risk you see between now and March 2? What keeps you up at night about this launch?"**
  - ANSWERED: Getting Blaine/IT engaged. He was not present at the meeting and has been unreachable. Feb 18 is the target for green light. Without Blaine, contract can't be signed.

- **"If we could only ship one thing perfectly by March 2, what would it be?"**
  - ANSWERED: Coach selector. Unanimous. Everything else can follow.

---

## Questions to Avoid

Tim's right that FC is looking for partnership, not a requirements interview. A few patterns to stay away from:

- **Don't ask binary questions early.** "Should we do A or B?" closes the conversation. Save those for after you've explored the why.
- **Don't lead with complexity.** "That would be really complex because..." puts you in opposition. Instead, ask "help me understand what you're hoping that solves" — then you can collaboratively arrive at the simpler version.
- **Don't ask questions you already know the answer to.** If we've already decided on OTP auth, don't ask "how should participants log in?" That wastes their time and undermines trust. Ask about the things that are genuinely open.
- **Don't ask "what do you think?" after the prototype demo.** Too open. Ask specific questions: "Are these the right data points on the coach card?" or "What's missing from this view?"
