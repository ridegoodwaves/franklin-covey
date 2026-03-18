-- Environment: PRODUCTION
-- Purpose: Apply roster transfer cleanup before seeding from updated artifacts.
-- Transfers:
--   - titus.g.muyuela@usps.gov  EF-1 -> EF-2
--   - cody.a.vanburen@usps.gov  EF-1 -> EF-2
--   - antoinette.l.harris@usps.gov  ALP-136 -> ALP-137
--
-- Safety behavior:
--   1) Aborts if target cohorts EF-2 or ALP-137 are missing.
--   2) Aborts if any source-cohort engagement is active and not INVITED.
--   3) Archives source engagement rows first, then source participant rows.
--   4) Safe to re-run: already-archived source rows are ignored.
--
-- Run this script in production AFTER snapshot and BEFORE: npm run data:seed:staging
-- (The seed script name is "staging" but it targets whichever DATABASE_URL is loaded.)

BEGIN;

-- Guard: required target cohorts must exist.
DO $$
DECLARE
  missing_count integer;
BEGIN
  SELECT COUNT(*) INTO missing_count
  FROM (
    SELECT required_code
    FROM (VALUES ('EF-2'), ('ALP-137')) AS required(required_code)
  ) required
  LEFT JOIN "Cohort" c ON c.code = required.required_code AND c."archivedAt" IS NULL
  WHERE c.id IS NULL;

  IF missing_count > 0 THEN
    RAISE EXCEPTION 'Missing required target cohorts (EF-2 and/or ALP-137). Aborting transfer cleanup.';
  END IF;
END $$;

-- Guard: do not archive source rows if any engagement already progressed beyond INVITED.
DO $$
DECLARE
  bad_count integer;
BEGIN
  SELECT COUNT(*) INTO bad_count
  FROM "Engagement" e
  JOIN "Participant" p ON p.id = e."participantId"
  JOIN "Cohort" c ON c.id = p."cohortId"
  WHERE p."archivedAt" IS NULL
    AND e."archivedAt" IS NULL
    AND e.status <> 'INVITED'
    AND (
      (LOWER(p.email) IN ('titus.g.muyuela@usps.gov', 'cody.a.vanburen@usps.gov') AND c.code = 'EF-1')
      OR
      (LOWER(p.email) = 'antoinette.l.harris@usps.gov' AND c.code = 'ALP-136')
    );

  IF bad_count > 0 THEN
    RAISE EXCEPTION 'Found non-INVITED active engagement(s) in source cohorts for transfer participants. Resolve manually before running this script.';
  END IF;
END $$;

WITH archived_engagements AS (
  UPDATE "Engagement" e
  SET "archivedAt" = NOW(),
      "updatedAt" = NOW()
  FROM "Participant" p
  JOIN "Cohort" c ON c.id = p."cohortId"
  WHERE e."participantId" = p.id
    AND e."archivedAt" IS NULL
    AND p."archivedAt" IS NULL
    AND (
      (LOWER(p.email) IN ('titus.g.muyuela@usps.gov', 'cody.a.vanburen@usps.gov') AND c.code = 'EF-1')
      OR
      (LOWER(p.email) = 'antoinette.l.harris@usps.gov' AND c.code = 'ALP-136')
    )
  RETURNING e.id
)
SELECT COUNT(*) AS archived_engagement_count FROM archived_engagements;

WITH archived_participants AS (
  UPDATE "Participant" p
  SET "archivedAt" = NOW(),
      "updatedAt" = NOW()
  FROM "Cohort" c
  WHERE p."cohortId" = c.id
    AND p."archivedAt" IS NULL
    AND (
      (LOWER(p.email) IN ('titus.g.muyuela@usps.gov', 'cody.a.vanburen@usps.gov') AND c.code = 'EF-1')
      OR
      (LOWER(p.email) = 'antoinette.l.harris@usps.gov' AND c.code = 'ALP-136')
    )
  RETURNING p.id
)
SELECT COUNT(*) AS archived_participant_count FROM archived_participants;

COMMIT;

-- Post-apply verification (run after data:seed:staging):
-- Expect active rows only in EF-2 (Titus/Cody) and ALP-137 (Antoinette).
SELECT
  LOWER(p.email) AS email,
  c.code AS cohort_code,
  (p."archivedAt" IS NULL) AS participant_active,
  e.status AS engagement_status,
  (e."archivedAt" IS NULL) AS engagement_active
FROM "Participant" p
JOIN "Cohort" c ON c.id = p."cohortId"
LEFT JOIN "Engagement" e ON e."participantId" = p.id
WHERE LOWER(p.email) IN (
  'titus.g.muyuela@usps.gov',
  'cody.a.vanburen@usps.gov',
  'antoinette.l.harris@usps.gov'
)
ORDER BY email, cohort_code;
