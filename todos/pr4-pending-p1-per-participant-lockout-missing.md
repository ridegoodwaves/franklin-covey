---
status: pending
priority: p1
issue_id: pr4
tags: [security, auth, rate-limiting, participant, lockout]
---

# Per-Participant Lockout Not Implemented — IP-Only Rate Limiting

## Problem Statement

The PR description and the vertical slices plan both specify a defense-in-depth auth model: "per-IP rate limiting + per-participant lockout." The plan moved `failedAttempts` and `lockedUntil` fields from `VerificationCode` to the `Participant` model to ensure lockout persists across code resets.

However, in the actual implementation in this PR, the `Participant` schema has no `failedAttempts` or `lockedUntil` fields, and the `verify-email` route only performs IP-based rate limiting via the in-memory `consumeRateLimit` function. There is no per-participant lockout at all.

This matters because:
1. The in-memory rate limiter resets on server restarts and does not persist across Vercel function instances (Vercel runs serverless — each invocation may get a fresh process).
2. An attacker on a different IP can enumerate participant emails without limit.
3. The plan explicitly described per-participant lockout as a security requirement.

## Findings

**Schema** (`/Users/amitbhatia/.cursor/franklin-covey/prisma/schema.prisma`):

```prisma
model Participant {
  id             String       @id @default(cuid())
  email          String
  // ... no failedAttempts, no lockedUntil
}
```

**Rate limit implementation** (`/Users/amitbhatia/.cursor/franklin-covey/src/lib/server/rate-limit.ts`):

```typescript
declare global {
  var __rateLimitBuckets: Map<string, RateLimitBucket> | undefined;
}
```

This is a `globalThis` in-memory store. On Vercel serverless, this does NOT persist across concurrent function invocations or cold starts. It works for local dev, but provides only partial protection in production.

**Auth route** (`/Users/amitbhatia/.cursor/franklin-covey/src/app/api/participant/auth/verify-email/route.ts`):

```typescript
const rateLimit = consumeRateLimit({
  key: `participant-verify-email:${ip}`,  // IP only, no participant key
  ...
});
```

## Proposed Solutions

**Phase 1 (Schema) — Add lockout fields to Participant:**

```prisma
model Participant {
  // ... existing fields ...
  failedAuthAttempts Int       @default(0)
  lockedUntil        DateTime?
}
```

**Phase 2 (Route logic) — Check and increment per-participant lockout in verify-email:**

After looking up participant by email, check `lockedUntil`. On failed match, increment `failedAuthAttempts`. Lock after N attempts (e.g., 5). Reset on successful match.

**Phase 3 (Rate limiter) — Swap to Supabase-backed store:**

Replace `globalThis.__rateLimitBuckets` with a Supabase query or Vercel KV for persistence across function instances.

For MVP, Phase 1+2 alone (DB-backed per-participant lockout) is sufficient and blocks the main attack vector without needing external KV.

## Acceptance Criteria

- [ ] `Participant` model has `failedAuthAttempts` and `lockedUntil` fields
- [ ] Migration generated and applied
- [ ] Verify-email endpoint increments `failedAuthAttempts` on unrecognized email
- [ ] Participant is locked after 5 failed attempts for 1 hour
- [ ] Lockout persists across server restarts (DB-backed, not in-memory)
- [ ] Successful match resets `failedAuthAttempts`
- [ ] `lockedUntil` check occurs before the rate-limit window (fast reject)

## Work Log

- 2026-02-25: Identified during PR #4 review — plan specified per-participant lockout but schema and implementation do not include it
