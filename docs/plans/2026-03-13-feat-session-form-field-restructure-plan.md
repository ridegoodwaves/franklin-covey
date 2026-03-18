---
title: "feat: Restructure Coach Session Logging Form Fields"
type: feat
status: completed
date: 2026-03-13
deadline: Wednesday March 18 (confirmed by Andrea, 2026-03-16)
brainstorm: docs/brainstorms/2026-03-13-coach-session-form-field-changes-brainstorm.md
---

# feat: Restructure Coach Session Logging Form Fields

## Enhancement Summary

**Deepened on:** 2026-03-16 (round 4)
**Research agents used:** 10 total (5 round 1 + 5 round 2: TypeScript, security, simplicity, data integrity, Likert UI patterns)
**Prior reviews:** 7 (3 round 1 + 3 round 2 + 1 implementation-readiness pass)

### Key Improvements (Round 4)
1. **Action-Commitment Tracking moved into this release** — previously deferred scope is now in-scope per Kari direction.
2. **Engagement level UI switched to vertical radios with optional long descriptions** — supports expanded descriptive copy without cramped segmented controls.
3. **Implementation workflow guardrail added** — create a fresh branch from `main` before coding (post-PR-21 merge hygiene).

### Key Improvements (Round 3)
1. **Forfeited-safe autosave payload** — `toPatchPayload` now explicitly emits `null` for `outcomes`, `nextSteps`, `actionCommitment`, and `engagementLevel` when status is forfeited (prevents autosave 422 loops).
2. **PATCH empty/no-op contract tightened** — reject payloads with zero allowed mutable fields and skip `lastActivityAt` writes for no-op updates.
3. **Migration contingency added** — explicit fallback path if Session rows appear before deploy (guard trip runbook now defined).
4. **Acceptance criteria corrected** — engagement level criterion now matches vertical radio-with-description implementation (not dropdown).
5. **Governance alignment gate added** — explicit stakeholder approval + cross-doc updates required for coach-only → ops-visible notes scope change.
6. **Inline validation expanded** — required-field inline errors now cover `outcomes`, `nextSteps`, and `engagementLevel` (not outcomes only).
7. **DB integrity hardened** — add DB check for `nextSteps` enum and valid non-empty JSON array shape for non-null `outcomes`.

### Key Improvements (Round 2)
1. **Rename `privateNotes` → `notes`** — security reviewer flagged: table is empty so rename is free now, costly later. Eliminates permanent semantic mismatch.
2. **Engagement level UI upgraded from dropdown baseline** — final version now uses vertical radios to support expanded descriptive copy.
3. **Add CHECK constraint on `engagementLevel`** — data integrity reviewer: `CHECK (>= 1 AND <= 5)` is free on empty table and prevents bypass of app validation.
4. **Wrap migration in explicit `BEGIN`/`COMMIT`** — `prisma migrate deploy` (production) does not auto-wrap in transaction.
5. **Restructure PATCH body parsing** — use `Record<string, unknown>` instead of unsafe filter-and-cast pattern.
6. **Move sort into `serializeOutcomes`** — single canonicalization point instead of UI-side.

### Key Improvements (Round 1)
1. **Auto-save snapshot fix:** `useAutoSave` race condition — must snapshot before async call
2. **Checkbox accessibility:** `fieldset`/`legend`, `aria-invalid` per checkbox, `role="alert"` error, focus-first on error (WCAG 2.1 AA)
3. **Migration workflow:** `prisma migrate dev --create-only` then hand-edit SQL
4. **Sort outcomes before auto-save:** Prevents spurious saves on toggle order difference

