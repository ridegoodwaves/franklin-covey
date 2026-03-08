# Workspace Identity (READ FIRST)

## This Folder
- Path: `/Users/amitbhatia/.cursor/franklin-covey-main-priority`
- Branch (expected): `pre-main-priority-branch`
- Purpose: **Main-priority pre-main branch (merge target before ongoing main worktree changes)**

## What This Branch Is For
- Ship and stabilize the pre-main priority scope:
  - Wistia coach intro video embed rollout
  - CSP hardening for App Router client-navigation behavior
  - participant session carryover prevention fix
  - participant admin-contact consistency update
  - core documentation sync before merge
- Source plan:
  - `/Users/amitbhatia/.cursor/franklin-covey/docs/plans/2026-02-28-feat-wistia-coach-intro-videos-plan.md`

## Why This Is Separate
- Slice 2 implementation already has local in-progress changes in another folder.
- This separate clean worktree avoids mixing unrelated changes and reduces merge risk.

## What You Should Do Here
- Keep commits scoped to the pre-main priority set and documentation synchronization.
- Ensure docs reflect shipped Mar 1-2 fixes before merge to `main`.

## What You Should NOT Do Here
- Do NOT continue Slice 2 admin dashboard/reporting implementation here.
- Do NOT copy in unfinished Slice 2 local changes from the other folder.

## Slice 2 Work Location (Other Folder)
- Path: `/Users/amitbhatia/.cursor/franklin-covey`
- Purpose there: Slice 2 implementation only.

## Safety Check (run before coding/commit)
```bash
pwd
git branch --show-current
git status --short --branch
```

If path/branch do not match this file, stop and switch folders before editing.
