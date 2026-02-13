---
title: "Calendly Integration Scope Miscommunication - API vs Link-Based Scheduling"
date: 2026-02-11
category: integration-issues
severity: high
component: Project Documentation, Stakeholder Communication, PRD
symptoms:
  - Client misunderstood scope reduction as complete Calendly removal
  - Documentation used ambiguous language ("Calendly removed", "No Calendly integration")
  - Stakeholder pushback on feature removal despite MVP alignment
  - Inconsistent terminology across PRD, CLAUDE.md, and tracker documents
tags:
  - calendly
  - scope-management
  - requirements-clarity
  - stakeholder-communication
  - api-integration
  - link-based-scheduling
  - documentation-accuracy
  - mvp-alignment
  - architecture-decision
  - partial-removal
status: resolved
resolution_time: immediate (once client feedback received)
related_files:
  - prd_for_apps/franklincovey-coaching-platform-prd.md
  - franklin-covey/CLAUDE.md
  - franklin-covey/google-sheets/1-questions-decisions.csv
---

# Calendly Integration Scope Miscommunication

## Problem

A 3-reviewer technical analysis recommended removing the Calendly **API integration** (webhooks, embeds, session auto-sync) while retaining the ability for coaches to use their existing Calendly scheduling links behind a "Book Next Session" button. The decision was correct and aligned with the client's MVP requirement. However, the language used to document it caused the client to believe Calendly was being dropped entirely.

### Symptoms

- Client message: *"Are you saying that it won't work for the Calendly API or just in general? The original plan MVP was to just take each individual coach's scheduling link and hide it behind a button. This is their primary pain point."*
- Four separate documents all used ambiguous removal language
- The client's stated MVP requirement was **exactly** what Option B delivers

### Where the Ambiguous Language Appeared

| Document | Ambiguous Phrase | What It Should Have Said |
|----------|-----------------|--------------------------|
| PRD Tech Stack | "Calendly removed" | "Calendly API removed; link-based scheduling retained" |
| PRD Open Questions | "Calendly removed from scope" | "Calendly API removed; coach scheduling links preserved" |
| PRD Resolved Items | "Removed from scope entirely" | "API integration removed; link-based scheduling retained" |
| CLAUDE.md | "No Calendly integration" | "No Calendly API integration; coach links supported" |
| Tracker Q2 | "Calendly removed from scope" | "Calendly API removed; link-based MVP retained" |

---

## Root Cause Analysis

The miscommunication stemmed from **terminology collapse**. The technical team used "Calendly removed" as shorthand for "Calendly API integration removed," but stakeholders parsed this as "Calendly functionality removed entirely."

### Why This Happened

1. **Context collapse across documents**: The same phrase "Calendly removed from scope" appeared in 4+ locations without accompanying detail about what "removed" meant specifically.

2. **Lost nuance in transcription**: The 3-reviewer decision (Option B) clearly distinguished between API integration (removed) and scheduling links (retained). But when transcribed into status updates and resolved items, the distinction was lost.

3. **Ambiguous reference frame**: "Removed from scope" could mean:
   - Removed the API layer (but links still work)
   - Removed Calendly entirely (no links, no functionality)
   - Deferred to a later version

4. **Missing stakeholder lens**: The documents were written from a technical perspective ("we don't need webhooks") rather than a client perspective ("your coaches can still use their Calendly links").

---

## Solution

### Principle: Dual-Clause Clarity

Every mention of a partial removal must explicitly state both **what was removed** and **what remains**.

### Language Changes Applied

**Before (ambiguous):**
```
"Calendly removed from scope"
"No Calendly dependency"
"No Calendly integration"
"Removed from scope entirely"
```

**After (explicit):**
```
"Calendly API removed; link-based scheduling retained"
"Calendly API removed — no webhooks/embeds/syncing. Each coach's Calendly link
 displayed behind a 'Book Next Session' button."
"API integration removed; link-based scheduling retained per Option B"
```

### Structural Changes Applied

Rewrote the PRD architecture decision section from a single block into two clear subsections:

**Before:**
```markdown
## Calendly Integration — SUPERSEDED

> Calendly integration has been removed from scope.
> Replacement: Coach-managed scheduling (Option B)
> - Add meetingBookingUrl to CoachProfile
> - No webhooks, no iframes, no third-party scheduling dependency
```

