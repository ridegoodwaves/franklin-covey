BEGIN;

DO $$
BEGIN
  IF (SELECT COUNT(*) FROM "Session") > 0 THEN
    RAISE EXCEPTION 'Session table is not empty — aborting destructive rollback';
  END IF;
END $$;

ALTER TABLE "Session" DROP CONSTRAINT IF EXISTS "Session_outcomes_json_check";
ALTER TABLE "Session" DROP CONSTRAINT IF EXISTS "Session_actionCommitment_check";
ALTER TABLE "Session" DROP CONSTRAINT IF EXISTS "Session_nextSteps_check";
ALTER TABLE "Session" DROP CONSTRAINT IF EXISTS "Session_engagementLevel_check";

ALTER TABLE "Session" DROP COLUMN IF EXISTS "outcomes";
ALTER TABLE "Session" DROP COLUMN IF EXISTS "nextSteps";
ALTER TABLE "Session" DROP COLUMN IF EXISTS "engagementLevel";
ALTER TABLE "Session" DROP COLUMN IF EXISTS "actionCommitment";

ALTER TABLE "Session" RENAME COLUMN "notes" TO "privateNotes";
ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "outcome" TEXT;
ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "durationMinutes" INTEGER;

COMMIT;
