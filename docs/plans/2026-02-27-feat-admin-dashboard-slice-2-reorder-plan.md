---
title: "feat: Admin Dashboard Slice Reorder — Advance to March 9"
type: feat
date: 2026-02-27
deepened: 2026-02-27
brainstorm: docs/brainstorms/2026-02-27-admin-dashboard-scope-brainstorm.md
---

# ✨ Admin Dashboard — Advance to Slice 2 (March 9)

## Enhancement Summary

**Deepened:** 2026-02-27
**Research agents:** security-sentinel, performance-oracle, architecture-strategist, kieran-typescript-reviewer, julik-frontend-races-reviewer, data-integrity-guardian, code-simplicity-reviewer, best-practices-researcher, framework-docs-researcher

### Critical Corrections (Blockers)

1. **Do not install Auth.js** — custom auth (`fc_portal_session`, magic links) is already fully implemented. Adding `next-auth@beta` is YAGNI and introduces competing session models. Extend the existing middleware instead.
2. **`coachSelectionDeadline` does not exist** on `Engagement` — the field is `Cohort.coachSelectionEnd`. The needs-attention query will crash at runtime as written.
3. **`EXECUTING` is not in `ImportStatus` enum** — schema only has `VALIDATED | EXECUTED | FAILED`. Use advisory lock pattern (`pg_advisory_xact_lock`) from existing `security-guards.ts` instead.
4. **MVP admin scope must be explicit** — ADMIN users are global-capable, but March 9 dashboard/reporting must be USPS-only.
5. **Rate limiting is zero** on `/api/auth/magic-link/request` — no IP or email limit is applied despite the existing pattern in `security-guards.ts`.

### Key Simplifications Applied

