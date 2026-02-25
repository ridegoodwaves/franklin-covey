-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'COACH');

-- CreateEnum
CREATE TYPE "ProgramCode" AS ENUM ('MLP', 'ALP', 'EF', 'EL');

-- CreateEnum
CREATE TYPE "ProgramTrack" AS ENUM ('TWO_SESSION', 'FIVE_SESSION');

-- CreateEnum
CREATE TYPE "CoachPool" AS ENUM ('MLP_ALP', 'EF_EL');

-- CreateEnum
CREATE TYPE "EngagementStatus" AS ENUM ('INVITED', 'COACH_SELECTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELED', 'ON_HOLD');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('COMPLETED', 'FORFEITED_CANCELLED', 'FORFEITED_NOT_USED');

-- CreateEnum
CREATE TYPE "NeedsAttentionType" AS ENUM ('SELECTION_OVERDUE', 'SESSION_WINDOW_OVERDUE', 'COACH_ATTENTION', 'OPS_ESCALATION');

-- CreateEnum
CREATE TYPE "NeedsAttentionStatus" AS ENUM ('OPEN', 'RESOLVED', 'IGNORED');

-- CreateEnum
CREATE TYPE "ImportType" AS ENUM ('PARTICIPANT_ROSTER', 'COACH_PROFILE', 'COHORT_TIMELINE', 'ADMIN_USERS');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('VALIDATED', 'EXECUTED', 'FAILED');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Program" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "code" "ProgramCode" NOT NULL,
    "name" TEXT NOT NULL,
    "track" "ProgramTrack" NOT NULL,
    "defaultSessions" INTEGER NOT NULL,
    "pool" "CoachPool" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Program_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cohort" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "participantCountPlanned" INTEGER,
    "coachSelectionStart" TIMESTAMP(3) NOT NULL,
    "coachSelectionEnd" TIMESTAMP(3) NOT NULL,
    "session1Start" TIMESTAMP(3),
    "session1End" TIMESTAMP(3),
    "session2Start" TIMESTAMP(3),
    "session2End" TIMESTAMP(3),
    "reportingWindowEnd" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Cohort_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Participant" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,
    "sourceFile" TEXT,
    "sourcePayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Participant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoachProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "location" TEXT,
    "shortBio" TEXT,
    "photoPath" TEXT,
    "bookingLinkPrimary" TEXT,
    "bookingLinkSecondary" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sourceFile" TEXT,
    "sourcePayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "CoachProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationCoach" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "coachProfileId" TEXT NOT NULL,
    "maxEngagements" INTEGER NOT NULL DEFAULT 20,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "OrganizationCoach_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoachPoolMembership" (
    "id" TEXT NOT NULL,
    "organizationCoachId" TEXT NOT NULL,
    "pool" "CoachPool" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "CoachPoolMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoachHighlight" (
    "id" TEXT NOT NULL,
    "coachProfileId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "CoachHighlight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoachCertification" (
    "id" TEXT NOT NULL,
    "coachProfileId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "CoachCertification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoachClientQuote" (
    "id" TEXT NOT NULL,
    "coachProfileId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "quote" TEXT NOT NULL,
    "attribution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "CoachClientQuote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Engagement" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,
    "organizationCoachId" TEXT,
    "status" "EngagementStatus" NOT NULL DEFAULT 'INVITED',
    "statusVersion" INTEGER NOT NULL DEFAULT 1,
    "totalSessions" INTEGER NOT NULL,
    "coachSelectedAt" TIMESTAMP(3),
    "lastActivityAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Engagement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "sessionNumber" INTEGER NOT NULL,
    "status" "SessionStatus" NOT NULL,
    "occurredAt" TIMESTAMP(3),
    "topic" TEXT,
    "outcome" TEXT,
    "durationMinutes" INTEGER,
    "privateNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NeedsAttentionFlag" (
    "id" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "type" "NeedsAttentionType" NOT NULL,
    "status" "NeedsAttentionStatus" NOT NULL DEFAULT 'OPEN',
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "ownerEmail" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "NeedsAttentionFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" "ImportType" NOT NULL,
    "status" "ImportStatus" NOT NULL,
    "sourceFile" TEXT NOT NULL,
    "sourceHash" TEXT,
    "rowCountValid" INTEGER,
    "rowCountInvalid" INTEGER,
    "summary" JSONB,
    "executedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportRowIssue" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "errorCode" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "rawRow" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportRowIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "actorUserId" TEXT,
    "actorEmail" TEXT,
    "actorRole" TEXT,
    "eventType" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_code_key" ON "Organization"("code");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Program_organizationId_pool_idx" ON "Program"("organizationId", "pool");

-- CreateIndex
CREATE UNIQUE INDEX "Program_organizationId_code_key" ON "Program"("organizationId", "code");

-- CreateIndex
CREATE INDEX "Cohort_organizationId_programId_coachSelectionStart_idx" ON "Cohort"("organizationId", "programId", "coachSelectionStart");

-- CreateIndex
CREATE UNIQUE INDEX "Cohort_organizationId_code_key" ON "Cohort"("organizationId", "code");

-- CreateIndex
CREATE INDEX "Participant_organizationId_email_idx" ON "Participant"("organizationId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "Participant_cohortId_email_key" ON "Participant"("cohortId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "CoachProfile_userId_key" ON "CoachProfile"("userId");

-- CreateIndex
CREATE INDEX "OrganizationCoach_organizationId_active_idx" ON "OrganizationCoach"("organizationId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationCoach_organizationId_coachProfileId_key" ON "OrganizationCoach"("organizationId", "coachProfileId");

-- CreateIndex
CREATE INDEX "CoachPoolMembership_pool_idx" ON "CoachPoolMembership"("pool");

-- CreateIndex
CREATE UNIQUE INDEX "CoachPoolMembership_organizationCoachId_pool_key" ON "CoachPoolMembership"("organizationCoachId", "pool");

-- CreateIndex
CREATE INDEX "CoachHighlight_coachProfileId_sortOrder_idx" ON "CoachHighlight"("coachProfileId", "sortOrder");

-- CreateIndex
CREATE INDEX "CoachCertification_coachProfileId_sortOrder_idx" ON "CoachCertification"("coachProfileId", "sortOrder");

-- CreateIndex
CREATE INDEX "CoachClientQuote_coachProfileId_sortOrder_idx" ON "CoachClientQuote"("coachProfileId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Engagement_participantId_key" ON "Engagement"("participantId");

-- CreateIndex
CREATE INDEX "Engagement_organizationId_programId_cohortId_status_idx" ON "Engagement"("organizationId", "programId", "cohortId", "status");

-- CreateIndex
CREATE INDEX "Engagement_organizationCoachId_status_idx" ON "Engagement"("organizationCoachId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Session_engagementId_sessionNumber_key" ON "Session"("engagementId", "sessionNumber");

-- CreateIndex
CREATE INDEX "NeedsAttentionFlag_status_type_triggeredAt_idx" ON "NeedsAttentionFlag"("status", "type", "triggeredAt");

-- CreateIndex
CREATE INDEX "ImportBatch_organizationId_type_status_idx" ON "ImportBatch"("organizationId", "type", "status");

-- CreateIndex
CREATE INDEX "ImportRowIssue_batchId_rowNumber_idx" ON "ImportRowIssue"("batchId", "rowNumber");

-- CreateIndex
CREATE INDEX "AuditEvent_eventType_createdAt_idx" ON "AuditEvent"("eventType", "createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_entityType_entityId_idx" ON "AuditEvent"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "Program" ADD CONSTRAINT "Program_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cohort" ADD CONSTRAINT "Cohort_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cohort" ADD CONSTRAINT "Cohort_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "Cohort"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachProfile" ADD CONSTRAINT "CoachProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationCoach" ADD CONSTRAINT "OrganizationCoach_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationCoach" ADD CONSTRAINT "OrganizationCoach_coachProfileId_fkey" FOREIGN KEY ("coachProfileId") REFERENCES "CoachProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachPoolMembership" ADD CONSTRAINT "CoachPoolMembership_organizationCoachId_fkey" FOREIGN KEY ("organizationCoachId") REFERENCES "OrganizationCoach"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachHighlight" ADD CONSTRAINT "CoachHighlight_coachProfileId_fkey" FOREIGN KEY ("coachProfileId") REFERENCES "CoachProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachCertification" ADD CONSTRAINT "CoachCertification_coachProfileId_fkey" FOREIGN KEY ("coachProfileId") REFERENCES "CoachProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachClientQuote" ADD CONSTRAINT "CoachClientQuote_coachProfileId_fkey" FOREIGN KEY ("coachProfileId") REFERENCES "CoachProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Engagement" ADD CONSTRAINT "Engagement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Engagement" ADD CONSTRAINT "Engagement_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Engagement" ADD CONSTRAINT "Engagement_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Engagement" ADD CONSTRAINT "Engagement_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "Cohort"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Engagement" ADD CONSTRAINT "Engagement_organizationCoachId_fkey" FOREIGN KEY ("organizationCoachId") REFERENCES "OrganizationCoach"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "Engagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NeedsAttentionFlag" ADD CONSTRAINT "NeedsAttentionFlag_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "Engagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportRowIssue" ADD CONSTRAINT "ImportRowIssue_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

