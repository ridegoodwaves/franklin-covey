# Ops Request Tracking System - Brainstorm

**Date:** 2026-03-05
**Status:** Decided
**Author:** Amit Bhatia

---

## What We're Building

A lightweight Notion-based request tracking system for FranklinCovey operational data changes. Instead of Kari/Andrea emailing ad-hoc requests (roster changes, booking link updates, coach bio updates), they submit structured requests through a Notion form that feeds a shared database with status tracking.

## Why This Matters

**Current pain:**
- FC ops requests arrive via email (lossy, unstructured, easy to miss)
- No visibility for FC team on request status
- No audit trail of what was changed and when
- Amit is a human ticket queue with no intake process

**Sample requests from last 3 days:**
1. Update a coach's Calendly link (Karen Agrait)
2. Roster changes: move participant between cohorts (Tamara Vielguth ALP 137 -> 138), add participant (Heather Norman to ALP 137)
3. New cohort rosters incoming (ALP 138, EF 2)
4. New coach bios incoming (ALP 137, EL 1)

## Why This Approach (Notion Database + Form)

- FC team already has a Notion workspace and the existing page
- Form view removes friction -- Kari just fills in fields, no ambiguity about what info is needed
- Database view gives both sides visibility into request status
- Zero new tooling or accounts to set up
- Can be live within an hour

**Rejected alternatives:**
- **Google Form -> Sheet**: Less structured, no native kanban, FC already has Notion
- **GitHub Issues**: Requires GitHub access for non-technical FC team, overkill for volume

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Tool | Notion Database | FC already uses Notion, zero new tooling |
| Submitters | Kari & Andrea only | Keep it tight, low volume (~few/week) |
| Scope | Capture & track only | No automation needed at this volume |
| Execution | Amit processes manually | Existing CLI pipeline handles all data mutations |
| Status tracking | Submitted -> In Progress -> Complete | Simple 3-state workflow |

## Notion Database Schema

### Properties

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Request Title | Title | Yes | Brief description (e.g., "Update Karen Agrait booking link") |
| Request Type | Select | Yes | Options: Roster Change, Booking Link Update, Coach Bio/Photo Update, New Cohort Setup, Other |
| Description | Rich Text | Yes | Full details of what needs to change |
| Priority | Select | No | Urgent / Normal (default: Normal) |
| Attachments | Files & Media | No | Rosters (CSV/Excel), bios, photos |
| Status | Select | Auto | Submitted / In Progress / Complete |
| Submitted By | Text | Yes | "Kari" or "Andrea" (simple text -- no Notion account required) |
| Date Submitted | Created Time | Auto | Timestamp |
| Date Completed | Date | Manual | When Amit marks it done |
| Notes | Rich Text | No | Amit's notes on execution (e.g., "Reran seed pipeline, verified in staging") |

### Views

1. **Form View** (for Kari/Andrea) -- Clean intake form with required fields
2. **Board View** (kanban by Status) -- For Amit to manage workflow
3. **Table View** -- Full list with all fields, sortable/filterable

## Communication Plan

Send a note to Tim and the FC team (Kari, Andrea) explaining:

1. **What**: A shared Notion page for submitting any data change requests
2. **Why**: Ensures nothing gets lost, gives visibility on status, structured intake means faster processing
3. **How**: Fill out the form for any roster changes, booking link updates, coach bio updates, new cohort setups
4. **When**: Effective immediately -- all future requests should go through this system

### Draft Message

> Hi Tim, Kari, and Andrea,
>
> Thanks for the recent updates on the ALP 137/138 rosters, EF 2 roster, and Karen's booking link—I'm on it. To keep requests like these from getting lost in email, I've set up a shared tracker in Notion.
>
> *Going forward, please submit data change requests here:*
> - Form link: [Notion Form Link]
> - You can check status anytime: [Notion Database Link]
>
> *Examples of what goes here:*
> - Roster changes (add, move, or remove participants)
> - Coach booking link or bio updates
> - New cohort setup
> - Any other change that needs a data update in the platform
>
> I've already logged the requests you sent this week, so you can see them in the tracker. I'll process requests within one to two business days and update the status so you always know where things stand.
>
> Email still works for questions and discussion—this is for data change requests.
>
> Thanks,
> Amit

## Open Questions

1. ~~Should we add an SLA expectation?~~ **Decided: 1-2 business days** (stated in communication)
2. Does Kari want email notifications when a request status changes, or is checking the Notion page sufficient?
3. ~~Should we retroactively log recent email requests?~~ **Decided: Yes** -- log the 3 pending requests as first entries to seed the tracker

## Next Steps

1. Set up the Notion database on the existing page (~30 min)
2. Configure form view with required fields + board/table views
3. Seed tracker with the 3 pending email requests (booking link, roster changes, new rosters)
4. Send the communication to Tim/Kari/Andrea with live links
5. Confirm Kari/Andrea can access and submit via the form
