/**
 * Test data factories — type-aligned builders for Prisma model shapes.
 * These return plain objects matching the shape that Prisma mocks resolve with.
 */

import type { EngagementStatus, CoachPool, UserRole } from "@prisma/client";

let idCounter = 0;
function nextId(): string {
  idCounter += 1;
  return `test-id-${idCounter.toString().padStart(4, "0")}`;
}

// Reset counter between test files
export function resetFactoryIds(): void {
  idCounter = 0;
}

export function buildParticipant(overrides: Record<string, unknown> = {}) {
  const id = nextId();
  return {
    id,
    email: `participant-${id}@test.gov`,
    organizationId: "org-1",
    cohortId: "cohort-1",
    archivedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function buildEngagement(overrides: Record<string, unknown> = {}) {
  return {
    id: nextId(),
    participantId: nextId(),
    organizationId: "org-1",
    cohortId: "cohort-1",
    programId: "program-1",
    organizationCoachId: null,
    status: "INVITED" as EngagementStatus,
    statusVersion: 1,
    coachSelectedAt: null,
    lastActivityAt: new Date(),
    archivedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function buildUser(overrides: Record<string, unknown> = {}) {
  const id = nextId();
  return {
    id,
    email: `user-${id}@test.gov`,
    role: "COACH" as UserRole,
    active: true,
    archivedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function buildCohort(overrides: Record<string, unknown> = {}) {
  return {
    id: nextId(),
    organizationId: "org-1",
    name: "Test Cohort",
    active: true,
    coachSelectionStart: new Date("2020-01-01"),
    coachSelectionEnd: new Date("2099-12-31"),
    archivedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function buildCoachProfileBundle(overrides: Record<string, unknown> = {}) {
  const id = nextId();
  return {
    id,
    organizationId: "org-1",
    coachPool: "MLP_ALP" as CoachPool,
    maxEngagements: 20,
    displayName: `Coach ${id}`,
    email: `coach-${id}@test.com`,
    shortBio: "An experienced leadership coach.",
    location: "Virtual",
    yearsExperience: 10,
    specialties: ["Leadership"],
    credentials: ["PCC"],
    bookingLinkPrimary: "https://calendly.com/test",
    photoPath: null,
    atCapacity: false,
    remainingCapacity: 15,
    quotes: [],
    ...overrides,
  };
}

export function buildAuditEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: nextId(),
    eventType: "TEST_EVENT",
    entityType: "TEST_ENTITY",
    entityId: "test-entity-id",
    actorUserId: null,
    actorEmail: null,
    actorRole: null,
    metadata: {},
    ipAddress: null,
    userAgent: null,
    createdAt: new Date(),
    ...overrides,
  };
}
