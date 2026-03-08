---
status: pending
priority: p1
issue_id: pr4
tags: [security, cookies, vercel, staging, session]
---

# Cookie `secure` Flag Tied to NODE_ENV, Which Is Always "production" on Vercel

## Problem Statement

The `cookieSecure()` function in `src/lib/server/session.ts` returns `true` only when `NODE_ENV === "production"`. On Vercel, `NODE_ENV` is always `"production"` for both staging and production deployments. This means `secure: true` is correctly set on both environments — which is fine for production but was the exact same class of problem that the PR itself fixed for `TEST_ENDPOINTS_ENABLED`.

More critically, the inverse is also true: in local development, `NODE_ENV` is `"development"`, so `secure: false`. That is correct for local. But the implementation relies on the same `NODE_ENV` escape hatch that the PR explicitly identified as unreliable for discriminating staging vs. production environments.

If a developer ever needed to run with `NEXT_PUBLIC_APP_ENV=staging` locally (e.g., connecting to staging DB), cookies would be `secure: false` — meaning session cookies transmitted over HTTP. While this is acceptable for `localhost`, it is a pattern inconsistency with the rest of the env-awareness strategy introduced in this PR.

Additionally, `src/lib/db.ts` uses the same pattern:

```typescript
if (process.env.NODE_ENV !== "production") {
  globalThis.__prismaClient = prisma;
}
```

On Vercel staging, `NODE_ENV === "production"`, so the Prisma client singleton cache is disabled for staging (new client per cold start). This is not a security issue but a performance inconsistency that could cause unexpected behavior differences between local and staging.

## Findings

File: `/Users/amitbhatia/.cursor/franklin-covey/src/lib/server/session.ts`

```typescript
function cookieSecure(): boolean {
  return process.env.NODE_ENV === "production";
}
```

File: `/Users/amitbhatia/.cursor/franklin-covey/src/lib/db.ts`

```typescript
if (process.env.NODE_ENV !== "production") {
  globalThis.__prismaClient = prisma;
}
```

The PR correctly moved TEST_ENDPOINTS guard away from NODE_ENV. The cookie and DB singleton code should adopt the same `NEXT_PUBLIC_APP_ENV` signal for env-discrimination.

## Proposed Solutions

Replace `NODE_ENV === "production"` in `cookieSecure()` with logic based on `NEXT_PUBLIC_APP_ENV`:

```typescript
function cookieSecure(): boolean {
  const appEnv = process.env.NEXT_PUBLIC_APP_ENV;
  // Secure on staging and production (Vercel). Insecure for local only.
  return appEnv === "production" || appEnv === "staging";
}
```

For `db.ts`, use the same env signal to conditionally enable the Prisma singleton on staging:

```typescript
const isHosted = process.env.NEXT_PUBLIC_APP_ENV === "production" || process.env.NEXT_PUBLIC_APP_ENV === "staging";
if (!isHosted) {
  globalThis.__prismaClient = prisma;
}
```

## Acceptance Criteria

- [ ] `cookieSecure()` returns `true` on both staging and production Vercel deployments
- [ ] `cookieSecure()` returns `false` only in local development (`NEXT_PUBLIC_APP_ENV` absent or set to `local`)
- [ ] Prisma singleton caching is consistent between local and staging
- [ ] Behavior on production is unchanged

## Work Log

- 2026-02-25: Identified during PR #4 review — same class of problem as the NODE_ENV test-endpoint guard that this PR explicitly fixed