### Considerations
- `null` vs `"[]"` convention: use `null` for "never set", never store empty string `""`
- Error state on checkboxes: `aria-invalid` on each checkbox (not fieldset — inconsistent SR support)
- Build soft warnings for edge cases 1-2 (decision log item #1)
- Use separate `mapSessionRowForAdmin` mapper when admin session views are built (access control boundary)
- PATCH must reject unknown keys and must also reject empty/no-op payloads
- For forfeited status, UI payload normalization to null must happen client-side before autosave submit

---

## Overview

Client-requested changes to the coach session logging form: outcomes becomes multi-select with new values, duration is replaced by next steps, and private notes become visible to the ops team. Zero sessions exist in production, making this the ideal time for schema changes.

## Client Confirmation (Andrea Sherman, 2026-03-16)

- Outcome values: **Confirmed** — "Looks good"
- Next steps values: **Confirmed** — "Yes"
- Participant engagement level: **Include in this build** — "as long as that does not delay Wednesday's build"
- Action-commitment tracking: **Include in this build** per Kari request (2026-03-16 follow-up)

## Decision Log (Resolved 2026-03-16)

1. **Edge cases 1-2 behavior:** Option **B** selected — add soft warning for non-final-session "Engagement concluded" / "Program concluded".
2. **Non-empty migration concern:** Not expected (no Session data in staging/production for these fields). Keep guard + fallback runbook as safety only.
3. **Notes visibility approval:** **Kari sign-off received** — notes may be visible to admins and coaches, not participants.
4. **PATCH semantics:** Option **A** selected — reject empty/no-op payloads; update activity timestamp only on real field changes.
5. **DB strictness:** Option **A** selected — keep DB-level constraints for `engagementLevel`, `nextSteps`, `actionCommitment`, and non-null `outcomes` shape.
6. **Deferred scope pull-in:** Include `actionCommitment` in this release.
7. **Engagement level copy treatment:** Use vertical radio options with optional descriptions (show description for 1/3/5; 2/4 label-only by design).
8. **Engagement level long-form copy finalized:** Kari-provided wording for levels 1, 3, and 5 is locked in.

## Governance Gate (Required Before Merge)

Because this plan changes notes visibility from coach-only to ops-visible, these conditions apply:

1. **Stakeholder approval:** Complete — Kari approved admin visibility with participant exclusion.
2. **Visibility boundary:** Must remain strict — notes visible to coaches + admin/ops only, never participant-facing APIs.
3. **Documentation updates required in same PR:** Remove stale coach-only language (`CLAUDE.md`, architecture/project plan notes, and handoff docs that define visibility boundaries).

## Priority Changes (This Plan)

1. **Outcomes** → multi-select with 5 new values (replaces 6 old single-select values)
2. **Next Steps** → new single-select field with 3 values (replaces duration)
3. **Notes visibility** → label change + expose to ops in admin API (still visible to coaches; not participants)
4. **Participant Engagement Level** → required single-select Likert 1-5 with expanded descriptive labels
5. **Action-Commitment Tracking** → new single-select field with 5 values (promoted from deferred per Kari)

---

## Technical Approach

### Implementation Workflow (Before Coding)

1. Checkout latest `main`.
2. Create a fresh feature branch for this plan (do not reuse merged branch from PR #21).
3. Implement all plan changes on that branch only.
4. Open a new PR containing only this plan's scope.

### Phase 1: Schema Migration + Config Constants

**Estimated effort:** 40 min

#### Migration: `drop_and_add_session_fields`

Since the Session table is empty, use drop + add (safest approach — no data to preserve):

```sql
BEGIN;

-- Safety guard: abort if sessions already exist
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM "Session") > 0 THEN
    RAISE EXCEPTION 'Session table is not empty — aborting destructive migration';
  END IF;
END $$;

-- Drop old columns
ALTER TABLE "Session" DROP COLUMN IF EXISTS "outcome";
ALTER TABLE "Session" DROP COLUMN IF EXISTS "durationMinutes";

-- Rename privateNotes → notes (free on empty table; costly later)
ALTER TABLE "Session" RENAME COLUMN "privateNotes" TO "notes";

-- Add new columns
ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "outcomes" TEXT;
ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "nextSteps" TEXT;
ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "engagementLevel" INTEGER;
ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "actionCommitment" TEXT;

-- Database-level constraint for engagement level range
ALTER TABLE "Session" ADD CONSTRAINT "Session_engagementLevel_check"
  CHECK ("engagementLevel" IS NULL OR ("engagementLevel" >= 1 AND "engagementLevel" <= 5));

-- Database-level constraint for nextSteps enum values
ALTER TABLE "Session" ADD CONSTRAINT "Session_nextSteps_check"
  CHECK (
    "nextSteps" IS NULL OR
    "nextSteps" IN (
      'Next session scheduled',
      'Next session not scheduled',
      'Program concluded, no next session'
    )
  );

-- Database-level constraint for actionCommitment enum values
ALTER TABLE "Session" ADD CONSTRAINT "Session_actionCommitment_check"
  CHECK (
    "actionCommitment" IS NULL OR
    "actionCommitment" IN (
      'Last session''s action(s) completed',
      'Last session''s action(s) partially completed',
      'Last session''s action(s) not completed',
      'No actions were committed to in the last session',
      'Not applicable (first session / no prior session)'
    )
  );

-- Database-level constraint for outcomes JSON shape (when present)
ALTER TABLE "Session" ADD CONSTRAINT "Session_outcomes_json_check"
  CHECK (
    "outcomes" IS NULL OR
    (
      jsonb_typeof("outcomes"::jsonb) = 'array' AND
      jsonb_array_length("outcomes"::jsonb) > 0
    )
  );

COMMIT;
```

**Migration workflow** (from Prisma docs research):
1. Update `schema.prisma` first
2. Run `npx prisma migrate dev --create-only --name session_field_restructure` — creates draft migration without applying
3. **Hand-edit** the generated `migration.sql` — replace Prisma's auto-generated DROP+ADD with the guarded SQL above
4. Run `npx prisma migrate dev` to apply
5. Generate a reverse migration proactively: `npx prisma migrate diff --from-url "$DATABASE_URL" --to-migrations ./prisma/migrations --script > backward.sql`

**Pre-deploy guard check (staging + production):**
- Run `SELECT COUNT(*) FROM "Session";` immediately before deploy.
- If count is `0`: proceed with the destructive migration in this plan.
- If count is `> 0`: do **not** run this migration. Switch to the non-destructive fallback migration path below.

**Non-destructive fallback path (if Session is non-empty at deploy time):**
1. Add new columns (`outcomes`, `nextSteps`, `engagementLevel`, `actionCommitment`, `notes`) without dropping old columns.
2. Backfill with deterministic transforms in SQL.
3. Deploy app reading new columns with temporary backward-compat parser.
4. Validate row counts + nullability + sample rows.
5. In a follow-up migration, drop `outcome`, `durationMinutes`, `privateNotes` after verification.

**Fallback mapping (only if guard fails unexpectedly and Session is non-empty):**
- Existing singular `outcome` maps to `[outcome]` JSON array.
- Existing `durationMinutes` maps to `nextSteps = null`, with ops backfill if needed.

**Prisma schema changes** (`prisma/schema.prisma`):

```prisma
model Session {
  // ... existing fields ...
  outcomes        String?   // JSON array: '["Action plan created","Resources provided"]'
  nextSteps       String?   // Single value from NEXT_STEPS_OPTIONS
  engagementLevel Int?      // Likert 1-5: participant engagement level. DB CHECK constraint enforces range.
  actionCommitment String?  // Single value from ACTION_COMMITMENT_OPTIONS
  notes           String?   // Visible to ops team. Renamed from privateNotes (empty table migration).
  // Remove: outcome, durationMinutes, privateNotes (renamed to notes)
}
```

#### Config constants (`src/lib/config.ts`):

**Remove:**
- `SESSION_OUTCOMES` (old 6 values)
- `DURATION_OPTIONS` ([15, 30, 45, 60, 90])
- `SessionOutcome` type
- `DurationOption` type

**Add:**

```typescript
export const SESSION_OUTCOMES = [
  "Action plan created",
  "Action plan updated",
  "Resources provided",
  "Participant committed to an action",
  "Engagement concluded / final session",
] as const;

export type SessionOutcome = (typeof SESSION_OUTCOMES)[number];

export const NEXT_STEPS_OPTIONS = [
  "Next session scheduled",
  "Next session not scheduled",
  "Program concluded, no next session",
] as const;

export type NextStepsOption = (typeof NEXT_STEPS_OPTIONS)[number];

export const ENGAGEMENT_LEVEL_OPTIONS = [
  {
    value: 1,
    label: "1 = Disengaged",
    description: "Unprepared, no examples of behavioral change, did not engage in meaningful conversation.",
  },
  { value: 2, label: "2 = Partially Engaged" }, // no description by design
  {
    value: 3,
    label: "3 = Moderately Engaged",
    description: "Prepared, some examples of behavioral change, open conversation.",
  },
  { value: 4, label: "4 = Highly Engaged" }, // no description by design
  {
    value: 5,
    label: "5 = Exceptionally Engaged",
    description: "Well prepared, shared clear examples of behavioral change, engaged in meaningful conversation.",
  },
] as const;

export type EngagementLevel = 1 | 2 | 3 | 4 | 5;

export const ACTION_COMMITMENT_OPTIONS = [
  "Last session's action(s) completed",
  "Last session's action(s) partially completed",
  "Last session's action(s) not completed",
  "No actions were committed to in the last session",
  "Not applicable (first session / no prior session)",
] as const;

export type ActionCommitmentOption = (typeof ACTION_COMMITMENT_OPTIONS)[number];
```

---

### Phase 2: Validation Layer

**Estimated effort:** 1 hour

**File:** `src/lib/validation/session-validation.ts`

#### `validateSessionCreateInput` changes:

For **COMPLETED** sessions:
- `outcomes`: Required. Must be a non-empty `string[]`. Each element must be in `SESSION_OUTCOMES`. No duplicates: `if (new Set(outcomes).size !== outcomes.length)` → reject. Stored via `serializeOutcomes(array)`.
- `nextSteps`: Required. Must be a string in `NEXT_STEPS_OPTIONS`.
- `engagementLevel`: Required. Must be an integer 1-5.
- `actionCommitment`: Required. Must be a string in `ACTION_COMMITMENT_OPTIONS`.
- Remove: `durationMinutes` validation entirely.

For **FORFEITED** sessions:
- `outcomes`: Forced to `null` in output (same pattern as current `outcome`).
- `nextSteps`: Forced to `null` in output (same pattern as current `durationMinutes`).
- `engagementLevel`: Forced to `null` in output.
- `actionCommitment`: Forced to `null` in output.

#### `validateSessionPatchInput` changes:

For **COMPLETED** sessions:
- If `outcomes` is provided: must be non-empty array, each element in `SESSION_OUTCOMES`, no duplicates (`Set` size check).
- If `nextSteps` is provided: must be in `NEXT_STEPS_OPTIONS`, cannot be empty string.
- If `engagementLevel` is provided: must be integer 1-5.
- If `actionCommitment` is provided: must be in `ACTION_COMMITMENT_OPTIONS`, cannot be empty string.
- Remove: `durationMinutes` handling.

For **FORFEITED** sessions:
- If `outcomes` is provided: must be `null`.
- If `nextSteps` is provided: must be `null`.
- If `engagementLevel` is provided: must be `null`.
- If `actionCommitment` is provided: must be `null`.

#### `ensureCompletedInvariant` update (in PATCH route):

```typescript
// Old:
if (!occurredAt || !topic || !outcome || durationMinutes === null) { ... }

// New (use deserializeOutcomes from _shared.ts — never raw JSON.parse):
const parsedOutcomes = deserializeOutcomes(outcomes);
if (!occurredAt || !topic || !parsedOutcomes || parsedOutcomes.length === 0 || !nextSteps || engagementLevel === null || !actionCommitment) { ... }
```

---

### Phase 3: API Routes + Types

**Estimated effort:** 1.25 hours

#### Types (`src/lib/types/coach.ts`):

```typescript
interface CoachSessionRow {
  id: string;
  sessionNumber: number;
  status: SessionStatus;
  occurredAt: string | null;
  topic: string | null;
  outcomes: string[] | null;     // was: outcome: string | null
  nextSteps: string | null;      // was: durationMinutes: number | null
  engagementLevel: number | null; // Likert 1-5, new field
  actionCommitment: string | null; // Single-select action follow-through signal
  notes: string | null;        // renamed from privateNotes
  createdAt: string;
  updatedAt: string;
}
```

#### Shared mapper + serialize/deserialize pair (`src/app/api/coach/_shared.ts`):

Add a single serialize/deserialize boundary for the JSON-in-String pattern. Use these everywhere — no scattered `JSON.parse`/`JSON.stringify`:

```typescript
export function serializeOutcomes(outcomes: string[]): string {
  if (outcomes.length === 0) {
    throw new Error("serializeOutcomes called with empty array — use null instead");
  }
  return JSON.stringify([...outcomes].sort());
}

export function deserializeOutcomes(raw: string | null): string[] | null {
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    if (!parsed.every((item): item is string => typeof item === "string")) {
      console.error("[deserializeOutcomes] non-string element in array", raw);
      return null;
    }
    return parsed;
  } catch (error) {
    console.error("[deserializeOutcomes] failed to parse", raw, error);
    return null;
  }
}
```

Update `mapSessionRow`:

```typescript
function mapSessionRow(session: Session): CoachSessionRow {
  return {
    // ... existing fields ...
    outcomes: deserializeOutcomes(session.outcomes),
    nextSteps: session.nextSteps,
    actionCommitment: session.actionCommitment,
    notes: session.notes,
    // Remove: outcome, durationMinutes
  };
}
```

#### POST route (`src/app/api/coach/sessions/route.ts`):

Update `CreateSessionBody`:
```typescript
interface CreateSessionBody {
  engagementId: string;
  status: SessionStatus;
  occurredAt: string | null;
  topic: string | null;
  outcomes: string[] | null;      // was: outcome: string | null
  nextSteps: string | null;       // was: durationMinutes: number | null
  engagementLevel: number | null; // Likert 1-5, new field
  actionCommitment: string | null; // new field
  notes: string | null;        // renamed from privateNotes
}
```

In `parseCreateSessionBody`: validate `outcomes` is an array (or null), validate `nextSteps` is a string (or null), validate `actionCommitment` is a string (or null). Remove `durationMinutes` parsing.

In the Prisma `create` call: store outcomes as `serializeOutcomes(validatedOutcomes)` (from `_shared.ts`).

#### PATCH route (`src/app/api/coach/sessions/[id]/route.ts`):

**Do NOT widen `JsonScalar` or use filter-and-cast.** Instead, change `parsePatchBody` to accept `Record<string, unknown>` and handle `outcomes` as a branch inside it:

```typescript
// Change parsePatchBody parameter type from Record<string, JsonScalar> to Record<string, unknown>
// Add outcomes branch inside parsePatchBody:
if (body.outcomes !== undefined) {
  if (body.outcomes === null) {
    parsed.outcomes = null;
  } else if (
    Array.isArray(body.outcomes) &&
    body.outcomes.every((v): v is string => typeof v === "string")
  ) {
    parsed.outcomes = body.outcomes;
  } else {
    errors.push("outcomes must be a string array or null");
  }
}

// Add PATCH key allowlist — reject unknown fields with 422:
const ALLOWED_PATCH_KEYS = new Set([
  "occurredAt", "topic", "outcomes", "nextSteps", "engagementLevel", "actionCommitment", "notes",
]);
const unknownKeys = Object.keys(body).filter((k) => !ALLOWED_PATCH_KEYS.has(k));
if (unknownKeys.length > 0) {
  errors.push(`Unknown fields: ${unknownKeys.join(", ")}`);
}

// Reject empty/no-op payloads up-front:
const providedAllowedKeys = Object.keys(body).filter((k) => ALLOWED_PATCH_KEYS.has(k));
if (providedAllowedKeys.length === 0) {
  errors.push("At least one mutable field is required");
}
```

When building the Prisma update data, serialize outcomes: `outcomes: serializeOutcomes(patchedOutcomes)` (from `_shared.ts`).

Update `ensureCompletedInvariant` to check `outcomes` array length instead of string truthiness.

Only update `Engagement.lastActivityAt` if at least one session field was actually updated (avoid mutating activity metadata for rejected/no-op PATCH calls).

#### GET route (`src/app/api/coach/engagements/[id]/sessions/route.ts`):

No logic changes — `mapSessionRow` handles the JSON parse.

#### Client API (`src/lib/coach-api-client.ts`):

Update `CreateCoachSessionInput` and `UpdateCoachSessionInput`:
- `outcome: string | null` → `outcomes: string[] | null`
- `durationMinutes: number | null` → `nextSteps: string | null`
- Add: `engagementLevel: number | null` (new field)
- Add: `actionCommitment: string | null` (new field)

---

### Phase 4: UI Changes

**Estimated effort:** 1.5 hours

**File:** `src/app/coach/engagements/[id]/page.tsx`

#### Form state:

```typescript
// Old:
interface SessionFormState {
  outcome: string;
  durationMinutes: number | null;
  // ...
}

// New:
interface SessionFormState {
  outcomes: string[];           // empty array = no selection
  nextSteps: string;            // empty string = no selection
  engagementLevel: number | null; // null = no selection
  actionCommitment: string;     // empty string = no selection
  // ...
}
```

Update `defaultFormState()`: `outcomes: []`, `nextSteps: ""`, `engagementLevel: null`, `actionCommitment: ""`.

#### Outcomes field — replace `<select>` with checkbox group:

5 options is ideal for a visible checkbox group (no dropdown complexity). Each checkbox maps to one `SESSION_OUTCOMES` value. Checked state drives the `outcomes` array.

**Accessibility requirements (WCAG 2.1 AA):**
- Use native `<fieldset>` + `<legend>` with CSS resets (border:0, padding:0, margin:0, minWidth:0)
- State the constraint in the legend: "(required, select at least 1)"
- Set `aria-invalid={true}` on **each checkbox** (not fieldset) when validation fails
- Link each checkbox to the error via `aria-describedby`
- Error message uses `role="alert"` with conditional rendering (fires on DOM insertion)
- On submit error: focus the first checkbox so screen reader announces error in context
- Clear error state as soon as any checkbox is toggled

```tsx
<fieldset style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
  <legend className="text-sm font-medium text-fc-950">
    Session Outcomes{" "}
    <span className="font-normal text-muted-foreground">(required, select at least 1)</span>
  </legend>
  <div className="mt-2 space-y-2">
    {SESSION_OUTCOMES.map((value, index) => (
      <label key={value} className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          ref={index === 0 ? firstOutcomeRef : undefined}
          type="checkbox"
          checked={form.outcomes.includes(value)}
          onChange={(e) => {
            setForm((prev) => ({
              ...prev,
              outcomes: e.target.checked
                ? [...prev.outcomes, value]
                : prev.outcomes.filter((v) => v !== value),
            }));
            if (outcomesError) setOutcomesError(false);
          }}
          aria-invalid={outcomesError || undefined}
          aria-describedby={outcomesError ? "outcomes-error" : undefined}
        />
        {value}
      </label>
    ))}
  </div>
  {outcomesError && (
    <p id="outcomes-error" role="alert" className="mt-2 text-sm text-red-600">
      Please select at least one outcome.
    </p>
  )}
</fieldset>
```

Hidden when status is forfeited (same as current outcome dropdown).

#### Next Steps field — replace duration `<select>`:

```tsx
<label className="text-sm font-medium text-fc-950">Next Steps</label>
<select
  value={form.nextSteps}
  onChange={(e) => setForm((prev) => ({ ...prev, nextSteps: e.target.value }))}
>
  <option value="">Select next steps...</option>
  {NEXT_STEPS_OPTIONS.map((value) => (
    <option key={value} value={value}>{value}</option>
  ))}
</select>
```

Hidden when status is forfeited. Occupies the same position Duration held (after outcomes, before engagement level).

#### Action-Commitment Tracking — new single-select:

```tsx
<label className="text-sm font-medium text-fc-950">Action-Commitment Tracking</label>
<select
  value={form.actionCommitment}
  onChange={(e) => setForm((prev) => ({ ...prev, actionCommitment: e.target.value }))}
>
  <option value="">Select action-commitment status...</option>
  {ACTION_COMMITMENT_OPTIONS.map((value) => (
    <option key={value} value={value}>{value}</option>
  ))}
</select>
```

Hidden when status is forfeited. Positioned after next steps, before engagement level.

#### Participant Engagement Level — vertical radio list with optional descriptions (Likert 1-5):

**UX rationale:** Expanded descriptive copy does not fit segmented controls. Vertical radio rows preserve readability, scanning speed, and accessibility for longer labels/subtext.

```tsx
<fieldset style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
  <legend className="text-sm font-medium text-fc-950">Participant Engagement Level</legend>
  <div className="mt-2 space-y-2">
    {ENGAGEMENT_LEVEL_OPTIONS.map(({ value, label, description }) => (
      <label key={value} className="flex items-start gap-3 rounded-md border border-fc-200 p-3">
        <input
          type="radio"
          name="engagementLevel"
          value={value}
          checked={form.engagementLevel === value}
          onChange={() => setForm((prev) => ({ ...prev, engagementLevel: value }))}
          className="mt-1"
        />
        <span className="block">
          <span className="block text-sm font-medium text-fc-900">{label}</span>
          {description ? (
            <span className="mt-1 block text-xs text-muted-foreground">{description}</span>
          ) : null}
        </span>
      </label>
    ))}
  </div>
</fieldset>
```

**Accessibility:** Native radio inputs preserve keyboard and screen-reader behavior. Optional descriptions are plain text and announced naturally with each option.

Hidden when status is forfeited. Positioned after action-commitment, before notes.

#### Notes label change:

```tsx
// Old:
<label>Private Notes</label>

// New:
<label>Notes</label>
<p className="text-xs text-muted-foreground">Visible to program administrators</p>
```

#### Required-field inline validation (completed sessions):

To prevent opaque autosave failures, render inline errors (not only backend errors) for all required completed-session fields:
- outcomes: "At least one outcome is required."
- nextSteps: "Next steps is required."
- actionCommitment: "Action-commitment tracking is required."
- engagementLevel: "Participant engagement level is required."

Clear each error as soon as the corresponding field becomes valid.

#### Guard updates:

- `canSubmit`: Change `form.outcome.length > 0` → `form.outcomes.length > 0`. Change `form.durationMinutes !== null` → `form.nextSteps.length > 0`. Add `form.actionCommitment.length > 0` and `form.engagementLevel !== null`.
- `toPatchPayload`: status-aware normalization.
  - If status is `COMPLETED`: send `outcomes` array, `nextSteps`, `actionCommitment`, and `engagementLevel`.
  - If status is forfeited: send `outcomes: null`, `nextSteps: null`, `actionCommitment: null`, `engagementLevel: null` (never `[]` or `""`).
  - Rename `privateNotes` → `notes`.
- Status change to forfeited: clear `outcomes: []`, `nextSteps: ""`, `actionCommitment: ""`, and `engagementLevel: null` (same pattern as current clearing).
- Populate form from `selectedSession`: parse `outcomes` array, map `nextSteps` and `actionCommitment`.

```typescript
function toPatchPayload(form: SessionFormState): UpdateCoachSessionInput {
  const isForfeited = hasForfeitStatus(form.status);
  return {
    occurredAt: form.occurredAt ? new Date(form.occurredAt).toISOString() : null,
    topic: form.topic.trim() || null,
    outcomes: isForfeited ? null : form.outcomes,
    nextSteps: isForfeited ? null : (form.nextSteps || null),
    actionCommitment: isForfeited ? null : (form.actionCommitment || null),
    engagementLevel: isForfeited ? null : form.engagementLevel,
    notes: form.notes.trim() || null,
  };
}
```

#### Auto-save hook fix (pre-existing bug, higher risk with arrays):

**File:** `src/hooks/use-auto-save.ts`

The `executeSave` function has a correctness gap: `dataRef.current` can change between the `await onSave(dataRef.current)` call and the `lastSavedSerializedRef.current = JSON.stringify(dataRef.current)` update. With scalar fields this was unlikely to cause issues, but rapid checkbox toggling widens the window.

**Fix:** Snapshot before async call, re-queue if data diverged during save:

```typescript
const executeSave = useCallback(async () => {
  if (!enabled || isSavingRef.current) return;
  const snapshot = dataRef.current;
  const snapshotSerialized = JSON.stringify(snapshot);
  if (snapshotSerialized === lastSavedSerializedRef.current) return;

  isSavingRef.current = true;
  setIsSaving(true);
  try {
    await onSave(snapshot);  // send snapshot, not dataRef.current
    lastSavedSerializedRef.current = snapshotSerialized;
    // Re-queue if data changed during save
    if (JSON.stringify(dataRef.current) !== snapshotSerialized) {
      hasPendingChangesRef.current = true;
      timerRef.current = window.setTimeout(() => void executeSave(), debounceMs);
    }
  } catch { /* existing error handling */ }
  finally { isSavingRef.current = false; setIsSaving(false); }
}, [enabled, onSave, debounceMs]);
```

---

### Phase 5: Tests

**Estimated effort:** 1 hour

#### Files to update:

| File | Changes |
|---|---|
| `src/app/api/coach/sessions/route.test.ts` | Update factory data: `outcome` → `outcomes` (array), `durationMinutes` → `nextSteps` (string), add `actionCommitment` (string). Update assertions. |
| `src/app/api/coach/sessions/[id]/route.test.ts` | Same field renames + `actionCommitment`. Update `ensureCompletedInvariant` test. Update PATCH body format for array. |
| `src/app/api/coach/engagements/[id]/sessions/route.test.ts` | Update response shape assertions. |
| `src/lib/validation/session-validation.ts` | If test file exists: update for array outcomes validation, nextSteps validation, remove duration tests. |

#### New test cases to add:

| Test | Assertion |
|---|---|
| POST with outcomes as empty array | 422 validation error |
| POST with outcomes containing duplicate | 422 validation error |
| POST with outcomes containing invalid value | 422 validation error |
| POST with valid outcomes array + nextSteps | 201 created |
| POST with missing actionCommitment on completed session | 422 validation error |
| POST with invalid actionCommitment value | 422 validation error |
| PATCH with outcomes array on completed session | 200 updated |
| PATCH with outcomes on forfeited session | 422 (must be null) |
| PATCH with actionCommitment on forfeited session | 422 (must be null) |
| PATCH with no allowed mutable fields | 422 validation error |
| PATCH with only unknown keys | 422 validation error |
| PATCH forfeited session with `outcomes: []` or `nextSteps: ""` | 422 validation error |
| PATCH forfeited session with `outcomes: null`, `nextSteps: null`, `engagementLevel: null` | 200 updated |
| GET returns outcomes as parsed array (not JSON string) | Response `outcomes` is `string[]` |

---

## Acceptance Criteria

### Functional

- [x] Outcomes field renders as checkbox group with 5 new values (multi-select)
- [x] At least 1 outcome required for COMPLETED sessions
- [x] Outcomes forced to null for forfeited sessions
- [x] Duration field removed entirely from form and API
- [x] Next Steps field renders as single-select dropdown with 3 values
- [x] Next Steps required for COMPLETED sessions
- [x] Next Steps forced to null for forfeited sessions
- [x] Action-Commitment Tracking field renders as single-select dropdown with 5 values
- [x] Action-Commitment Tracking required for COMPLETED sessions
- [x] Action-Commitment Tracking forced to null for forfeited sessions
- [x] Participant Engagement Level renders as vertical radio options with expanded descriptions where provided
- [x] Engagement Level required for COMPLETED sessions
- [x] Engagement Level forced to null for forfeited sessions
- [x] Notes label changed to "Notes" with "Visible to program administrators" hint
- [x] Notes remain visible to coaches + admins only and are not exposed to participants
- [x] Auto-save works correctly with multi-select outcomes (sends full array for completed, sends nulls for forfeited)
- [x] Inline validation is shown for missing outcomes, nextSteps, and engagementLevel on completed sessions
- [x] Session history edit correctly populates outcomes checkboxes and nextSteps dropdown

### Data Integrity

- [x] Migration runs cleanly on empty Session table (staging + production)
- [x] Outcomes stored as JSON array string in DB, parsed to `string[]` in API response
- [x] Duplicate outcomes rejected at validation layer
- [x] Invalid outcome values rejected at validation layer
- [x] Invalid nextSteps values rejected at validation layer
- [x] Invalid actionCommitment values rejected at validation layer
- [x] DB check constraint rejects out-of-range `engagementLevel`
- [x] DB check constraint rejects invalid `nextSteps` enum values
- [x] DB check constraint rejects invalid `actionCommitment` enum values
- [x] DB check constraint rejects invalid/non-array/empty-array `outcomes` payloads when non-null
- [x] Non-empty table contingency path is documented and tested in staging runbook

### Regression

- [x] Forfeited session creation still works (topic, outcomes, nextSteps, actionCommitment, engagementLevel all null)
- [x] Engagement status transitions still fire correctly (first session → IN_PROGRESS, final → COMPLETED)
- [x] Optimistic concurrency on PATCH still works (updatedAt check)
- [x] Auto-save debounce still works (5-second delay)
- [x] All existing tests updated and passing
- [x] Build succeeds (`npm run build`)

---

## Files Changed

| # | File | Change Type |
|---|---|---|
| 1 | `prisma/schema.prisma` | Drop outcome + durationMinutes, add outcomes + nextSteps + engagementLevel + actionCommitment |
| 2 | `prisma/migrations/YYYYMMDD_session_field_restructure/migration.sql` | DROP + ADD columns + CHECK constraints |
| 3 | `src/lib/config.ts` | New SESSION_OUTCOMES, NEXT_STEPS_OPTIONS, ENGAGEMENT_LEVEL_OPTIONS (expanded), ACTION_COMMITMENT_OPTIONS; remove DURATION_OPTIONS |
| 4 | `src/lib/validation/session-validation.ts` | Array outcomes validation, nextSteps validation, engagementLevel validation, actionCommitment validation, remove duration |
| 5 | `src/lib/types/coach.ts` | CoachSessionRow field renames + type changes + actionCommitment |
| 6 | `src/app/api/coach/_shared.ts` | mapSessionRow + serializeOutcomes/deserializeOutcomes pair |
| 7 | `src/app/api/coach/sessions/route.ts` | CreateSessionBody + parsing for outcomes + nextSteps + engagementLevel + actionCommitment |
| 8 | `src/app/api/coach/sessions/[id]/route.ts` | parsePatchBody allowlist expansion + ensureCompletedInvariant updates |
| 9 | `src/lib/coach-api-client.ts` | Input/response type updates including actionCommitment |
| 10 | `src/hooks/use-auto-save.ts` | Snapshot fix: capture data before async onSave, re-queue on divergence |
| 11 | `src/app/coach/engagements/[id]/page.tsx` | Checkbox group, nextSteps dropdown, actionCommitment dropdown, vertical engagement radios with descriptions, notes label, form state |
| 12 | `src/app/api/coach/sessions/route.test.ts` | Field renames + new test cases |
| 13 | `src/app/api/coach/sessions/[id]/route.test.ts` | Field renames + invariant tests |
| 14 | `src/app/api/coach/engagements/[id]/sessions/route.test.ts` | Response shape assertions |

---

## Estimated Total Effort

| Phase | Time |
|---|---|
| 1. Schema migration + config | 40 min |
| 2. Validation layer | 1 hour |
| 3. API routes + types | 1.25 hours |
| 4. UI changes + auto-save hook fix | 1.5 hours |
| 5. Tests | 1 hour |
| **Total** | **~5.25 hours** |

---

## Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Migration runs on non-empty table | Medium | Empty-table guard + pre-deploy `COUNT(*)` check + explicit non-destructive fallback path |
| Auto-save sends stale outcomes array | Low | Debounce sends full form state (replace semantics) |
| Forfeited autosave emits invalid non-null values | Medium | Status-aware `toPatchPayload` null normalization for forfeited sessions |
| PATCH no-op mutates engagement activity metadata | Medium | Reject empty payload and only write `lastActivityAt` when session fields change |
| Stale references to old field names | Medium | Pre-merge grep checklist (see below) |
| Engagement-level long descriptions create cramped UI | Medium | Use vertical radio rows with optional description text (no segmented control) |
| Action-commitment option text drift across layers | Low | Single source constant (`ACTION_COMMITMENT_OPTIONS`) used by validation + API + UI |
| Visibility contract drift (coach-only docs vs ops-visible implementation) | Medium | Governance gate + same-PR doc updates + stakeholder sign-off |

**Pre-merge grep checklist** — search entire codebase for these before merging:
- `outcome` (singular — distinguish from `outcomes`)
- `durationMinutes`
- `DURATION_OPTIONS`
- `DurationOption`
- `SESSION_OUTCOMES` (verify all references use new values)
- `SessionOutcome` (verify type matches new values)
- `actionCommitment` (verify field is wired through schema, validation, API, and UI)
- `ACTION_COMMITMENT_OPTIONS` (verify all references use same 5 values)
- `privateNotes` (all references must be renamed to `notes`)
- `sanitizePrivateNotes` (rename to `sanitizeNotes`)

---

## Edge Cases (Flag to Client)

### 1. "Engagement concluded" selected on a non-final session

A coach logging session 2 of 5 could check "Engagement concluded / final session." This is semantically valid (early termination happens), but the system will not change the engagement status — that only transitions to COMPLETED when `sessionNumber === totalSessions`. This creates a mismatch: the coach says "we're done" but the system shows 2/5 sessions completed and the engagement stays IN_PROGRESS.

**Options:**
- **A) No enforcement (current plan):** Trust the coach. Ops can see the outcome and handle manually.
- **B) Soft warning:** Show a UI notice: "This is session 2 of 5. Selecting 'Engagement concluded' will not automatically close the engagement. Contact your program administrator if this engagement should end early."
- **C) Hard block:** Prevent this outcome on non-final sessions.

