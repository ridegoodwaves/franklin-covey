# Workshop Open-Ended Questions — Feb 18

Tim's guidance: ask open-ended questions. FC doesn't have all the answers — they're looking for partnership to work through this together. Understand WHY they want something before jumping to solutions.

The shift: instead of "pick Option A or B," ask questions that explore their world. The decisions we need will emerge from the conversation naturally.

---

## Coach Matching & Selection

The decision we need (participant-driven filters vs system matching) comes out of understanding how FC thinks about the coach-participant relationship.

- **"Walk us through what happens today when a new participant gets matched with a coach. What does that process look like manually?"**
  - This surfaces the current workflow we're replacing. If it's Andrea assigning coaches by hand, the answer is different than if participants already have some choice.

- **"When a participant is looking for a coach, what matters most to them? Is it location? Language? Specialty? Or is it more of a gut feeling from the bio and video?"**
  - This tells us which filters actually matter vs. which ones are in the brief because they sound good. If the answer is "honestly, most participants just want someone they connect with," then 3 random coaches with good profiles might be the right answer without any filters.

- **"How do you think about coach-participant fit? Is it something the participant should drive, or is it something your team has better judgment on?"**
  - This is the core question reframed as exploration. If Kari says "our coaches are all excellent, any match works," that's a very different product than "participants need to find someone who specializes in their challenge."

- **"What would a bad match look like? What are you trying to avoid?"**
  - Understanding the failure case often reveals the real requirement better than asking about the success case.

---

## Infrastructure & Hosting

The decision we need (cloud now, FC later) comes out of understanding their IT reality and timeline expectations.

- **"Help us understand your IT environment. When you think about where this platform lives long-term, what does that look like?"**
  - This opens the door without assuming. Maybe Blaine has a clear answer. Maybe nobody's thought about it yet. Either way, we learn where they are.

- **"What's your team's experience been with deploying new tools? How does that process typically work with your IT group?"**
  - This surfaces procurement timelines, security reviews, internal politics — all the stuff that could delay us. If the answer is "it takes 3 months to get anything approved," that makes the case for cloud-first without us having to argue for it.

- **"Is there a preference for where participant data lives? Any data residency requirements we should know about?"**
  - This gets at the compliance concern underneath the hosting question. If they have strict data residency needs, that changes the cloud provider choice.

---

## Email & Authentication

The decision we need (which email provider) comes out of understanding their network constraints.

- **"When your participants get emails from FC today — coaching assignments, reminders, that kind of thing — where do those come from? Is there an internal system, or does it go through a third-party tool?"**
  - This reveals whether FC has existing email infrastructure we can piggyback on, or whether they're starting from scratch too.

- **"One thing we've seen in similar environments is that internal mail systems sometimes block emails from external tools. Has that been an issue for your team before?"**
  - This plants the seed about deliverability risk without lecturing. If they say "oh yeah, that's a huge problem," we've just built credibility by anticipating their pain.

- **"How do your participants typically access their work email? Are they on mobile, desktop, government-managed devices?"**
  - This matters for OTP design — if participants are on locked-down devices, they might not be able to receive codes quickly. It also shows we're thinking about the end user, not just the system.

---

## Stalled Engagements & Nudges

The decision we need (dashboard vs email nudges) comes out of understanding Andrea's actual ops workflow.

- **"Andrea, when an engagement stalls today, how do you find out about it? What does your current process look like?"**
  - If Andrea is already checking a spreadsheet daily, dashboard flags are a natural fit. If she only notices when a coach complains, email nudges might be more important.

- **"When a participant goes quiet — hasn't logged in, hasn't booked a session — what's the ideal way to re-engage them? What's worked in the past?"**
  - This might reveal that FC already has a process (a personal email from the coach, a phone call from ops). Our tool should support that process, not replace it with something generic.

- **"How much communication volume is too much? Are participants already getting a lot of emails from FC, or is this a relatively low-touch engagement?"**
  - This surfaces the inbox flooding concern without us having to say "your idea would spam people." If they say "we're careful about email volume," the dashboard-first approach sells itself.

---

## Decision Speed & Data Handoff

The decision we need (single point of contact + coach data timeline) comes out of understanding how FC operates as an organization.

- **"Between now and March 2, there are going to be moments where we need a quick answer to keep moving. How does your team prefer to handle those? Who's the best person to go to?"**
  - This lets them self-identify the decision maker rather than us imposing a structure. The answer might surprise us — it might be Andrea, not Greg.

- **"For the coach data — the names, bios, photos, booking links — who on your side owns that information? Is it centralized or spread across different people?"**
  - This reveals whether the CSV is a simple ask ("Andrea has it in a spreadsheet") or a project ("we'd need to collect it from 35 coaches individually"). That changes the timeline.

- **"What does your ideal timeline look like for getting us that data? We want to make sure we're building against real information, not placeholders."**
  - This is softer than "we need it by X date or March 2 slips." It lets them tell us their reality, and then we can work together on whether that's compatible with the deadline.

---

## Big Picture / Long-Term Vision

These are relationship-building questions that also give us valuable context for architecture decisions.

- **"Beyond this first engagement, what does success look like for the coaching platform a year from now? What would make this a home run for your organization?"**
  - This is Greg's question. His answer tells us whether the multi-org architecture is a nice-to-have or the whole point.

- **"Kari, you built a prototype on Lovable. What was the one thing it got right that you'd want us to keep? And what was the biggest gap?"**
  - This shows respect for Kari's work and gives us a direct line to what she values most. It also surfaces anything the Lovable prototype did that we haven't accounted for.

- **"What's the biggest risk you see between now and March 2? What keeps you up at night about this launch?"**
  - This is the most important question in the room. Their answer tells us what to prioritize. If Greg says "I'm worried participants won't use it," that's a UX conversation. If Andrea says "I'm worried we won't have the data ready," that validates our push for early CSV delivery.

- **"If we could only ship one thing perfectly by March 2, what would it be?"**
  - This is a forcing function disguised as an open question. The answer reveals their true priority and gives us permission to de-scope everything else.

---

## Questions to Avoid

Tim's right that FC is looking for partnership, not a requirements interview. A few patterns to stay away from:

- **Don't ask binary questions early.** "Should we do A or B?" closes the conversation. Save those for after you've explored the why.
- **Don't lead with complexity.** "That would be really complex because..." puts you in opposition. Instead, ask "help me understand what you're hoping that solves" — then you can collaboratively arrive at the simpler version.
- **Don't ask questions you already know the answer to.** If we've already decided on OTP auth, don't ask "how should participants log in?" That wastes their time and undermines trust. Ask about the things that are genuinely open.
- **Don't ask "what do you think?" after the prototype demo.** Too open. Ask specific questions: "Are these the right data points on the coach card?" or "What's missing from this view?"
