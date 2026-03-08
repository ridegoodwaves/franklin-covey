---
status: pending
priority: p2
issue_id: pr4
tags: [security, rate-limiting, magic-link, coach-portal]
---

# Magic Link Request Endpoint Has No Rate Limiting

## Problem Statement

`POST /api/auth/magic-link/request` has no rate limiting. An attacker who discovers a valid coach or admin email can trigger unlimited magic link emails to that address, causing email flooding.

The participant verify-email endpoint has IP-based rate limiting (10/hour), but the coach/admin magic link request endpoint has none.

## Findings

File: `/Users/amitbhatia/.cursor/franklin-covey/src/app/api/auth/magic-link/request/route.ts`

The route:
1. Parses email from body
2. Looks up user in DB
3. Creates magic link token
4. Sends via Resend

No call to `consumeRateLimit` anywhere in the file. No import of `rate-limit.ts`.

The non-enumerating response pattern (`return NextResponse.json({ success: true })` for unknown emails) is correct and present — but that only prevents enumeration. It does not prevent flood sending to known addresses.

## Proposed Solutions

Add rate limiting to `/api/auth/magic-link/request` using the existing `consumeRateLimit` helper:

```typescript
const ip = getRequestIpAddress(request.headers);
const rateLimit = consumeRateLimit({
  key: `magic-link-request:${ip}`,
  maxRequests: 5,
  windowMs: 60 * 60 * 1000, // 5 per hour per IP
});

if (!rateLimit.allowed) {
  return NextResponse.json(
    { success: false, error: "RATE_LIMITED" },
    { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
  );
}
```

Note the same caveat applies: this is in-memory and single-instance. See the separate todo on persistent rate limiting. For MVP, in-memory is acceptable.

## Acceptance Criteria

- [ ] `/api/auth/magic-link/request` applies IP-based rate limiting (max 5/hour per IP)
- [ ] Rate limited requests return 429 with `Retry-After` header
- [ ] Rate limit applies before DB lookup (fail fast)

## Work Log

- 2026-02-25: Identified during PR #4 review — verify-email has rate limiting but magic-link/request does not