**Decision:** Option B selected — implement soft warning (no hard block).

### 2. "Program concluded, no next session" on a non-final session

Same issue as above but for the nextSteps field. A coach could select "Program concluded" on session 1 of 5. The engagement stays IN_PROGRESS, and the "Log Session" tab will still prompt for session 2.

**Decision:** Option B selected — implement soft warning (no hard block).

### 3. Coach unchecks all outcomes then navigates away

Auto-save fires with `outcomes: []`. For a COMPLETED session, `ensureCompletedInvariant` rejects this (outcomes required). The auto-save error message ("Auto-save failed. Changes remain in the form.") may confuse the coach — they may not understand why saving failed.

**Recommendation:** Add a brief inline validation message near the checkboxes when zero are selected: "At least one outcome is required for completed sessions." This prevents the coach from encountering the auto-save error path.

### 4. `CLAUDE.md` references stale `DURATION_OPTIONS`

`CLAUDE.md` lists `DURATION_OPTIONS` as a key config constant. After removal, this becomes misleading. Must update CLAUDE.md in the same PR.

### 5. `privateNotes` renamed to `notes`

Column renamed in this migration (free on empty table). All code references to `privateNotes` must be updated to `notes`. Verify no test asserts on the word "Private" in UI output. The `sanitizePrivateNotes` function should be renamed to `sanitizeNotes`.

