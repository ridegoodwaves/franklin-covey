BEGIN;

DO $$
BEGIN
  IF (SELECT COUNT(*) FROM "Session") > 0 THEN
    RAISE EXCEPTION 'Session table is not empty — aborting destructive migration';
  END IF;
END $$;

ALTER TABLE "Session" DROP COLUMN IF EXISTS "outcome";
ALTER TABLE "Session" DROP COLUMN IF EXISTS "durationMinutes";
ALTER TABLE "Session" RENAME COLUMN "privateNotes" TO "notes";

ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "outcomes" TEXT;
ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "nextSteps" TEXT;
ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "engagementLevel" INTEGER;
ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "actionCommitment" TEXT;

ALTER TABLE "Session" ADD CONSTRAINT "Session_engagementLevel_check"
  CHECK ("engagementLevel" IS NULL OR ("engagementLevel" >= 1 AND "engagementLevel" <= 5));

ALTER TABLE "Session" ADD CONSTRAINT "Session_nextSteps_check"
  CHECK (
    "nextSteps" IS NULL OR
    "nextSteps" IN (
      'Next session scheduled',
      'Next session not scheduled',
      'Program concluded, no next session'
    )
  );

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

ALTER TABLE "Session" ADD CONSTRAINT "Session_outcomes_json_check"
  CHECK (
    "outcomes" IS NULL OR
    (
      jsonb_typeof("outcomes"::jsonb) = 'array' AND
      jsonb_array_length("outcomes"::jsonb) > 0
    )
  );

COMMIT;
