-- Environment: STAGING
-- Purpose: Remove Lona Miller from MLP-80 per launch roster update.
-- Target email: lona.e.miller@usps.gov
--
-- Safety behavior:
--   1) Aborts if cohort MLP-80 does not exist for USPS.
--   2) No-op if participant is already absent.
--   3) Deletes in FK-safe order: NeedsAttentionFlag -> Session -> Engagement -> Participant.
--   4) Writes AuditEvent only when participant deletion occurs.

BEGIN;

DO $$
DECLARE
  cohort_count integer;
BEGIN
  SELECT COUNT(*) INTO cohort_count
  FROM "Cohort" c
  JOIN "Organization" o ON o.id = c."organizationId"
  WHERE o.code = 'USPS'
    AND c.code = 'MLP-80'
    AND c."archivedAt" IS NULL;

  IF cohort_count = 0 THEN
    RAISE EXCEPTION 'Missing required cohort USPS/MLP-80. Aborting Lona Miller removal.';
  END IF;
END $$;

WITH target_participant AS (
  SELECT p.id AS participant_id, p."organizationId" AS organization_id
  FROM "Participant" p
  JOIN "Cohort" c ON c.id = p."cohortId"
  JOIN "Organization" o ON o.id = c."organizationId"
  WHERE o.code = 'USPS'
    AND c.code = 'MLP-80'
    AND LOWER(p.email) = 'lona.e.miller@usps.gov'
),
target_engagement AS (
  SELECT e.id AS engagement_id
  FROM "Engagement" e
  JOIN target_participant tp ON tp.participant_id = e."participantId"
),
deleted_flags AS (
  DELETE FROM "NeedsAttentionFlag" naf
  USING target_engagement te
  WHERE naf."engagementId" = te.engagement_id
  RETURNING naf.id
),
deleted_sessions AS (
  DELETE FROM "Session" s
  USING target_engagement te
  WHERE s."engagementId" = te.engagement_id
  RETURNING s.id
),
deleted_engagement AS (
  DELETE FROM "Engagement" e
  USING target_participant tp
  WHERE e."participantId" = tp.participant_id
  RETURNING e.id
),
deleted_participant AS (
  DELETE FROM "Participant" p
  USING target_participant tp
  WHERE p.id = tp.participant_id
  RETURNING p.id, p."organizationId"
),
audit_insert AS (
  INSERT INTO "AuditEvent" (
    "id",
    "organizationId",
    "actorEmail",
    "actorRole",
    "eventType",
    "entityType",
    "entityId",
    "metadata",
    "createdAt"
  )
  SELECT
    CONCAT('audit_', TO_CHAR(NOW(), 'YYYYMMDDHH24MISSMS'), '_', SUBSTRING(MD5(RANDOM()::text), 1, 10)),
    dp."organizationId",
    'amit@ridegoodwaves.com',
    'ADMIN',
    'PARTICIPANT_REMOVED',
    'Participant',
    dp.id,
    '{"reason": "Client request - Kari Sadler", "email": "lona.e.miller@usps.gov", "cohort": "MLP-80"}'::jsonb,
    NOW()
  FROM deleted_participant dp
  RETURNING id
)
SELECT
  (SELECT COUNT(*) FROM target_participant) AS matched_participant_count,
  (SELECT COUNT(*) FROM target_engagement) AS matched_engagement_count,
  (SELECT COUNT(*) FROM deleted_flags) AS deleted_needs_attention_count,
  (SELECT COUNT(*) FROM deleted_sessions) AS deleted_session_count,
  (SELECT COUNT(*) FROM deleted_engagement) AS deleted_engagement_count,
  (SELECT COUNT(*) FROM deleted_participant) AS deleted_participant_count,
  (SELECT COUNT(*) FROM audit_insert) AS audit_event_insert_count;

COMMIT;

-- Post-apply verification:
SELECT COUNT(*) AS lona_participant_count
FROM "Participant" p
WHERE LOWER(p.email) = 'lona.e.miller@usps.gov';

SELECT c.code, COUNT(p.id) AS active_participants
FROM "Cohort" c
LEFT JOIN "Participant" p ON p."cohortId" = c.id AND p."archivedAt" IS NULL
WHERE c.code = 'MLP-80'
GROUP BY c.code;