- Auth.js removed → extend `src/middleware.ts` + `src/lib/server/session.ts`
- CSV streaming replaced → string response (175 rows doesn't need streaming)
- Executive summary endpoint eliminated → 2 metrics folded into KPI endpoint
- `unstable_cache` removed from KPI endpoint → `cache: 'no-store'`
- Sparklines removed → plain count cards (no historical data at launch)
- `useSWR` replaced → `fetch`+`useEffect` or server components
- Coaches search filter removed → 32 rows needs no search

**Estimated time recovered: 3–5 days on a 7-day timeline.**

---

## Overview

Advance the admin dashboard from Slice 3 (March 16) to Slice 2 (March 9) to give Kari and Andrea operational visibility during the critical two-week uptake window after ALP-135 launches March 2.

The coach session logging portal (previously Slice 2, March 9) shifts to Slice 3 (March 16). This is feasible because: the admin dashboard depends only on Slice 1 data (participants + engagements); session logging isn't needed until ALP-135 coaching starts March 12; and the 4-day gap (March 12–16) is accepted with retroactive logging.

**Kari's March 6 deadline resets to March 9. She must be informed before launch.**

---

## Revised Slice Deadlines

| Slice | Feature Set | Deadline | Status |
|---|---|---|---|
| Slice 1 | Participant auth + coach selection + scheduling link | March 2 | Unchanged |
| **Slice 2 (this plan)** | **Middleware auth enforcement + Admin dashboard visibility/reporting (KPIs, engagement table, needs-attention, CSV export, coach roster)** | **March 9** | Moved up from March 16 |
| **Slice 3 (deferred)** | **Coach portal: session logging + engagement tracking + bulk import execution** | **March 16** | Moved out from March 9 |

---

## What Ships March 9

### 2.1 Auth Middleware Enforcement (replaces "Install Auth.js")
- Extend `src/middleware.ts` to protect `/admin/*` (ADMIN role) and `/coach/*` (COACH role)
- Read `fc_portal_session` via existing `readPortalSession(request)` from `session.ts`
- Idle timeout: check `exp` claim, redirect to `/auth/signin` on expiry
- Magic link rate limiting: apply DB-backed pattern from `security-guards.ts` to `/api/auth/magic-link/request` with lock values (6/hour per email, 30/hour per IP, optional 10/10min IP burst guard, 60s resend cooldown)

### 2.2 Admin Dashboard APIs
- `GET /api/admin/dashboard/kpis` — 8 KPI counts + completionRate + programBreakdown (no separate executive endpoint)
- `GET /api/admin/engagements` — paginated/filtered engagement table
- `GET /api/admin/coaches` / `PATCH /api/admin/coaches/:id` — coach roster

### 2.3 Needs-Attention Workflow
- Dynamic query helper `src/lib/needs-attention.ts` (no cron)
- Correct field: `cohort.coachSelectionEnd` (not `coachSelectionDeadline`)
- Handle `lastActivityAt: null` explicitly (treat as not-stalled for COACH_SELECTED)

### 2.4 CSV Export
- `GET /api/export` — string response (not streaming), filter-aware, injection-safe
- `@media print` styles for dashboard

### 2.5 Wire Admin Frontend
- Server components for read-only pages (dashboard, coaches)
- Client-side interactions only where required for filtering/export UX

---

## Key Design Decisions

### Auth: Extend Existing System, Not Auth.js

The custom auth system is already fully implemented:
- `/api/auth/magic-link/request` and `/api/auth/magic-link/consume` are live
- `writePortalSession` / `readPortalSession` produce signed `fc_portal_session` cookies
- `consumeMagicLinkOneTime` in `security-guards.ts` enforces one-time use

**What's missing (and needs to be added):**

```typescript
// src/middleware.ts — add route guards
import { readPortalSession } from '@/lib/server/session'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Existing participant redirect
  if (pathname.startsWith('/participant/engagement')) {
    return NextResponse.redirect(new URL('/participant/', request.url));
  }

  // NEW: Admin route protection
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    const session = await readPortalSession(request);
    if (!session || session.role !== UserRole.ADMIN) {
      return NextResponse.redirect(new URL('/auth/signin', request.url));
    }
  }

  // NEW: Coach route protection (for Slice 3)
  if (pathname.startsWith('/coach') || pathname.startsWith('/api/coach')) {
    const session = await readPortalSession(request);
    if (!session || session.role !== UserRole.COACH) {
      return NextResponse.redirect(new URL('/auth/signin', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/participant/engagement/:path*',
    '/admin/:path*',
    '/api/admin/:path*',
    '/coach/:path*',
    '/api/coach/:path*',
  ],
};
```

**MVP org scope rule:** ADMIN remains global-capable, but March 9 admin APIs resolve scope to USPS for reporting consistency.

```typescript
// src/lib/server/admin-scope.ts
const MVP_ORG_CODE = 'USPS';

export async function resolveAdminOrgScope(session: PortalSession): Promise<string> {
  // March 9 lock: USPS-only reporting, regardless of global-capable admin role.
  const org = await prisma.organization.findUnique({ where: { code: MVP_ORG_CODE }, select: { id: true } });
  if (!org) throw new Error('USPS organization missing');
  return org.id;
}
```

**Fix magic link rate limiting:**

```typescript
// src/app/api/auth/magic-link/request/route.ts
// Add at the top of the POST handler, before any DB lookup or email send:
const ip = request.ip ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
await consumeIpRateLimit(ip, { maxRequests: 30, windowMs: 60 * 60 * 1000 });
await consumeIpRateLimit(ip, { maxRequests: 10, windowMs: 10 * 60 * 1000 }); // burst guard
await consumeEmailRateLimit(email, { maxRequests: 6, windowMs: 60 * 60 * 1000 });
await enforceMagicLinkCooldown(email, 60_000);
```

**Fix IP resolution:**

```typescript
// src/lib/server/rate-limit.ts — use request.ip instead of x-forwarded-for
// On Vercel, request.ip is the real client IP set by the platform
export function getRequestIpAddress(request: NextRequest): string {
  return request.ip ?? 'unknown';  // request.ip is Vercel-trusted
}
```

**Fix signed token segment check:**

```typescript
// src/lib/server/session.ts — after split, verify exactly 2 segments
const parts = token.split('.');
if (parts.length !== 2) return null;
const [encoded, signature] = parts;
```

**Add security headers:**

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      ],
    }];
  },
  images: { remotePatterns: [...] },
};
```

### Needs-Attention: Correct Field Names + Selection-Backed Activity

The original query has two bugs: a non-existent field and incorrect assumptions about activity timing.

```typescript
// src/lib/needs-attention.ts
import { EngagementStatus, ProgramTrack } from '@prisma/client';
import { NUDGE_THRESHOLDS } from '@/lib/config';
import { subDays } from 'date-fns';

export async function getNeedsAttentionEngagements(
  scopeOrgId: string,
  programId?: string
): Promise<NeedsAttentionEngagement[]> {
  const now = new Date();

  return prisma.engagement.findMany({
    where: {
      organizationId: scopeOrgId,
      ...(programId ? { programId } : {}),
      OR: [
        // Selection overdue: INVITED past Day 15 (TWO_SESSION only; EF/EL excluded)
        {
          status: EngagementStatus.INVITED,
          cohort: {
            program: { track: ProgramTrack.TWO_SESSION },
            coachSelectionEnd: { lt: now },  // ← CORRECT FIELD (not coachSelectionDeadline)
          },
        },
        // Selection stall: selected but no sessions logged within threshold
        {
          status: EngagementStatus.COACH_SELECTED,
          coachSelectedAt: { lt: subDays(now, NUDGE_THRESHOLDS.coachAttentionDays) },
          sessions: { none: {} },
        },
        // In-progress stall: selected/in-progress with stale activity timestamp
        {
          status: { in: [EngagementStatus.COACH_SELECTED, EngagementStatus.IN_PROGRESS] },
          lastActivityAt: {
            lt: subDays(now, NUDGE_THRESHOLDS.coachAttentionDays),
          },
        },
      ],
    },
    select: {
      id: true,
      status: true,
      coachSelectedAt: true,
      lastActivityAt: true,
      cohort: { select: { code: true, coachSelectionEnd: true } },
      participant: { select: { email: true } },
      organizationCoach: {
        select: { coachProfile: { select: { displayName: true } } },
      },
    },
  });
}

