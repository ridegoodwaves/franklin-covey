# Response to Tim — Workshop Prep

Hey Tim! California has been great, thanks.

Good call consolidating threads — let's keep everything here.

I can meet tomorrow at 8:45 am for the dress rehearsal / sync. That gives us time to walk through the flow together before we're live with the team.

In the meantime, I'll share the Google Sheets with you today — I've put together three tabs: Decisions & Approved Language, Blockers & Next Actions, and Timeline & Milestones. These pull from everything we've discussed across the plan docs, brainstorms, and our calls. Take a look async and we can refine anything that's off on our call tomorrow.

Here's where my head's at on the workshop:

---

## Workshop Framing

I hear you on the deal dynamics. Even if we don't close before Tuesday, this workshop is an investment — we're showing FC that we understand their problem, we've already done the work, and we're the team that can deliver. That changes how I'm thinking about the 90 minutes.

Your objective nails it: **align on the minimum viable scope using their real data and constraints, lock the decisions and tradeoffs, and build confidence that March 2 and March 16 are achievable.** I'd add one layer to that — we want them leaving the room feeling like they're in good hands. The prototype does that better than any slide deck.

On the "beginning with the end in mind" point — this is exactly where the multi-org architecture comes in. Greg told us he wants "infrastructure for the full platform up front." We already built that into the schema (the Organization model, multi-program support). During the workshop, we should make this visible without getting technical about it. Something like: "What you're seeing is the first engagement on a platform designed for all your coaching clients. The USPS contract is one program on a system built to handle many." That frames the MVP as step 1, not a one-off tool, and it speaks directly to Greg's concern.

---

## The 5 Decisions We Need

Even with the relationship-building lens, we still need to leave with answers to the things that unblock development. I want to organize the session around 5 decisions — but frame them as "help us build the right thing for you" rather than "we're blocked without answers."

**1. How does coach matching work?**

The CIL Brief says participants filter by location, credential, skills, language. The PRD says shuffle and show 3. Those are two different products and I need to know which one to build.

My recommendation is a simple hybrid — participant picks 1-2 filters (location and language are the obvious ones), system shuffles from the filtered pool, shows 3 coaches. Gets them both: participant has some control, system keeps it simple. Andrea and Kari are the right people to weigh in since they know the participant experience best.

**2. Can we deploy on cloud infrastructure now and migrate to FC's systems when ready?**

This one's binary. If yes, I start building Wednesday on Vercel + Supabase. If no, we're waiting on Blaine to give us access to infrastructure we don't have visibility into, and the timeline gets tight.

The way to frame it for Greg: "We build on cloud infrastructure now, migrate to yours when IT is ready. Same code, different address." Standard practice, not a workaround. This also plays into the confidence message — we're not waiting around, we're moving.

**3. What email setup works inside FC's network?**

Participants log in with a one-time code sent to their email. No email service, no login. The options are Resend (fast to set up), AWS SES (enterprise, IT might prefer), or whatever FC already runs internally. If Blaine's in the room, we get this answered. If not, we leave with his name on a 48-hour action item.

**4. What happens when engagements stall?**

I know FC's contact asked for automated email reminders. I want to present three tiers:

- Dashboard flags only — ships free with the admin portal. Andrea logs in, sees "Needs Attention," done.
- Dashboard flags + a single participant reminder email — cheap to add because we're already building email for login codes. The pipes exist.
- Full automated nudges — template design, deliverability testing, inbox volume management. Real project.

I'd recommend the middle option and let Andrea make the call. This is also a good moment to show we're thinking about their ops workflow, not just features.

**5. Who makes fast decisions, and when do we get the coach data?**

Between now and March 2 we'll hit questions that need answers within 24 hours. I need a name, not a committee. And I'll bring the CSV template to hand Andrea during the meeting — we need the real coach data back by a specific date or March 2 slips.

Everything else — admin reporting parameters, bulk import details, session topics from Kari, roadmap — that's Workshop #2. If these come up, we park them with a "great question, let's dig into that in our follow-up session" and move on.