**After:**
```markdown
## Calendly API Integration — SUPERSEDED (Link-Based Scheduling Retained)

> **What ships (MVP scheduling flow):**
> - Admin enters each coach's Calendly scheduling link as meetingBookingUrl
> - Participant sees a "Book Next Session" button that opens the coach's Calendly page
> - Participant books on Calendly as normal — coaches' existing workflow unchanged
> - Coach logs the completed session in our platform afterward
>
> **What was removed (Calendly API plumbing):**
> - Webhook handler, iframe embeds, session auto-sync
> - FedRAMP concern, Calendly DPA, $80-160/month Professional plan cost
> - react-calendly dependency, CSP rules for Calendly domains
>
> **Client confirmation (2026-02-11):** Stakeholders confirmed the MVP requirement
> is "take each coach's scheduling link and hide it behind a button" — exactly what
> this approach delivers.
```

### Files Updated

1. **PRD** (`franklincovey-coaching-platform-prd.md`) — 4 edits: Tech Stack table, SUPERSEDED section, Open Questions Q1/Q2, Resolved Items
2. **CLAUDE.md** (`franklin-covey/CLAUDE.md`) — Architecture Decisions rewritten with "What ships" / "What was removed" / client confirmation
3. **Tracker CSV** (`google-sheets/1-questions-decisions.csv`) — Q2 status changed to "Resolved - Client Confirmed" with clarification note

---

## Prevention: The Partial Removal Communication Pattern

### The Rule

**Before any partial removal decision reaches stakeholders, every mention of "removed" must be paired with what "remains."**

### Language Pattern

| Situation | Wrong | Right |
|-----------|-------|-------|
| Removing API but keeping links | "X removed" | "X API removed; X links retained" |
| Deferring complex features | "X out of scope" | "X deferred; basic X ships in MVP" |
| Simplifying an integration | "No X integration" | "No X API integration; X available via [method]" |

### Architecture Decision Record Template

When making decisions that partially remove a technology, use this structure:

```markdown
## [Feature] Implementation Scope

### What Ships (Visible to End Users)
- [ ] [User-facing functionality that remains]
- [ ] [How users interact with it]
- [ ] [What their workflow looks like]

### What Was Removed (Internal Implementation)
- [ ] [API/webhook/sync features not built]
- [ ] [Infrastructure not needed]
- [ ] [Cost/complexity avoided]

### Why This Split
[One sentence: what the user gets vs. what we didn't build]

### Client Impact
- Users still get: [outcome]
- The only difference: [what's manual vs. automatic]
```

### Pre-Communication Checklist

Before sending architecture decisions to non-technical stakeholders:

- [ ] Every "removed" is paired with what "remains"
- [ ] Re-read as the client who requested the feature — would they think it's gone?
- [ ] Document has a "What Ships" section (user-facing, visible)
- [ ] Document has a "What Was Removed" section (internal only)
- [ ] One sentence answers: "What did we remove and what did we keep?"
- [ ] Consequence is stated, not assumed ("coaches will need to...")
- [ ] Client's original requirement is quoted alongside the decision

### The Stakeholder Lens Test

Before any architecture decision goes out, ask these 3 questions:

1. **Feature Visibility**: "If I'm the client, what do I see that I asked for?"
2. **Scope Collapse**: "Could a non-technical reader think we removed the entire feature?"
3. **Consequence Clarity**: "What extra work lands on the client, if any?"

If the answer to #2 is "yes," rewrite before sending.

---

## Key Takeaway

The Calendly case is a textbook example of **technical shorthand causing stakeholder alarm**. The decision was correct. The client's MVP requirement was exactly what we were building. The only failure was in how we described the decision. The fix is structural: always separate "what ships" from "what was removed" and re-read every decision through the client's eyes before communicating it.

---

## Related

- FranklinCovey PRD: `prd_for_apps/franklincovey-coaching-platform-prd.md` (Scheduling section)
- Project CLAUDE.md: `franklin-covey/CLAUDE.md` (Architecture Decisions)
- Session Handoff: `franklin-covey/SESSION_HANDOFF_frontend-design-and-architecture-decisions.md`
- Google Sheet Tracker: `franklin-covey/google-sheets/1-questions-decisions.csv` (Q2)