// For KPI count, use count — not findMany
export async function getNeedsAttentionCount(
  scopeOrgId: string,
  programId?: string
): Promise<number> {
  const now = new Date();
  return prisma.engagement.count({
    where: {
      organizationId: scopeOrgId,
      ...(programId ? { programId } : {}),
      OR: [/* same OR clauses as above */],
    },
  });
}
```

> **Note on activity semantics:** MVP activity starts at coach selection. `lastActivityAt` may be populated at selection time; sessions are tracked separately. Needs-attention logic should treat "selected + zero sessions for N days" as distinct from "in-progress but stale activity."

### KPI Endpoint: No Cache + Count via groupBy

```typescript
// src/app/api/admin/dashboard/kpis/route.ts
// Use cache: 'no-store' — KPIs change after every coach selection
// unstable_cache is per-serverless-instance and does not share across Vercel

export const dynamic = 'force-dynamic';  // equivalent to no-store

// Efficient: one groupBy instead of 8 separate count queries
const statusGroups = await prisma.engagement.groupBy({
  by: ['status'],
  where: { organizationId: scopeOrgId, ...(programId ? { programId } : {}) },
  _count: { status: true },
});

const counts = Object.fromEntries(
  statusGroups.map(g => [g.status, g._count.status])
) as Record<EngagementStatus, number>;

const total = Object.values(counts).reduce((a, b) => a + b, 0);
const completed = counts.COMPLETED ?? 0;

// completionRate and programBreakdown fold in here (no separate executive endpoint)
const programBreakdown = await prisma.engagement.groupBy({
  by: ['programId'],
  where: { organizationId: scopeOrgId },
  _count: { status: true },
});
```

### CSV Export: String Response (Not Streaming)

```typescript
// src/app/api/export/route.ts — string response for 175-400 rows
// Streaming ReadableStream is overkill at this data volume