---

## Open Questions (Carry-Forward)

1. **Admin session detail view:** Notes visibility to ops requires admin UI that doesn't exist yet. This plan exposes notes in the API response; admin UI rendering is a separate task.

---

## Data Fixes (Bundle with This PR)

### Wistia media map corrections

- [x] **Didier Perrileux:** Fix typo in `src/lib/wistia/media-map.json` — change `o8hidbcmoo` → `o8hidbcmop` (one character off, confirmed valid at `timharrison2016.wistia.com/medias/o8hidbcmop`)
- [x] **Amy Sareeram:** Confirm with FC whether her video exists in Wistia. If yes, add her media ID to `media-map.json`. If no, she keeps the headshot fallback.

### Calendly link swap (already applied via SQL)

- [x] EF/EL coaches: swapped `bookingLinkPrimary` ↔ `bookingLinkSecondary` so participants see 60-min session link (staging + production)
- [x] **Bethany Klynn:** invalid Calendly link — waiting on Andrea to confirm a working URL from the coach

---

## Deployment Checklist

### Pre-Merge

- [ ] Confirm Session table is empty on **staging**: `SELECT COUNT(*) FROM "Session";` (must be 0)
- [ ] Confirm Session table is empty on **production**: `SELECT COUNT(*) FROM "Session";` (must be 0)
- [ ] Squash-merge PR #22 into main: `gh pr merge 22 --squash --delete-branch`