---

## How We Run the Room

**You open.** You have the relationships, you set the tone. Frame it as: "We've got 12 working days to March 2 and we've been heads down building. You're about to see what we've built. To make it real with your coaches and your participants, we need to align on a few key decisions today."

That's warmer than "we need 5 answers" but gets to the same place.

**I walk the prototype.** You introduce me — something like "This is Amit, he built what you're about to see." Then I walk the participant happy path: landing page, enter email, get a code, see 3 coach cards, pick one, land on the engagement page. Three to four minutes, clean. Flash the coach dashboard and ops dashboard, maybe a minute each.

Then I stop. "That's what ships March 2 with your real coaches and real participants. To get there, we need to align on a few things."

During the walkthrough I'll ask a couple narrow questions — "Are these the right data points on the coach card?" and "Is this the right next step after selecting a coach?" These give FC ownership without opening a full design review. If someone goes to design feedback territory (colors, fonts, layout), I'll redirect: "We'll share a link so your team can click through and send feedback this week. Today let's focus on the decisions that unlock the build."

**You manage the room dynamics.** When someone proposes adding something new — and they will — that's your moment. "Love that idea. Let's capture it for the next phase. For today, let's finish this decision." Coming from you, it's partnership. Coming from me on day one, it might feel like pushback.

**The long-term vision beat.** At some point — probably during the opening or after the prototype — one of us should say: "What we're building isn't a one-off tool for this engagement. The architecture underneath supports multiple programs, multiple clients, and scales with your coaching practice. This USPS contract is the first program on the platform." This speaks to Greg's investment lens and Kari's "stability to disrupt" goal. You might be the better person to deliver this since it's a business message, not a technical one.

**We close together.** I read back the decisions we made. You confirm — "that's what we agreed." You lead the wrap with next steps and the relationship close. I confirm dates and deliverables.

---

## The Stuff That Could Come Up

A few things FC might ask for that sound simple but would stretch the timeline. I'd rather we surface these proactively so they see we've thought it through:

**"Host it on our infrastructure from day 1."** We don't have access, don't know their stack, don't have DNS. Could delay weeks. Response: build on cloud now, migrate when IT is ready.

**"Let participants switch coaches freely."** Real feature — state machine changes, capacity management, notifications. For launch, ops handles reassignment manually. Self-service switching is post-launch.

**"We want lots of filters on the coach selector."** Each one adds complexity and edge cases. Pick the 2 that matter most. Add more based on real usage after launch.

**"Send automated emails for everything."** Their network might block external senders entirely. Dashboard flags plus one reminder email covers 90% of the need at 10% of the cost.

The pattern for all of these: acknowledge the value, name the time cost, offer the pragmatic version, position the full version as next phase. If I start going too deep on technical details in the room, jump in and translate — "What Amit's saying is: Option A ships March 2, Option B is March 9. Which timeline works?"

---

## Before Tomorrow's Call

Here's what I'll have ready:

- **Google Sheets** — sharing with you today. Three tabs: Decisions & Approved Language, Blockers & Next Actions, Timeline & Milestones. Review async.
- **Your proposal deck** — I'll go through the corrected version today and flag anything before we talk tomorrow.
- **CSV template** — ready to hand Andrea during the meeting.
- **Prototype** — I want to walk you through it on our 8:45 call so you see exactly what I'll be showing them. Any updates we need to make, we do before Tuesday.

Things I need from you:

- **Attendee list** — is Blaine joining? If not, the email provider question becomes a homework assignment with his name on it.
- **Deal temperature** — how are you reading the room? Any sensitivities I should know about heading into Tuesday?
- **Deck update** — saw your note about a suggested next step on the deck. Want to make sure I'm looking at the right version.
- **Decider assignments** — I suggested who should call each decision above (Andrea for matching + nudges, Greg for hosting + decision speed, Blaine for email). You know these people — tell me if any of those are wrong.

See you at 8:45 tomorrow. Looking forward to it.
