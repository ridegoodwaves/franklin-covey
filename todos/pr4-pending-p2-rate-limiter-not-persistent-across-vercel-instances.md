---
status: pending
priority: p2
issue_id: pr4
tags: [security, rate-limiting, vercel, serverless, infrastructure]
---

# In-Memory Rate Limiter Does Not Persist Across Vercel Serverless Instances

## Problem Statement

The `consumeRateLimit` function in `src/lib/server/rate-limit.ts` stores hit counts in `globalThis.__rateLimitBuckets` — a Node.js process-level in-memory map. On Vercel serverless (and Edge) runtimes, each function invocation may run in a separate process instance. The global state is not shared across concurrent requests hitting different instances.

This means the 10-request-per-hour IP limit for `/api/participant/auth/verify-email` can be trivially bypassed by making more than 10 requests concurrently from the same IP — each concurrent request may land in a different function instance with a fresh (empty) bucket.

For a platform processing 400 government participants with sensitive PII in the roster, an email enumeration attack that bypasses rate limiting is a meaningful risk.

## Findings

File: `/Users/amitbhatia/.cursor/franklin-covey/src/lib/server/rate-limit.ts`

```typescript
declare global {
  var __rateLimitBuckets: Map<string, RateLimitBucket> | undefined;
}

function getBuckets(): Map<string, RateLimitBucket> {
  if (!globalThis.__rateLimitBuckets) {
    globalThis.__rateLimitBuckets = new Map();
  }
  return globalThis.__rateLimitBuckets;
}
```

This pattern is standard for Next.js local dev (single process) and acceptable for a brief MVP window. However, on Vercel's serverless deployment, multiple function instances run concurrently and do not share globalThis.

The verify-email route is the only route with rate limiting — magic link request endpoint (`/api/auth/magic-link/request`) has no rate limiting at all, which is a separate gap.

## Proposed Solutions

**Option A — Supabase-backed rate limit table (recommended, no new infra):**

Add a `RateLimitEntry` table to Prisma with `key`, `hitCount`, `windowStart`, `expiresAt`. Use a Prisma upsert+increment within each request. Slight DB overhead but persistent and consistent across instances.

**Option B — Vercel KV (Redis):**

Vercel KV is a managed Redis. Simple `INCR` + `EXPIRE` gives accurate distributed rate limiting. Requires adding `@vercel/kv` dependency and provisioning KV in Vercel dashboard. More infrastructure for MVP but the right long-term answer.

**Option C — Keep in-memory for MVP, document the limitation:**

The existing implementation is better than nothing for the initial March 16 launch window. Document that it provides best-effort protection for a single function instance only. Plan to migrate to Supabase-backed or Vercel KV before the EF/EL pool launch (March 16 high-traffic period).

Recommendation: Option C for MVP launch (March 16), Option A for the EF/EL cohort. Add a comment in `rate-limit.ts` documenting the single-instance limitation explicitly.

## Acceptance Criteria

- [ ] Rate limit behavior is documented as single-instance in code comments (MVP minimum)
- [ ] Before EF/EL cohort (March 16 EF launch or later cohort date): rate limit store migrated to Supabase table or Vercel KV
- [ ] Magic link request endpoint (`/api/auth/magic-link/request`) gets rate limiting (see separate todo)
- [ ] Rate limit key schema documented for future distributed implementation

## Work Log

- 2026-02-25: Identified during PR #4 review
