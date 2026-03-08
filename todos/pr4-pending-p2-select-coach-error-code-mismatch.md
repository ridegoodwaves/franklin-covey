---
status: pending
priority: p2
issue_id: pr4
tags: [bug, api, coach-selection, error-handling]
---

# Select Coach Route Returns CAPACITY_FULL for Invalid Body Parse Failure

## Problem Statement

In `src/app/api/participant/coaches/select/route.ts`, when the request body fails to parse (malformed JSON), the route returns `{ success: false, error: "CAPACITY_FULL" }`. This is semantically incorrect: a parse failure is not a capacity issue. It misleads the frontend into showing "This coach just filled up" to the user when the actual error is a malformed request.

## Findings

File: `/Users/amitbhatia/.cursor/franklin-covey/src/app/api/participant/coaches/select/route.ts`

```typescript
try {
  const body = (await request.json()) as { coachId?: string };
  coachId = String(body.coachId || "").trim();
} catch {
  return NextResponse.json({ success: false, error: "CAPACITY_FULL" }); // Wrong error code
}

if (!coachId) {
  return NextResponse.json({ success: false, error: "CAPACITY_FULL" }); // Also wrong for missing field
}
```

The frontend in `select-coach/page.tsx` maps `CAPACITY_FULL` to:
```typescript
case "CAPACITY_FULL":
  setInlineError("This coach just filled up — please select another");
```

A user with a malformed request (or a network issue causing body truncation) would see "This coach just filled up" — a confusing and incorrect message.

Compare with `verify-email/route.ts` which correctly returns `UNRECOGNIZED_EMAIL` for parse failures (also not ideal, but at least not misleading in the same way).

## Proposed Solutions

Add `INVALID_REQUEST` to the `SelectCoachErrorCode` union in `src/lib/api-client.ts` and return it for parse/validation failures:

```typescript
} catch {
  return NextResponse.json(
    { success: false, error: "INVALID_SESSION" },
    { status: 400 }
  );
}
```

Actually `INVALID_SESSION` may be the most appropriate existing code for a fundamentally bad request — it will redirect to re-authenticate, which is a safe recovery path. Or add a proper `INVALID_REQUEST` code.

## Acceptance Criteria

- [ ] Body parse failure returns a semantically correct error code (not `CAPACITY_FULL`)
- [ ] Missing `coachId` field returns a semantically correct error code
- [ ] Frontend handles the error code with an appropriate message
- [ ] `SelectCoachErrorCode` type in `api-client.ts` updated if new code added

## Work Log

- 2026-02-25: Identified during PR #4 review