### Post-Merge: Staging (Vercel auto-deploys main)

**1. SQL verification (Supabase SQL editor, staging project):**

```sql
-- Confirm new columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'Session'
  AND column_name IN ('outcomes', 'nextSteps', 'engagementLevel', 'actionCommitment', 'notes')
ORDER BY column_name;
-- Expected: 5 rows

-- Confirm old columns are gone
SELECT column_name FROM information_schema.columns
WHERE table_name = 'Session'
  AND column_name IN ('outcome', 'durationMinutes', 'privateNotes');
-- Expected: 0 rows

-- Confirm CHECK constraints exist
SELECT conname FROM pg_constraint
WHERE conrelid = '"Session"'::regclass AND contype = 'c';
-- Expected: Session_engagementLevel_check, Session_nextSteps_check,
--           Session_actionCommitment_check, Session_outcomes_json_check
```

**2. Staging functional smoke test:**

- [ ] Coach sign-in via magic link works
- [ ] Dashboard loads with engagement counts
- [ ] Engagements list: Active and Completed tabs render with correct counts
- [ ] Engagement detail: session form shows new fields (outcomes, next steps, engagement level, action commitment, notes)
- [ ] Create a COMPLETED session: fill all fields, submit, verify it appears in session history
- [ ] Create a FORFEITED session: verify form fields hide, submit succeeds
- [ ] Auto-save: change a field on an existing session, confirm save indicator
- [ ] Participant flow unaffected (email verify, coach select, confirmation)

