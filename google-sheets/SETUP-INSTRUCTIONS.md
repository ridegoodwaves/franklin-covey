# FranklinCovey Project Tracker - Google Sheet Setup

## Quick Import (2 minutes)

1. Go to **sheets.new** to create a new Google Sheet
2. Name it: **FranklinCovey Coaching Platform - Project Tracker**
3. For each CSV file, create a tab:

### Tab 1: Questions & Decisions (rename Sheet1)
- File > Import > Upload > `1-questions-decisions.csv`
- Choose: "Replace current sheet"
- 26 rows pre-populated from PRD open questions (Q1-Q26)

### Tab 2: Requirements Log
- Click "+" to add a new sheet tab
- File > Import > Upload > `2-requirements-log.csv`
- Choose: "Insert new sheet"
- 16 confirmed/pending requirements pre-populated

### Tab 3: Action Items
- Click "+" to add a new sheet tab
- File > Import > Upload > `3-action-items.csv`
- Choose: "Insert new sheet"
- 13 action items with dependencies mapped

## Recommended Formatting

### Conditional formatting for Status column:
- **Open** = Yellow background
- **Resolved** = Green background
- **Blocked** = Red background
- **Waiting** = Orange background
- **Partially Resolved** = Light green background

### Freeze rows:
- Freeze Row 1 (header) on all tabs

### Column widths:
- Question/Requirement/Action Item columns: 400px
- Notes columns: 300px
- Status/Priority: 120px

## Sharing

Share with client team as "Commenter" initially, upgrade to "Editor" once workflow is established.

## Column Reference

### Questions & Decisions
| Column | Purpose |
|--------|---------|
| # | Question ID (matches PRD: Q1-Q26) |
| Category | Phase 0 Blocker / IT / v2 Feature / Phase 1 |
| Question | Full question text |
| Priority | P0-Blocker / P1-High / P2-Medium |
| Owner | Who needs to answer (Client IT / Client PM / Amit) |
| Asked Date | When we first raised it |
| Status | Open / Resolved / Partially Resolved |
| Answer / Decision | The actual decision made |
| Decision Date | When decided |
| PRD Updated? | Has the PRD been updated to reflect this? |
| Notes | Additional context |

### Requirements Log
| Column | Purpose |
|--------|---------|
| # | Requirement ID (R1-R16) |
| Feature Area | Portal / Auth / Scheduling / etc. |
| Requirement | What needs to be built |
| Source | Client v1 / Client v2 / Architecture Decision |
| Priority | P0-Core / P1-High / P2-Medium / P3-Deferred |
| Status | Confirmed / Pending / Deferred / Cut / Simplified |
| Implementation Notes | How we're building it |
| PRD Section | Where it lives in the PRD |

### Action Items
| Column | Purpose |
|--------|---------|
| # | Action ID (A1-A13) |
| Action Item | What needs to happen |
| Owner | Amit / Client IT / Client PM |
| Priority | P0 / P1 / P2 |
| Status | Ready / Blocked / Waiting / In Progress / Done |
| Blocked By | Dependencies (other action IDs or question IDs) |
