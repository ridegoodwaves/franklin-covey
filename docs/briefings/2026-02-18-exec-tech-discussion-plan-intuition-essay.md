# The FranklinCovey Call Plan (Intuition Version)

You are not walking into a "tech check-in."  
You are walking into an air traffic control tower five minutes before weather moves in.

Greg and Blaine are not mainly asking, "Can you build software?"  
They are asking, "If this gets bigger, louder, and more political, will this still hold?"

That is the real agenda.

## The right mental model

Think in three layers:
- **Runway:** what must take off now (MVP dates and core workflow)
- **Control tower:** how decisions and incidents are handled (SLA, governance, ownership)
- **Airport expansion plan:** how today's system becomes FC's long-term platform (security, procurement, production ecosystem)

If you keep returning to those three layers, the conversation stays strategic and calm.

## Runway: prove this launch is disciplined, not improvised

Start with certainty.  
You already have real certainty:
- March 2: participant coach selection flow
- March 9: coach portal for session logging
- March 16: admin import, nudges, KPI dashboard

Then show why this is stable:
- The participant path is intentionally short and one-directional
- Status rules are fixed and explicit
- Nudge timing is anchored to cohort start date
- Change control exists for breaking API/state behavior

This tells them you are not "building while guessing."  
You are executing a locked operating model.

## Control tower: this is where trust is actually won

Most teams lose trust by speaking beautifully about features and vaguely about operations.

Do the opposite.  
Speak concretely about operating behavior:
- Who responds when something breaks
- How fast they respond
- How often stakeholders get updates
- What counts as a breaking change
- Who can approve changes

When you propose:
- 99.9% uptime target
- 1-hour P1 response
- Defined RPO/RTO
- Weekly release rhythm + emergency patch path

you are telling them: "This is not just an app. This is a managed service."

That is the sentence executives and IT leaders both understand.

## Airport expansion: prove you are not creating future migration debt

Blaine cares about one fear: "Will we inherit a one-off prototype that becomes expensive to absorb?"

Answer that fear directly:
- MVP stack is optimized for speed (Vercel/Supabase)
- Production stack is aligned to FC standards (AWS ECS/RDS, Okta, SendGrid, Terraform)
- Migration path is designed as configuration/integration swaps, not a rewrite

This is the strategic bridge:
"We move fast now, without creating a technical hostage situation later."

## Security: present it as behavior, not adjectives

Avoid saying "secure, enterprise-grade, robust."  
Say what happens:
- Access is role-segmented by portal
- Coach private notes are isolated
- Participant auth works for external users (OTP), while coach/admin auth upgrades to Okta in production
- Encryption at rest and in transit is explicit
- Sensitive workflows are rate-limited, validated, and auditable
- Non-production data handling defaults to sanitized behavior

Security is credibility when described as mechanisms, not promises.

## Procurement: keep it simple and dated

Procurement discussions go sideways when they stay abstract.

Anchor them:
- Intake route: `datasecurity@franklincovey.com`
- Decision needed now: sender identity and production domain
- Governance needed now: named security approver, legal owner, infra owner
- Decision speed needed through March 16: 24-hour blocker turnaround owner

Dates calm organizations.  
Owners move organizations.

## What to ask for in the room

You need five decisions, no more:
1. Approval of staged ecosystem path (MVP now, FC production next)
2. Approval of SLA and incident severity model
3. Procurement owner/workflow confirmation
4. Email sender and DNS/domain confirmation
5. Security sign-off checkpoint owners and dates

If those five lock, momentum holds.

## How to sound in the meeting

Confident, specific, unemotional.

Use this tone:
"Here is what is already locked. Here is what is intentionally staged. Here are the five decisions that remove launch risk and production ambiguity."

You are not auditioning for technical brilliance.  
You are demonstrating operational stewardship.

That is what will convince Greg.  
That is what will de-risk Blaine.

## Final intuition

This call is not about defending a stack.  
It is about showing that your team can carry ambiguity without creating chaos.

If you keep the conversation on runway, control tower, and expansion plan, you will look like what they actually need:

not a vendor shipping screens,  
but a platform partner who can operate under real enterprise constraints.