### Post-Merge: Production (after staging passes)

**Production uses SQL + API checks only — no interactive coach portal testing.**

**1. SQL verification (Supabase SQL editor, production project):**

Same 3 queries as staging above. Confirm new columns exist, old columns gone, CHECK constraints in place.

**2. API checks (curl or browser — no login needed):**

- [ ] App loads without 500 error (visit production URL)
- [ ] `POST /api/auth/magic-link/request` with a test email returns 200 (confirms API routes are running with new code)
- [ ] `GET /api/coach/dashboard` without a session cookie returns 401 (confirms auth middleware is enforcing)

**These checks confirm:** the app is alive, the database schema is correct, and the API layer is responding — without touching any real coach account or creating any data.

### Rollback (if needed)

**Can roll back?** YES — only while Session table is empty.

1. Verify: `SELECT COUNT(*) FROM "Session";` (must be 0)
2. Run `backward.sql` against the database via Supabase SQL editor
3. Delete from migrations table: `DELETE FROM _prisma_migrations WHERE migration_name = '20260316_session_field_restructure';`
4. Revert the merge commit on main and deploy
5. If sessions exist: do NOT run backward.sql — fix forward instead

### Monitoring (first 24 hours)

| Check | When | What to look for |
|-------|------|-------------------|
| Vercel function errors | +1h, +4h, +24h | Any 500s on `/api/coach/sessions` or `/api/coach/engagements` |
| Check constraint violations | +4h | Any `23514` errors in Supabase logs |
| Coach portal usability | +24h | No reports of form issues from Kari/coaches |

---

## References

- **Brainstorm:** `docs/brainstorms/2026-03-13-coach-session-form-field-changes-brainstorm.md`
- **Current schema:** `prisma/schema.prisma:315-333`
- **Config constants:** `src/lib/config.ts:49-58`
- **Validation:** `src/lib/validation/session-validation.ts`
- **POST route:** `src/app/api/coach/sessions/route.ts`
- **PATCH route:** `src/app/api/coach/sessions/[id]/route.ts`
- **UI page:** `src/app/coach/engagements/[id]/page.tsx`
- **Types:** `src/lib/types/coach.ts:8-19`
- **Shared mapper:** `src/app/api/coach/_shared.ts`
