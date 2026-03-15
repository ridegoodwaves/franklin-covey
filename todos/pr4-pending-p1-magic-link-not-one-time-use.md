---
status: pending
priority: p1
issue_id: pr4
tags: [security, auth, magic-link, coach-portal]
---

# Magic Link Tokens Are Not One-Time-Use

## Problem Statement

The magic link implementation in `src/app/api/auth/magic-link/consume/route.ts` is stateless — it verifies a HMAC-signed JWT and writes a portal session, but does not mark the token as consumed in the database. This means a single magic link can be used multiple times within its TTL window (30 minutes by default).

For a coaching platform handling government employees, a replayable authentication token is a security gap. If a link is forwarded, captured in proxy logs, or an email client pre-fetches the link (GET request), the token remains valid.

## Findings

In `/Users/amitbhatia/.cursor/franklin-covey/src/app/api/auth/magic-link/consume/route.ts`:

```typescript
async function consumeToken(token: string | null) {
  // ...verifies signature and DB lookup...
  // NO database write to mark token consumed
  return { ok: true, user };
}
```

The `GET` handler is particularly exposed: email clients that pre-fetch links to generate previews will consume the GET endpoint, writing a session for their fetch agent, while the human user then clicks the link and gets `INVALID_TOKEN` — OR the pre-fetch silently "uses" the token and the actual user's GET also succeeds (since there is no consumed check).

The `POST` variant (programmatic exchange) has the same gap.

In `/Users/amitbhatia/.cursor/franklin-covey/src/lib/server/session.ts`, `createMagicLinkToken` uses the same `createSignedToken` infrastructure as participant sessions — purely stateless, no DB reference.

## Proposed Solutions

**Option A (Recommended for MVP):** Store a `MagicLinkToken` table row on issue, mark `consumedAt` on first successful consume. On GET, redirect prefetch-safe by checking `User-Agent` for known bot patterns first; return a human-readable link page rather than direct redirect.

**Option B (Simpler):** Add a short-lived Redis/KV nonce (Vercel KV). Too much infrastructure for MVP.

**Option C (Minimum viable):** Add `tokenNonce` (UUID) to the JWT payload and store in Supabase with a `usedAt` field. Consume on first DB hit. Single table row, no new infrastructure.

Option C fits the existing Prisma/Supabase stack.

## Acceptance Criteria

- [ ] A magic link token can only produce a valid session once
- [ ] Subsequent uses of the same token return an expired/invalid error
- [ ] Email pre-fetch (GET with bot User-Agent) does not consume the token
- [ ] 30-minute TTL is still enforced
- [ ] Existing `writePortalSession` flow unchanged from the outside

## Work Log

- 2026-02-25: Identified during PR #4 review — not introduced by this PR (the stateless design predates it) but became reviewable as magic-link code first landed here