function sanitizeCsvField(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // CSV injection: prefix formula-starting chars with tab (OWASP recommendation)
  const FORMULA_CHARS = /^[=+\-@\t\r]/;
  const cleaned = FORMULA_CHARS.test(str) ? `\t${str}` : str;
  // Escape double quotes and wrap if needed
  const escaped = cleaned.replace(/"/g, '""');
  return /[,"\n\r]/.test(escaped) ? `"${escaped}"` : escaped;
}

// Build CSV as string, return as Response
const rows = await prisma.engagement.findMany({ where: filter, select: exportColumns });
const csv = [header, ...rows.map(toRow)].join('\r\n');
const filename = `fc-${tab}-${date}.csv`;

return new Response(csv, {
  headers: {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  },
});
```

### Import Idempotency: Advisory Lock Pattern

The schema has no `EXECUTING` status in `ImportStatus`. Use the existing advisory lock pattern from `security-guards.ts`:

```typescript
// src/app/api/admin/import/execute/route.ts
// Use pg_advisory_xact_lock instead of EXECUTING enum value

await prisma.$transaction(async (tx) => {
  // Lock keyed on batchId — prevents concurrent double-execution
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${batchId}))`;

  // Check if already executed (inside lock — safe)
  const batch = await tx.importBatch.findUnique({ where: { id: batchId } });
  if (!batch || batch.status !== ImportStatus.VALIDATED) {
    return { alreadyExecuted: true };
  }

  // Phase A: Create participants + engagements atomically
  // ...

  // Mark EXECUTED inside the same transaction
  await tx.importBatch.update({
    where: { id: batchId },
    data: { status: ImportStatus.EXECUTED },
  });
});

// Phase B: Generate USPS payload (outside transaction — non-blocking)
// If Phase B fails, Phase A data is preserved. Log the error, don't rollback.
```

**Add CHECK constraint for engagement integrity:**

```sql
-- Migration: ensure INVITED engagements have no coach assigned
ALTER TABLE "Engagement" ADD CONSTRAINT "engagement_invited_no_coach"
CHECK (
  status != 'INVITED' OR "organizationCoachId" IS NULL
);
```

### Type Definitions (Create Before Phase 2)

```typescript
// src/lib/types/dashboard.ts — shared contracts for API + frontend

import { NeedsAttentionFlagType } from '@prisma/client';

export interface DashboardKpiResponse {
  total: number;
  invited: number;
  coachSelected: number;
  inProgress: number;
  onHold: number;
  completed: number;
  canceled: number;
  needsAttention: number;
  completionRate: number;         // folded in from executive summary
  programBreakdown: ProgramHealthItem[];  // folded in from executive summary
}

export interface ProgramHealthItem {
  programCode: string;
  total: number;
  completed: number;
  completionRate: number;
}

export interface NeedsAttentionEngagement {
  engagementId: string;
  participantEmail: string;
  coachName: string | null;
  cohortCode: string;
  flagType: 'SELECTION_OVERDUE' | 'COACH_STALL';
  daysOverdue: number;
  coachSelectedAt: Date | null;
  lastActivityAt: Date | null;
}

export interface CoachUtilizationItem {
  coachId: string;
  name: string;
  active: boolean;
  pool: string;
  current: number;
  max: number;
  utilizationPct: number;  // Math.round((current / max) * 1000) / 10
}
```

### Default Tab: All Engagements

At launch, the Needs Attention tab will be empty (no cohort has reached Day 15 yet). Default to **All Engagements** tab. Show a count badge on the Needs Attention tab only when count > 0.

```
[ All Engagements (175) ] [ Needs Attention (0) ]
```

### Engagement Row: Table-Only, No Detail View

No drill-down panel in Slice 2. The action button (`MoreHorizontalIcon`) is removed. Operationally useful columns:

| Column | Notes |
|---|---|
| Participant Name + Email | Email on second line (smaller text) |
| Coach Name | "Unassigned" for INVITED status |
| Program | **MLP / ALP / EF / EL** (not TWO_SESSION/FIVE_SESSION) |
| Status | Status badge |
| Sessions | "0/2" or "1/5" — expected 0/n before coaches begin logging in Slice 3 |
| Days Since Activity | Numeric, sortable, highlights red when >14 and non-null |

> **Days Since Activity:** Activity begins at selection in MVP. Show "—" only when `lastActivityAt` is truly null. Session counts remain the source of truth for "no sessions yet."

### Sort: 3 Named Options (Not "Any Column")

Reduce from "sortable by any column" to 3 fixed sort options:
- `days_desc` (default) — Days Since Activity, descending (surfaces most urgent first)
- `status` — Status alphabetical
- `coach` — Coach name alphabetical

API param: `sort=days_desc|status|coach`

### CSV Export: Respects Current Filter State

Export always reflects the **active filter state** (tab + filters). Filename encodes filter context:
- `fc-all-engagements-2026-03-09.csv`
- `fc-needs-attention-2026-03-09.csv`
- `fc-alp-coach-selected-2026-03-09.csv`

### ON_HOLD KPI Card

`ON_HOLD` appears as a **separate KPI card** (not combined with In-Progress).

```
[Total] [Invited] [Coach Selected] [In Progress] [On Hold] [Completed] [Canceled] [Needs Attention]
```

### Coach Roster Edit: Two-Field Modal (No Search)

Edit interaction is a **modal** triggered by the "Edit" button. Two fields: `maxEngagements` + `active` toggle. **No search filter** — 32 coaches need no search.

Add `updatedAt` precondition to PATCH to prevent concurrent overwrites:

```typescript
const result = await prisma.organizationCoach.updateMany({
  where: {
    id: coachId,
    organizationId: scopeOrgId,  // ← USPS scope for MVP reporting
    updatedAt: clientProvidedUpdatedAt,       // ← optimistic lock
  },
  data: { maxEngagements: newMax, active: newActive },
});
if (result.count === 0) {
  return NextResponse.json({ error: 'Conflict — coach was updated by another admin' }, { status: 409 });
}
```

### "Add Coach" Button: Hidden

The existing "Add Coach" button (`PlusIcon`) is **hidden** for March 9. Coach management via seed scripts.

### ALP-135 Retroactive Logging Banner

A dismissible info banner displays on the admin dashboard from March 9–20:

> ALP-135 coaching begins March 12. Session logging portal live March 16. Retroactive session entry is supported. Session counts will show 0 until coaches log their first sessions.

---

## Implementation Phases

### Phase 0: Type Definitions (March 2 — Before Any API Work)

- [ ] `src/lib/types/dashboard.ts` — `DashboardKpiResponse`, `NeedsAttentionEngagement`, `ProgramHealthItem`, `CoachUtilizationItem`
- [ ] Add `src/lib/server/admin-scope.ts` helper for USPS-only MVP admin query scoping
- [ ] Define `lastActivityAt` and session-count semantics in `src/lib/types/dashboard.ts` comments + response contract

**Acceptance:** TypeScript compiles cleanly; admin routes use resolved USPS scope without changing portal session shape.

---

### Phase 1: Auth Middleware Enforcement (March 2–4)
*Prerequisite for everything else. Uses existing custom auth, not Auth.js.*

- [ ] Extend `src/middleware.ts`:
  - Add `/admin/*` protection: read `fc_portal_session`, verify `role === ADMIN`, redirect to `/auth/signin`
  - Add `/api/admin/*` protection: same check, return 401 JSON on API routes
  - Add `/coach/*` + `/api/coach/*` protection (for Slice 3 readiness)
  - Keep existing `/participant/engagement` redirect
- [ ] Fix `src/lib/server/rate-limit.ts`:
  - Replace `x-forwarded-for` parsing with `request.ip` (Vercel-trusted, not spoofable)
  - Verify token split: `if (token.split('.').length !== 2) return null`
- [ ] Add rate limiting to `/api/auth/magic-link/request/route.ts`:
  - IP rate limit (30/hour + optional 10/10min burst guard) via DB-backed `AuditEvent` pattern from `security-guards.ts`
  - Email rate limit (6/hour) via same pattern
  - 60s resend cooldown per email
- [ ] Add security headers to `next.config.ts`:
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `poweredByHeader: false`
- [ ] Fix idle timeout: middleware reads `exp` from portal session, redirects if `now > exp - idle_threshold` (already in `PORTAL_SESSION_TTL_SECONDS` but needs rolling window on each request)

**Acceptance:** Unauthenticated request to `/admin/dashboard` redirects to `/auth/signin`. ADMIN role cookie grants access. COACH role denied on `/admin/*`. Rate limit on magic link request after 6 attempts/email/hour and 30/IP/hour.

---

### Phase 2: Admin Dashboard APIs (March 4–7)
*All queries filter by resolved USPS scope for MVP. All use `cache: 'no-store'`.*

#### Shared Pattern
```typescript
// Every admin API route starts with:
const session = await readPortalSession(request);
if (!session || session.role !== UserRole.ADMIN) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
const scopeOrgId = await resolveAdminOrgScope(session); // USPS-only in MVP
```

#### KPI Endpoint
- [ ] `src/app/api/admin/dashboard/kpis/route.ts`
  - `GET /api/admin/dashboard/kpis?programId=`
  - One `groupBy(['status'])` query for all 8 counts (efficient single query)
  - Separate `count` for `needsAttention` via `getNeedsAttentionCount()`
  - Add `completionRate: COMPLETED / total * 100` (replaces separate executive endpoint)
  - Add `programBreakdown: groupBy(['programId'])` for program health (replaces executive endpoint)
  - **No `unstable_cache`** — use `export const dynamic = 'force-dynamic'`
  - Optional `programId` filter

#### Engagement Table Endpoint
- [ ] `src/app/api/admin/engagements/route.ts`
  - `GET /api/admin/engagements?status=&coachId=&programId=&search=&page=&sort=&tab=`
  - `tab` param: `all` | `needs_attention`
  - `sort` param: `days_desc` | `status` | `coach` (3 named options — not any column)
  - Search: `participant.email` only for MVP (ILIKE '%query%' on email — no trigram index needed at 175 rows)
  - Use `_count: { select: { sessions: true } }` (not `include: { sessions: true }`)
  - Use explicit `select` on all includes (exclude `sourcePayload`, `privateNotes`, audit fields)
  - Paginated (10/page), USPS-scoped in MVP

```typescript
// Efficient engagement list query pattern
const engagements = await prisma.engagement.findMany({
  where: { organizationId: scopeOrgId, ...filters },
  select: {
    id: true,
    status: true,
    lastActivityAt: true,
    _count: { select: { sessions: true } },  // NOT include: { sessions: true }
    participant: { select: { email: true } },
    organizationCoach: {
      select: {
        coachProfile: { select: { displayName: true } },
      },
    },
    cohort: { select: { code: true } },
    program: { select: { code: true } },
  },
  skip: (page - 1) * 10,
  take: 10,
  orderBy: sortOrder,
});
```

#### Coach Roster Endpoints
- [ ] `src/app/api/admin/coaches/route.ts`
  - `GET /api/admin/coaches` — list with computed `currentEngagements` (COACH_SELECTED + IN_PROGRESS + ON_HOLD)
  - `PATCH /api/admin/coaches/:id` — requires `organizationId` in `where` (USPS scope in MVP) + `updatedAt` precondition (optimistic lock)
  - Returns `updatedAt` in response for client to use in next PATCH
  - Org-scoped

**Acceptance:** All endpoints return USPS-scoped data in MVP, no `privateNotes`, correct capacity counting, 409 on coach PATCH conflict.

---

### Phase 3: Needs-Attention Helper (March 5–7)

- [ ] `src/lib/needs-attention.ts`
  - `getNeedsAttentionEngagements(organizationId, programId?)` — returns full rows for table
  - `getNeedsAttentionCount(organizationId, programId?)` — returns count only for KPI
  - Uses `EngagementStatus` and `ProgramTrack` enums (not string literals)
  - Uses `cohort.coachSelectionEnd` (not `coachSelectionDeadline`)
  - Uses `coachSelectedAt + sessions none` for selected-with-no-session flags
  - EF/EL excluded from selection-overdue flags (TWO_SESSION filter only)
- [ ] Wire count into KPI endpoint
- [ ] Wire full rows into engagement table `tab=needs_attention`

**Acceptance:** Needs Attention tab shows correct flags. EF/EL not flagged for selection overdue. Selected-with-zero-session rows are flagged by `coachSelectedAt` age.

---

### Phase 4: CSV Export + Print (March 6–8)

- [ ] `src/app/api/export/route.ts`
  - `GET /api/export?status=&coachId=&programId=&tab=&format=csv`
  - **String response** (not ReadableStream — 175-400 rows fits in memory)
  - CSV sanitization via `sanitizeCsvField()` (tab-prefix formula chars, strip control chars)
  - Columns: `firstName`, `lastName`, `email`, `org`, `programCode`, `cohortCode`, `status`, `coachFirstName`, `coachLastName`, `coachEmail`, `sessionsCompleted`, `totalSessions`, `lastActivityAt`, `daysSinceActivity`
  - `daysSinceActivity`: null when `lastActivityAt` is null (show "—", not 0)
  - Filename: `fc-{tab}-{programCode}-{date}.csv`
  - Auth guard: ADMIN role + `organizationId` scoping
  - `privateNotes` excluded (not in select)
  - `Cache-Control: no-store`, `X-Content-Type-Options: nosniff`
- [ ] `src/app/globals.css` — `@media print` styles
  - Hide nav, sidebar, interactive controls (filter dropdowns, buttons)
  - Add `print:block hidden` div with FC logo + `new Date().toLocaleDateString()` (no @page rules needed)
  - Prevent horizontal overflow on table

**Acceptance:** CSV downloads with correct filter-scoped data. Formula chars are tab-prefixed. `daysSinceActivity` is blank when null. Print hides all nav elements.

---

### Phase 5: Bulk Import (Deferred to Slice 3 — March 10–16)

- [ ] `src/app/api/admin/import/route.ts`
  - `POST /api/admin/import` — validate CSV
  - UTF-8 only (defer Windows-1252 detection — USPS exports UTF-8)
  - CSV injection prevention on all text fields
  - Returns `{ batchToken, rows: ValidatedRow[], errors: RowError[] }`
  - Check for existing completed batch with same `sourceHash` (prevent re-import of identical file)
- [ ] `src/app/api/admin/import/execute/route.ts`
  - `POST /api/admin/import/execute { batchToken }`
  - **Advisory lock idempotency** (not `EXECUTING` enum — that value doesn't exist in schema):
    ```typescript
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${batchId}))`;
      const batch = await tx.importBatch.findUnique({ where: { id: batchId } });
      if (batch?.status !== ImportStatus.VALIDATED) return alreadyProcessed();
      // ... create participants + engagements ...
      await tx.importBatch.update({ where: { id: batchId }, data: { status: ImportStatus.EXECUTED } });
    });
    ```
  - Phase B (USPS payload): outside transaction, non-blocking if it fails
  - Returns `{ created, skipped, alreadyExecuted? }`

> **Locked decision:** Bulk import execution ships March 16. March 9 scope prioritizes dashboard visibility/reporting.

**Acceptance:** Import creates correct participant + engagement records. Same token submitted twice returns idempotent response. Identical CSV re-upload is detected by `sourceHash`.

---

### Phase 6: Wire Admin Frontend (March 7–9)

**Pattern: server components for read-only pages, client component for import.**

- [ ] `src/app/admin/dashboard/page.tsx` — **server component**
  - Fetch KPI data server-side via direct Prisma call or internal fetch
  - Remove hardcoded KPI data
  - Add ON_HOLD KPI card
  - Default tab: All Engagements
  - Needs Attention tab with count badge (hidden when 0)
  - **Remove sparklines** — plain count cards only (no historical series at launch)
  - Add "Days Since Activity" column: show "—" when null, red when >14
  - Add program code column (MLP/ALP/EF/EL)
  - Add session count column ("0/2", "1/5")
  - Remove row action button (`MoreHorizontalIcon`)
  - 3 sort options only (`days_desc`, `status`, `coach`)
  - Export button → `GET /api/export` with current filter state (disable while loading)
  - Add ALP-135 retroactive logging banner (dismissable, March 9–20, stored in `sessionStorage`)
  - `completionRate` + `programBreakdown` inline in dashboard (no separate executive section)
  - Print button → `window.print()`

- [ ] `src/app/admin/coaches/page.tsx` — **server component with client modal**
  - Fetch coach list server-side
  - **Remove search filter** (32 coaches need no search)
  - Replace hardcoded capacity data with real from `OrganizationCoach.maxEngagements`
  - Show pool assignment (MLP_ALP / EF_EL)
  - Edit modal: `maxEngagements` + `active` toggle
    - Pass `updatedAt` from initial fetch to modal → include in PATCH body
    - Handle 409 Conflict response (show "Another admin updated this coach — refresh and try again")
  - Warn if new max < current active count
  - **Hide "Add Coach" button**

- [ ] Keep `src/app/admin/import/page.tsx` out of March 9 release scope (execution deferred to Slice 3)

- [ ] Fix `src/app/admin/dashboard/page.tsx` CSV export:
  - Fix `URL.revokeObjectURL` timing: wrap in `setTimeout(() => URL.revokeObjectURL(url), 100)`
  - (This is already in the existing code — fix regardless of real data wiring)

**Acceptance:** All admin pages show real data. No hardcoded fixtures. Filters work. Export downloads correct file. Coach edit modal handles 409. Import Back button doesn't orphan `isComplete`. Sparklines absent.

---

## Day 1–3 Kickoff Checklist (Execution-Ready)

Use this as the implementation start gate for Slice 2.

### Day 1 (March 2): Foundation + Auth Guards
- [ ] Complete Phase 0 type definitions (`dashboard.ts`, `admin-scope.ts`) and ensure `pnpm typecheck` (or project equivalent) passes cleanly.
- [ ] Implement middleware protection for `/admin/*`, `/api/admin/*`, `/coach/*`, `/api/coach/*` using existing portal session model.
- [ ] Add magic-link request throttles (email/IP/cooldown) with DB-backed pattern from `security-guards.ts`.
- [ ] Add security headers in `next.config.ts`.

**Gate to move forward:** auth redirects, role boundaries, and rate limits verified in local/staging smoke.

### Day 2 (March 3): Core Admin APIs
- [ ] Implement KPI endpoint with USPS scope resolution + completion/program breakdown.
- [ ] Implement engagements endpoint (pagination/sort/filter/search-by-email only).
- [ ] Implement coaches endpoint + PATCH with optimistic locking.
- [ ] Implement needs-attention helper wired to `cohort.coachSelectionEnd` and selection-backed activity semantics.

**Gate to move forward:** API responses match acceptance contract; no `privateNotes`; USPS-only enforcement verified.

### Day 3 (March 4): Export + Frontend Wiring Start
- [ ] Implement CSV export endpoint (filter-aware, injection-safe, null-safe `daysSinceActivity`).
- [ ] Add print CSS behavior for dashboard/report output.
- [ ] Start admin dashboard/coaches page wiring to real APIs (remove hardcoded fixtures, remove sparklines).
- [ ] Validate coach edit modal conflict handling (409 path).

**Gate to move forward:** CSV/export and print behaviors pass checklist scenarios; UI loads from real data.

---

## Acceptance Criteria

### Auth
- [ ] Unauthenticated request to `/admin/dashboard` → redirect to `/auth/signin`
- [ ] COACH role denied access to `/admin/*`
- [ ] ADMIN can sign in with magic link → lands on `/admin/dashboard`
- [ ] Identical response for valid/invalid email (no enumeration)
- [ ] Rate limiting: 6 magic link requests/email/hour, 30/IP/hour (DB-backed) + 60s cooldown
- [ ] IP resolution uses `request.ip` (not spoofable `x-forwarded-for`)
- [ ] Magic link token split validates exactly 2 segments
- [ ] Security headers present: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`

### KPI Dashboard
- [ ] All 8 KPI cards show correct counts
- [ ] Capacity calculation: COACH_SELECTED + IN_PROGRESS + ON_HOLD only
- [ ] `completionRate` and `programBreakdown` included in KPI response
- [ ] No sparklines (plain count cards)
- [ ] MVP scope isolation: admin dashboard returns USPS-only data

### Engagement Table
- [ ] Paginates (10/page), 3 sort options (`days_desc`, `status`, `coach`)
- [ ] Search by participant email (not name — no trigram index needed)
- [ ] Filter by status, coach, program code (MLP/ALP/EF/EL)
- [ ] Default tab: All Engagements
- [ ] Needs Attention tab correct: TWO_SESSION INVITED past Day 15; COACH_SELECTED with zero sessions past threshold; IN_PROGRESS stall by stale `lastActivityAt`
- [ ] EF/EL not flagged for selection-overdue
- [ ] "Days Since Activity": shows "—" when null, red when >14
- [ ] Session count reflects logged sessions only; may remain "0/2" or "0/5" until coaches begin logging in Slice 3
- [ ] No `privateNotes` in any response
- [ ] Row click has no action (button removed)

### CSV Export
- [ ] Filter-aware filename
- [ ] All required columns present; `daysSinceActivity` is blank when `lastActivityAt` is null
- [ ] CSV injection: formula chars tab-prefixed
- [ ] `privateNotes` excluded
- [ ] Auth protected (ADMIN role + org scope)
- [ ] `URL.revokeObjectURL` called after timeout (not synchronously)

### Coach Roster
- [ ] Correct current engagement count per coach
- [ ] Pool assignment displayed (MLP_ALP / EF_EL)
- [ ] Edit modal saves via PATCH with `updatedAt` precondition
- [ ] 409 Conflict handled gracefully in modal
- [ ] Warning shown if new max < current active count
- [ ] "Add Coach" button hidden
- [ ] No search filter

### Bulk Import
- [ ] CSV validates, surfaces row-level errors
- [ ] Advisory lock prevents concurrent double-execution (not EXECUTING enum)
- [ ] Atomic transaction: all-or-nothing
- [ ] Same token twice → idempotent response
- [ ] Same CSV file (same sourceHash) → conflict response at validation step
- [ ] Back button during submit resets `isComplete` state
- [ ] AbortController cancels in-flight fetch on unmount

### Print
- [ ] `window.print()` hides nav, sidebar, interactive controls
- [ ] FC logo + report date visible in print
- [ ] No horizontal overflow on table

---

## Dependencies & Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Phase 0 type work missed → TypeScript errors throughout Phase 2 | High | Do Phase 0 on March 2, day 1. Gate Phase 2 start on TypeScript compiling clean. |
| `coachSelectionDeadline` field used instead of `cohort.coachSelectionEnd` | High | Fixed in this plan. Code review must verify field name before merge. |
| Advisory lock pattern unfamiliar → implement EXECUTING enum instead | Medium | Point implementer to `security-guards.ts:consumeMagicLinkOneTime` — it's already written in the codebase. |
| March 9 deadline leaves minimal QA time | High | Wire frontend last (Phase 6). Test APIs first (Phases 2–5). |
| Kari not informed of March 9 (not March 6) delivery | Medium | **Action item**: Communicate to Kari before March 2 launch email. |
| USPS-only MVP scope not enforced in admin queries | High | Centralize scope resolution in one helper and ban direct unrestricted admin query access in March 9 scope. |
| ALP-135 coaching starts March 12, coach portal not live until March 16 | Low | Accepted. Banner communicates this. Session counts show 0 until March 16 — expected. |

---

## Files Changed

| File | Change | Phase |
|---|---|---|
| `src/lib/types/dashboard.ts` | New: shared type definitions | 0 |
| `src/lib/server/admin-scope.ts` | New: USPS scope resolver for MVP admin APIs | 0 |
| `src/middleware.ts` | Add `/admin/*` + `/coach/*` + `/api/admin/*` + `/api/coach/*` protection | 1 |
| `src/lib/server/rate-limit.ts` | Fix IP resolution to `request.ip`; fix token segment check | 1 |
| `src/app/api/auth/magic-link/request/route.ts` | Add DB-backed IP + email rate limiting + cooldown | 1 |
| `next.config.ts` | Add security headers + `poweredByHeader: false` | 1 |
| `src/app/api/admin/dashboard/kpis/route.ts` | New: KPI + completionRate + programBreakdown | 2 |
| `src/app/api/admin/engagements/route.ts` | New: paginated/filtered engagement table | 2 |
| `src/app/api/admin/coaches/route.ts` | New: coach list + PATCH with org isolation + optimistic lock | 2 |
| `src/lib/needs-attention.ts` | New: dynamic query helper | 3 |
| `src/app/api/export/route.ts` | New: string-response CSV export | 4 |
| `src/app/globals.css` | Add `@media print` styles | 4 |
| `src/app/api/admin/import/route.ts` | New: CSV validation (Slice 3) | 5 |
| `src/app/api/admin/import/execute/route.ts` | New: advisory lock + atomic import (Slice 3) | 5 |
| `src/app/admin/dashboard/page.tsx` | Wire real data; server component; remove sparklines | 6 |
| `src/app/admin/coaches/page.tsx` | Wire real data; remove search; edit modal with 409 handling | 6 |
| `src/app/admin/import/page.tsx` | Import UX wiring deferred to Slice 3 | 5 |
| `src/lib/nav-config.tsx` | Hide "Add Coach" action | 6 |

**No Auth.js packages installed. No schema model additions required for March 9 scope.**

---

## Slice 3 Backlog (March 16)

- [ ] **Coach session logging** — `src/app/api/coach/sessions/route.ts`
- [ ] **Coach portal pages** — `/coach/*`
- [ ] **NeedsAttentionFlag cron** — replace dynamic query with flag table + Vercel cron
  - Note: First cron run must backfill `triggeredAt` from `engagement.lastActivityAt` or `cohort.coachSelectionEnd` (not `now()`) to preserve accurate history
- [ ] **Flag resolution UI** — RESOLVED/IGNORED states for ops
- [ ] **Engagement detail panel** — drill-down view from table
- [ ] **Cohort-level KPI filter**
- [ ] **Coach "Needs Attention" indicator** — badge on coach dashboard

---

## Decision Lock Addendum (2026-02-28)

The following were previously listed as open questions and are now locked for implementation:

| # | Decision | Lock |
|---|---|---|
| 1 | Flag resolution (RESOLVED/IGNORED) in Slice 2 | **No** — defer to Slice 3 cron/flag workflow |
| 2 | Engagement table search behavior in Slice 2 | **Email-only** search for MVP (no name search) |

---

## References

- **Brainstorm**: `docs/brainstorms/2026-02-27-admin-dashboard-scope-brainstorm.md`
- **Master implementation plan**: `docs/plans/2026-02-12-feat-mvp-backend-vertical-slices-plan.md` (see active sections + archive appendices)
- **Schema spec**: `docs/plans/2026-02-25-supabase-schema-spec-and-field-mapping.md`
- **Domain constants**: `src/lib/config.ts` — `NUDGE_THRESHOLDS` (coachAttentionDays=14, opsManualAssignThresholdDays=15)
- **Existing auth**: `src/lib/server/session.ts`, `src/lib/server/security-guards.ts`
- **Existing admin pages**: `src/app/admin/dashboard/`, `src/app/admin/coaches/`, `src/app/admin/import/`
- **Project timeline**: `docs/plans/2026-02-18-fc-project-plan.md`
