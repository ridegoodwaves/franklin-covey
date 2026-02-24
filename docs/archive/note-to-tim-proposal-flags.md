# Note to Tim: Proposal Deck Updates Before Sending

Hey Tim,

I went through the proposal deck in detail and cross-referenced it against what we discussed on our call today and the technical plan. The deck looks great overall — the narrative, quotes, and structure are strong. I found a few spots where the language doesn't match what we agreed on during our call. These are quick fixes but important to get right before FC sees it, since they'll treat this as the binding scope document.

## 1. "Dockerized deployment on FC infrastructure" (Pages 8 & 11)

Page 7 already has the updated language we agreed on ("Web-hosted, Transition to FranklinCovey") but Pages 8 and 11 still say "Dockerized deployment on FC infrastructure." These need to match Page 7. We don't want them expecting Docker on their infra from day 1 when we're building on Vercel first.

**Fix**: Change to "Web-hosted deployment (transition to FC infrastructure)" on Pages 8 and 11.

## 2. "Top 20 objectives" still in diagram (Page 7)

We agreed to remove this on our call. It's still in the session logging fields on the architecture diagram. If they see it, they'll expect it.

**Fix**: Remove "(top 20 objectives)" from the session logging fields on Page 7.

## 3. "Master coach/ops" role (Page 7)

The security section lists 3 roles: "participant, coach, master coach/ops." On our call you mentioned master coach "isn't included" in MVP scope. If we list it here, they'll expect a distinct master coach role with its own permissions. For MVP, we just have ops/admin.

**Fix**: Change to "participant, coach, ops/admin" on Page 7.

## 4. "Calendly connections for scheduling" (Pages 6 & 11)

The language says "Calendly connections" and "Calendly booking" which could be interpreted as API integration. We're doing link-based scheduling (a button that opens the coach's booking URL in a new tab). This was confirmed by the client on Feb 11. We should keep the language tool-agnostic.

**Fix**: Change to "Scheduling links for booking" on Page 6. Change "Calendly booking" to "scheduling link booking" on Page 11.

## 5. "Admin panel for managing coaches" in Part 1 (Page 11)

Part 1 maps to March 2 delivery. The admin UI for managing coaches is in our March 16 scope. For March 2, what we're delivering is coach data loaded via structured CSV import (I run a script with their data). The full admin screen for editing coaches comes in Part 2.

Two options:
- Move this bullet to Part 2, or
- Reword to "Coach profile ingestion from structured data" in Part 1

Your call on which reads better to them. Just want to make sure we're not on the hook for a full admin panel by March 2.

---

Everything else in the deck aligns with our plan. The three deliverables, timeline, $30K price point, and the "architecture built for all future engagements" framing all match what we're building. The data contingency footnote on the timeline page is perfect ("*Timelines contingent upon receiving necessary client data and infrastructure access").

Let me know if you want to jump on a quick call to go through these, or if the notes above are clear enough.

Amit
