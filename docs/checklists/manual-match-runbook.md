# Manual Match Runbook (EF/EL Interviews)

Use this runbook when Andrea reports a participant-coach match that must be applied manually.

## Preconditions

- Match request includes participant email, cohort code, and selected coach name/email.
- Participant belongs to the correct organization/cohort.
- Operator has SQL access to the target environment.

## Safety Rules

- Always run this in a transaction.
- Always pre-check engagement status before update.
- Only update if engagement is still `INVITED`.
- Always increment `"statusVersion"` to preserve optimistic locking.

## Step 1: Resolve IDs

```sql
SELECT
  p.id AS participant_id,
  p.email AS participant_email,
  c.code AS cohort_code,
  e.id AS engagement_id,
  e.status,
  e."statusVersion",
  e."organizationCoachId" AS current_organization_coach_id
FROM "Participant" p
JOIN "Cohort" c ON c.id = p."cohortId"
JOIN "Engagement" e ON e."participantId" = p.id
WHERE LOWER(p.email) = LOWER('<participant_email>')
  AND c.code = '<cohort_code>'
  AND p."archivedAt" IS NULL
  AND e."archivedAt" IS NULL;
```

```sql
SELECT
  oc.id AS organization_coach_id,
  cp."displayName",
  u.email AS coach_email,
  oc.active
FROM "OrganizationCoach" oc
JOIN "CoachProfile" cp ON cp.id = oc."coachProfileId"
JOIN "User" u ON u.id = cp."userId"
WHERE LOWER(u.email) = LOWER('<coach_email>')
  AND oc.active = true
  AND oc."archivedAt" IS NULL;
```

If the participant engagement is not `INVITED`, stop and report back to Andrea that the participant already selected in-app.

## Step 2: Apply Manual Match

```sql
BEGIN;

UPDATE "Engagement"
SET status = 'COACH_SELECTED',
    "organizationCoachId" = '<matched_organization_coach_id>',
    "coachSelectedAt" = NOW(),
    "lastActivityAt" = NOW(),
    "statusVersion" = "statusVersion" + 1
WHERE "participantId" = '<participant_id>'
  AND status = 'INVITED'
  AND "archivedAt" IS NULL;

-- Must return 1 row
SELECT id, status, "organizationCoachId", "coachSelectedAt", "statusVersion"
FROM "Engagement"
WHERE id = '<engagement_id>';

COMMIT;
```

If the `UPDATE` affects `0` rows, `ROLLBACK` and re-run Step 1. Do not force-update non-`INVITED` rows.

## Step 3: Validate Result

```sql
SELECT
  p.email AS participant_email,
  c.code AS cohort_code,
  e.status,
  e."organizationCoachId",
  e."coachSelectedAt",
  e."statusVersion",
  cp."displayName" AS coach_name
FROM "Engagement" e
JOIN "Participant" p ON p.id = e."participantId"
JOIN "Cohort" c ON c.id = e."cohortId"
LEFT JOIN "OrganizationCoach" oc ON oc.id = e."organizationCoachId"
LEFT JOIN "CoachProfile" cp ON cp.id = oc."coachProfileId"
WHERE e.id = '<engagement_id>';
```

Expected:
- `status = COACH_SELECTED`
- `organizationCoachId` set to target coach
- `coachSelectedAt` not null
- `statusVersion` incremented

## Optional Prisma Script (Equivalent)

```ts
await prisma.engagement.updateMany({
  where: {
    participantId: participantId,
    status: "INVITED",
    archivedAt: null,
  },
  data: {
    status: "COACH_SELECTED",
    organizationCoachId: organizationCoachId,
    coachSelectedAt: new Date(),
    lastActivityAt: new Date(),
    statusVersion: { increment: 1 },
  },
});
```

Validate with the SQL in Step 3 after running.

## Communication Back to Andrea

Send confirmation including:
- Participant email
- Assigned coach
- Timestamp applied
- Final engagement status (`COACH_SELECTED`)
