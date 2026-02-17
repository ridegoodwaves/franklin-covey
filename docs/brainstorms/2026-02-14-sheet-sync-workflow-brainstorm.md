---
date: 2026-02-14
topic: sheet-sync-workflow
---

# Google Sheet Sync Workflow

## What We're Building

A 3-tab Google Sheet that serves as Tim's project management view, kept in sync with Amit's in-repo docs via Claude-generated CSV updates.

## Why This Approach

The previous 3-tab structure (40 questions, 17 requirements, 13 action items) went stale because:
1. Decisions happened in repo docs (plan, brainstorm, handoffs) that Tim doesn't read
2. Updating sheets felt like extra work with no immediate payoff for Amit
3. The sheet was too granular for Tim's actual needs — he pinged Amit directly instead

## Key Decisions

- **3 tabs replacing 3 tabs**: Decisions & Approved Language, Blockers & Next Actions, Timeline & Milestones — replacing Questions, Requirements, Action Items
- **Claude generates updates**: At session end, Claude diffs repo docs against CSVs and generates updated versions. Amit reviews (~2 min) and imports.
- **"Don't Say" column**: Prevents the proposal deck inconsistency problem. Tim copies approved language, avoids stale terms.
- **Owner-grouped blockers**: Tim sees at a glance what's on him, what's on the client, what's Amit's — no digging through 40 questions.
- **Old tabs deleted**: Not archived. The new structure fully supersedes them.

## Open Questions

- Build a `/sync-sheets` skill for future updates (deferred — generate CSVs manually first, build skill when pattern is proven)

## Next Steps

1. Generate 3 new CSVs with current data
2. Amit imports into Google Sheet, shares with Tim
3. After 1-2 sync cycles, evaluate whether a `/sync-sheets` skill is worth building
