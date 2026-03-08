---
status: pending
priority: p2
issue_id: pr4
tags: [testing, e2e, test-endpoints, infrastructure]
---

# Test Endpoint Guard Env Var Exists but No /api/test/* Routes Implemented

## Problem Statement

The PR correctly introduces the `TEST_ENDPOINTS_ENABLED` + `TEST_ENDPOINTS_SECRET` guard pattern to fix the NODE_ENV false-production problem on Vercel staging. The env vars are documented in `.env.example`, `.env.staging.example`, and validated by `scripts/validate-env-safety.mjs`.

However, there are no actual `/api/test/*` route files in the codebase. The guard infrastructure is in place but nothing consumes it. This is a planned gap (E2E test endpoints are a future Slice deliverable), but it should be tracked as an explicit follow-up: when test routes are added, they must implement the guard pattern.

## Findings

No files found at path pattern:
- `/Users/amitbhatia/.cursor/franklin-covey/src/app/api/test/**`

The guard variables are referenced in:
- `/Users/amitbhatia/.cursor/franklin-covey/.env.example` (lines 43-48)
- `/Users/amitbhatia/.cursor/franklin-covey/.env.staging.example` (lines 27-28)
- `/Users/amitbhatia/.cursor/franklin-covey/scripts/validate-env-safety.mjs` (lines 138-142, 161-163)

The plan document (vertical slices plan) describes test endpoint infrastructure for Slice 2 E2E testing.

## Proposed Solutions

When implementing `/api/test/*` routes, each route must:

1. Check `process.env.TEST_ENDPOINTS_ENABLED !== "true"` — return 404 if not enabled
2. Check `request.headers.get("X-Test-Secret") === process.env.TEST_ENDPOINTS_SECRET` — return 403 if secret doesn't match
3. Be excluded from production deployments via the validate-env-safety script (already enforced)

Suggested helper to extract into `src/lib/server/test-endpoint-guard.ts`:

```typescript
export function assertTestEndpointAllowed(request: NextRequest): void | never {
  if (process.env.TEST_ENDPOINTS_ENABLED !== "true") {
    throw new Response(null, { status: 404 });
  }
  const secret = process.env.TEST_ENDPOINTS_SECRET?.trim();
  if (!secret || request.headers.get("X-Test-Secret") !== secret) {
    throw new Response(null, { status: 403 });
  }
}
```

## Acceptance Criteria

- [ ] `src/lib/server/test-endpoint-guard.ts` helper exists before any `/api/test/*` route is written
- [ ] Every test route calls the guard as its first line
- [ ] Validate-env-safety script blocks `TEST_ENDPOINTS_ENABLED=true` in production (already implemented)
- [ ] At least one test route exists before Slice 2 E2E testing begins

## Work Log

- 2026-02-25: Identified during PR #4 review — guard env vars introduced without consuming routes
