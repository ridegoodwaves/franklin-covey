# Session Handoff - Vercel DB Fix & Participant Login Debug

**Date**: 2026-02-25
**Branch**: `fix/test-endpoint-guard-and-access-code-hashing`
**Status**: 🟡 In Progress

---

## ✅ Accomplished This Session

- **Ran 3 parallel technical reviews** (DHH, Kieran, Code Simplicity) on four FC platform docs, surfacing 4 P0 security issues and 13 simplification opportunities
- **Executed two P0 plan corrections** from Kieran's review into `docs/plans/2026-02-12-feat-mvp-backend-vertical-slices-plan.md`:
  - `/api/test/*` guard: Changed `NODE_ENV` → `TEST_ENDPOINTS_ENABLED=true` + `X-Test-Secret` header (Vercel sets NODE_ENV=production everywhere)
  - Access-code hashing: HMAC-SHA256 with server secret (bcrypt is wrong for low-entropy 6-digit codes); lockout on `Participant` model, not on `VerificationCode`
- **Created PR #4** (merged): https://github.com/ridegoodwaves/franklin-covey/pull/4
- **Updated `/handoff` command** to save in `docs/handoffs/YYYYMMDD-HHMM-[context].md` with `--resume` flag added
- **Diagnosed participant login 500 error** on Vercel preview:
  - Root cause: `DATABASE_URL` pointed to direct Postgres (port 5432, not IPv4-compatible with Vercel serverless)
  - Fix: Updated to Supabase Shared Pooler URL (port 6543, IPv4-compatible)
  - Old: `postgresql://postgres:[pwd]@db.uboonaypnyuqcvqzyecm.supabase.co:5432/postgres`
  - New: `postgresql://postgres.uboonaypnyuqcvqzyecm:[pwd]@aws-1-us-east-1.pooler.supabase.com:6543/postgres`
- **Saved new DATABASE_URL** in Vercel env vars for Preview environment (confirmed "Updated Environment Variable successfully")

## 🔄 In Progress

- **Redeploy interrupted** — session ended mid-click on the "Redeploy" button in Vercel's success toast. The DATABASE_URL is saved but the preview has NOT been redeployed yet with the new value.
- Vercel preview URL: `https://franklin-covey-git-fix-test-endpo-345847-ridegoodwaves-projects.vercel.app/`
- The fix is saved but not live.

## 📋 Next Steps (Priority Order)

1. **Redeploy the Vercel preview** — Go to Vercel dashboard → `fix/test-endpoint-guard-and-access-code-hashing` deployment → Redeploy (or push a trivial commit to trigger rebuild). (~5 min)
2. **Verify participant login** — Test `Julius.S.Abad@usps.gov` at `https://franklin-covey-git-fix-test-endpo-345847-ridegoodwaves-projects.vercel.app/participant`. Also test `tim@coachinginnovationlab.com` and `amit@coachinginnovationlab.com`. (~10 min)
3. **Rotate staging database password** — User shared `n9we197aItj7FWco` in plain text in chat. Go to Supabase Dashboard → Settings → Database → Reset password. Update the new password in Vercel env vars. (~10 min)
4. **Investigate `prisma/schema.prisma`** — No `directUrl` is configured. For Supabase pooler setups, best practice is `url = pooler URL` + `directUrl = direct URL` (for migrations). Verify this won't break `prisma migrate`. (~15 min)
5. **Merge PR #4 if not done** — https://github.com/ridegoodwaves/franklin-covey/pull/4 — the test endpoint guard + access-code hashing plan corrections.

## 🔧 Key Files Modified

- `docs/plans/2026-02-12-feat-mvp-backend-vertical-slices-plan.md` — 8 targeted edits: TEST_ENDPOINTS_ENABLED guard, HMAC-SHA256 hashing, lockout on Participant model, changelog `2026-02-24b`
- `/Users/amitbhatia/.claude/commands/handoff.md` — Updated save location to `docs/handoffs/`, added `--resume` flag

## ⚠️ Blockers / Decisions Needed

- **🔴 SECURITY**: Staging database password `n9we197aItj7FWco` was shared in chat — rotate it before doing anything else
- **Schema**: `prisma/schema.prisma` has no `directUrl` — need to verify Prisma migrations still work with pooler-only config (add `directUrl = env("DATABASE_URL_DIRECT")` if migrations break)
- **Uncommitted files**: Several doc files are modified but unstaged (briefings, plans). These are likely from earlier work — confirm before committing.

## 🚀 Quick Start Next Session

```
We were fixing participant login on the Vercel preview deployment for the FC coaching platform. The DATABASE_URL was updated in Vercel from direct Postgres (port 5432) to the Supabase Shared Pooler (port 6543) — this is required for Vercel serverless IPv4 compatibility.

The save was confirmed but the preview wasn't redeployed before the session ended.

Branch: fix/test-endpoint-guard-and-access-code-hashing
Preview URL: https://franklin-covey-git-fix-test-endpo-345847-ridegoodwaves-projects.vercel.app/

1. Trigger a Vercel redeploy for this branch (either via the dashboard or a trivial commit push)
2. Test login with Julius.S.Abad@usps.gov at /participant
3. SECURITY: Rotate the staging DB password that was shared in chat — go to Supabase Dashboard → Settings → Database → Reset password, then update Vercel env vars

Also: investigate adding directUrl to prisma/schema.prisma for migration compatibility with the pooler URL.
```

---
**Uncommitted Changes:** Yes — `docs/briefings/` and `docs/plans/` doc files modified but not staged. Also `.env.staging.secrets` untracked.
**Tests Passing:** Unknown (no test run this session; build passed on last commit)
