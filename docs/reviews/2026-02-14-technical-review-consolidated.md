# Technical Review — MVP Backend Plan (Consolidated)

**Date**: 2026-02-14
**Reviewers**: DHH-style (architecture pragmatism), TypeScript (type safety & patterns)
**Plan reviewed**: `docs/plans/2026-02-12-feat-mvp-backend-vertical-slices-plan.md`
**Status**: Findings applied to plan

---

## High-Confidence Changes (Apply Before Coding)

### 1. Replace Serializable Transactions
**Both reviewers agree.** Serializable isolation is overkill for 400 users / 35 coaches.

- **Coach selection**: Use `SELECT FOR UPDATE` on the coach row. Locks only that coach, allows other coaches to be selected concurrently.
- **Session numbering**: Rely on `@@unique([engagementId, sessionNumber])` constraint (already in schema) + catch/retry on unique violation.
- **Session logging auto-transitions**: Default isolation with optimistic locking (`statusVersion` WHERE clause).

### 2. Simplify Phase 0 Utilities
Cut from Phase 0 scope. Build inline during Slice 1, extract when duplication appears:

| Utility | Verdict |
|---------|---------|
| Engagement state machine | **Keep** — core domain logic |
| Zod validation schemas | **Keep** — needed for all API routes |
| Email client wrapper | **Keep** — needed for OTP in Slice 1 |
| Coach CSV import script | **Keep** — critical path for March 2 |
| Structured logging (pino + JSON + request ID) | **Cut** — use `console.log`/`console.error` for MVP |
| PII masking in logger | **Cut** — don't log emails instead of building a masking layer |
| API response helpers (successResponse/errorResponse) | **Cut** — use `NextResponse.json()` directly |
| Rate limiting middleware | **Simplify** — use Vercel's built-in or simple in-memory map with TTL |

### 3. Replace Advisory Lock with Timestamp Guard
The nudge cron runs once daily. Nobody runs it concurrently. Replace `pg_advisory_xact_lock` with:
```typescript
const lastRun = await prisma.nudgeLog.findFirst({ orderBy: { flaggedAt: 'desc' } });
if (lastRun && Date.now() - lastRun.flaggedAt.getTime() < 3600_000) return; // Skip if ran < 1hr ago
```

### 4. Simplify Coach Ordering
Use `Math.random()` instead of Fisher-Yates with seeded PRNG. Deterministic ordering has UX value (no flickering on refresh) but costs implementation time. Add seeding post-launch if flickering is noticeable.

### 5. Decide on Auth System
Two options, pick one before coding:
- **Option A (DHH recommendation)**: Single Auth.js system for all roles. Email provider handles both OTP-style codes and magic links.
- **Option B (TypeScript recommendation)**: Keep dual system but define discriminated union types with `kind` field on sessions.

Option A is simpler to debug on launch day. Option B preserves the 30-day participant session vs 30-min coach/admin timeout split.

---

## Implementation Quality Items (Address During Coding)

### Typed Error Classes
Replace string-based errors with typed classes:
```typescript
// src/lib/errors.ts
export class CoachAtCapacityError extends Error {
  readonly code = 'COACH_AT_CAPACITY' as const;
  constructor(public readonly coachId: string) { super(`Coach ${coachId} at capacity`); }
}
// Use: catch (e) { if (e instanceof CoachAtCapacityError) return NextResponse.json(..., { status: 409 }) }
```

### Null Safety in Transactions
Use `findFirstOrThrow` instead of `findFirst` in transaction code. The coach selection transaction can crash if `findFirst` returns null (participant already selected a coach, or coach ID fabricated).

### Consistent Optimistic Locking
The auto-complete transition (session logging step 5) is missing `statusVersion` in the WHERE clause. Every `engagement.update` that changes `status` must also check `statusVersion`. Extract into `transitionEngagement()` function.

### Typed API Response Contracts
Define `ApiResponse<T>` types shared between API routes and frontend SWR calls:
```typescript
type ApiSuccess<T> = { success: true; data: T };
type ApiError = { success: false; error: string; code?: string };
type ApiResponse<T> = ApiSuccess<T> | ApiError;
```
Without this, `any` propagates through every `useSWR` call on the frontend.

### State Machine Composability
`transitionEngagement()` should accept `Prisma.TransactionClient` as first arg so it can compose inside existing transactions rather than creating its own.

### Narrow Status Functions
Once Prisma enums exist, narrow `getStatusColor(status: string)` and `getStatusLabel(status: string)` in `src/lib/utils.ts` to `EngagementStatus | SessionStatus`.

### Validate Remix excludeIds
Add `z.array(z.string().uuid()).max(3)` to prevent abuse of the remix endpoint.

---

## What the Plan Gets Right

- Vertical slices aligned to deadlines
- Next.js API routes in same repo (no separate backend)
- Dashboard flags over email nudges
- `@media print` CSS over PDF library
- No E2E tests for MVP (Vitest unit on critical paths)
- CSV injection prevention
- Link-based scheduling over Calendly API
- OTP auth over HMAC tokens (simpler distribution)

---

## Disputed: Organization Model

| Perspective | Argument |
|-------------|----------|
| **Cut it** (DHH) | One org at launch. Add when client two signs. Every query gains cognitive overhead for zero users. |
| **Keep it** (TypeScript) | Greg explicitly asked for it. One model + one FK is cheap. Migration later touches every Program row. |

**Decision**: Keep the model in schema but don't scope queries to org for MVP. Just a FK on Program with a default value. No org-switching UI. Re-evaluate when second client is real.
