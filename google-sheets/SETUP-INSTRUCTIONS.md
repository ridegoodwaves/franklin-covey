# FranklinCovey Project Tracker - Google Sheet Setup

## Quick Import (2 minutes)

1. Open your existing Google Sheet (or go to **sheets.new** for a new one)
2. Name it: **FranklinCovey Coaching Platform - Project Tracker**
3. Delete old tabs (Questions & Decisions, Requirements Log, Action Items) — fully superseded
4. Import the 3 new CSVs:

### Tab 1: Decisions & Approved Language (rename Sheet1)
- File > Import > Upload > `decisions.csv`
- Choose: "Replace current sheet"
- Tim copies exact language from "Decision" column into client-facing materials
- "Don't Say" column catches common mistakes

### Tab 2: Blockers & Next Actions
- Click "+" to add a new sheet tab
- File > Import > Upload > `blockers.csv`
- Choose: "Insert new sheet"
- Grouped by owner: who needs to act (Tim / Amit / Client / Workshop)

### Tab 3: Timeline & Milestones
- Click "+" to add a new sheet tab
- File > Import > Upload > `timeline.csv`
- Choose: "Insert new sheet"
- 5 milestones: Workshop, Phase 0, Slice 1 (March 2), Slice 2 (March 9), Slice 3 (March 16)

## Recommended Formatting

### Conditional formatting for Status columns:
- **Open** = Yellow background
- **Waiting** = Orange background
- **Ready** = Light blue background
- **In Progress** = Light green background
- **Done** = Green background
- **Not Started** = Gray background
- **At Risk** = Red background

### Freeze rows:
- Freeze Row 1 (header) on all tabs

### Column widths:
- Decision / Item / Milestone columns: 300px
- Don't Say / Notes / Key Deliverables: 250px
- Status / Owner / Date: 120px

## Sharing

Share with Tim as "Editor". Share with client team as "Commenter" if/when appropriate.

## Sync Workflow

These CSVs are kept in the repo at `google-sheets/`. After each significant session:

1. Claude reads plan/brainstorm/handoff docs and diffs against current CSVs
2. Claude generates updated CSVs with change summary
3. Amit reviews (~2 min) and imports into Google Sheet

## Column Reference

### Decisions & Approved Language
| Column | Purpose |
|--------|---------|
| Topic | Feature or concept name |
| Decision (Approved Language) | Exact language Tim should use in client materials |
| Don't Say | Old/wrong terms to avoid |
| Impact | What this means for the build |
| Date | When decided |
| Source | Where the decision was made |

### Blockers & Next Actions
| Column | Purpose |
|--------|---------|
| Item | What needs to happen or be decided |
| Owner | Tim / Amit / Client (FC) / Workshop / Client IT |
| Status | Open / Waiting / Ready / In Progress / Done |
| Deadline | When it's needed by |
| Blocks | What can't proceed until this is resolved |
| Notes | Context |

### Timeline & Milestones
| Column | Purpose |
|--------|---------|
| Milestone | What ships |
| Target Date | Deadline |
| Status | Not Started / In Progress / At Risk / Done |
| Key Deliverables | What's included |
| Blockers | What could delay it |
| Last Updated | When this row was last touched |
