-- Environment: STAGING
-- Purpose: Ensure EF/EL coach panel uses longer-session URL as bookingLinkPrimary.
-- Safety: one-way predicate avoids accidental flip-back on re-run.

BEGIN;

WITH target AS (
  SELECT DISTINCT cp.id
  FROM "CoachPoolMembership" cpm
  JOIN "OrganizationCoach" oc ON oc.id = cpm."organizationCoachId"
  JOIN "CoachProfile" cp ON cp.id = oc."coachProfileId"
  WHERE cpm.pool = 'EF_EL'
    AND cpm."archivedAt" IS NULL
    AND oc."archivedAt" IS NULL
    AND cp."archivedAt" IS NULL
    AND cp."bookingLinkPrimary" IS NOT NULL
    AND btrim(cp."bookingLinkPrimary") <> ''
    AND cp."bookingLinkSecondary" IS NOT NULL
    AND btrim(cp."bookingLinkSecondary") <> ''
    AND cp."bookingLinkPrimary" <> cp."bookingLinkSecondary"
    AND (
      lower(cp."bookingLinkPrimary") ~ '(30|thirty|intro|interview)'
      OR lower(cp."bookingLinkSecondary") ~ '(60|90|hour|one-hour|coaching-session|executive-coaching)'
    )
),
updated AS (
  UPDATE "CoachProfile" cp
  SET "bookingLinkPrimary" = cp."bookingLinkSecondary",
      "bookingLinkSecondary" = cp."bookingLinkPrimary",
      "updatedAt" = NOW()
  WHERE cp.id IN (SELECT id FROM target)
  RETURNING cp.id, cp."displayName", cp."bookingLinkPrimary", cp."bookingLinkSecondary"
)
SELECT COUNT(*) AS updated_count FROM updated;

COMMIT;

-- Post-apply verification
SELECT cp."displayName", u.email, cp."bookingLinkPrimary", cp."bookingLinkSecondary"
FROM "CoachPoolMembership" cpm
JOIN "OrganizationCoach" oc ON oc.id = cpm."organizationCoachId"
JOIN "CoachProfile" cp ON cp.id = oc."coachProfileId"
JOIN "User" u ON u.id = cp."userId"
WHERE cpm.pool = 'EF_EL'
  AND cpm."archivedAt" IS NULL
  AND oc."archivedAt" IS NULL
  AND cp."archivedAt" IS NULL
ORDER BY cp."displayName";
