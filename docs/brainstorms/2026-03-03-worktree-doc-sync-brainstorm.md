---
title: "Worktree Documentation Sync Strategy"
type: brainstorm
date: 2026-03-03
status: approved
---

# Worktree Documentation Sync Strategy

## What We're Building

A one-time documentation sync to bring core project docs current with the work shipped in the `pre-main-priority-branch` worktree (Mar 1–3). The pre-main branch expanded beyond its original Wistia-only scope, and docs haven't kept up. This sync ensures the docs remain the reliable source of truth for sprint planning and development.

## Why This Approach

**Update docs in the pre-main worktree now.** When pre-main merges to main later this week, the updated docs come along. No extra branches, no merge conflicts on docs, no git complexity.

Alternatives considered:
- **Merge pre-main into main first, then update docs** — adds risk since pre-main has more work this week
- **Separate docs-only branch** — unnecessary git complexity for someone new to worktrees
- **Wait for merge** — docs stay stale longer, hurting sprint planning reliability

## Key Decisions

1. **All doc updates happen in the pre-main worktree** (`/Users/amitbhatia/.cursor/franklin-covey-main-priority`)
2. **Missing docs from main worktree get copied into pre-main** so they survive the merge
3. **No code changes** — docs only
4. **Handoffs stay in place** — they're session-specific, not reference docs
5. **Archive stays untouched**

## Update Scope

### 1. CLAUDE.md — merge + update (~15 min)

| Action | Detail |
|--------|--------|
| **Merge from main** | "Before Starting Any Task" section, "Code Changes" section |
| **Add** | Wistia video integration: CSP policy (wistia.com, *.wistia.net), `WISTIA_MEDIA_IDS` env var, staged rollout pattern |
| **Add** | `PROGRAM_ADMIN` pattern (single source of truth for participant-facing admin contact) |
| **Fix** | Remove/update "Coach bio videos are de-scoped from MVP" — they're shipped |
| **Add** | Session carryover prevention (stale cookie fix for multi-participant usage) |
| **Keep** | Feedback Tracking section (already in pre-main, not in main) |

### 2. Project Plan (`docs/plans/2026-02-18-fc-project-plan.md`) — status refresh (~10 min)

| Action | Detail |
|--------|--------|
| **Update header** | "Last Updated" date + status line |
| **Update milestones** | Slice 1 → ✅ Shipped (Mar 2); currently in Slice 2 sprint |
| **Fix P0 decisions** | "Coach bio videos are de-scoped" → note videos shipped post-launch |
| **Add Implementation Update** | Mar 1–3 work: Wistia integration, CSP hardening, session fix, contact text consistency |
| **Resolve open questions** | Mark any answered items |
| **Update "FC Provides"** | Mark delivered items |

### 3. WHERE_AM_I.md — both worktrees (~5 min)

| Worktree | Update |
|----------|--------|
| **Pre-main** | Scope: "Wistia embed + CSP + session fix + contact text + launch emails" (not "only Wistia") |
| **Main** | Note: Slice 2 work hasn't started yet in this worktree; pre-main merge pending |

### 4. Missing Docs to Copy into Pre-Main (~5 min)

These exist only in worktree 1 (main) and need to be present in pre-main so they survive the merge:

- `docs/brainstorms/2026-02-27-admin-dashboard-scope-brainstorm.md`
- `docs/brainstorms/2026-02-27-production-launch-qa-strategy-brainstorm.md`
- `docs/brainstorms/2026-02-27-testing-strategy-brainstorm.md`
- `docs/solutions/security-issues/` directory (CSP + session storage bug docs)

### 5. Vertical Slices Plan — changelog entry (~5 min)

- Add changelog entry for Mar 1–3: Wistia video integration, CSP policy additions, PROGRAM_ADMIN constant, session carryover prevention fix

## What We're NOT Doing

- No code changes
- No restructuring docs hierarchy
- Not updating handoff docs (session-specific)
- Not touching archive
- Not modifying git worktree configuration

## Open Questions

None — scope is locked.

## Risk Notes

- **Merge conflict risk**: Low. Only docs are changing, and the project plan + CLAUDE.md are nearly identical between worktrees (small delta).
- **Missing-doc risk**: The 3 brainstorm docs and solutions directory that only exist in main must be copied into pre-main BEFORE the merge. If pre-main merges without them, git will see "these files don't exist in pre-main" and they'll remain on main — no data loss, but they won't show the merge brought everything together.

## Estimated Effort

~40 minutes total, all doc updates, no code.
