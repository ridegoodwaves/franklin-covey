import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { prismaMock } from "@/lib/__mocks__/db";

// We need to mock session read/write and coach service to control behavior
vi.mock("@/lib/server/session", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/server/session")>();
  return {
    ...real,
    readParticipantSession: vi.fn(),
    writeParticipantSession: vi.fn(),
  };
});

vi.mock("@/lib/server/participant-coach-service", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/server/participant-coach-service")>();
  return {
    ...real,
    getSessionContext: vi.fn(),
    listCoachPool: vi.fn(),
    pickCoachBatch: real.pickCoachBatch, // keep real implementation
    toParticipantCoachCards: vi.fn(async (coaches) =>
      coaches.map((c: { id: string; displayName?: string }) => ({
        id: c.id,
        name: c.displayName ?? "Test Coach",
        initials: "TC",
        bio: "Test bio",
        specialties: [],
        credentials: [],
        location: "Virtual",
        atCapacity: false,
        remainingCapacity: 10,
        yearsExperience: 10,
        wistiaMediaId: "test-media-id",
        quotes: [],
      }))
    ),
  };
});

import { readParticipantSession, writeParticipantSession } from "@/lib/server/session";
import { getSessionContext, listCoachPool } from "@/lib/server/participant-coach-service";
import { buildCoachProfileBundle } from "@/__tests__/factories";

const mockReadSession = vi.mocked(readParticipantSession);
const mockWriteSession = vi.mocked(writeParticipantSession);
const mockGetContext = vi.mocked(getSessionContext);
const mockListPool = vi.mocked(listCoachPool);

const { GET } = await import("./route");

const validSession = {
  participantId: "p1",
  engagementId: "e1",
  organizationId: "org-1",
  cohortId: "c1",
  email: "test@gov.com",
  shownCoachIds: [],
  remixUsed: false,
  currentBatchIds: [],
};

function buildGetRequest() {
  return new NextRequest("http://localhost/api/participant/coaches");
}

function mockValidContext(overrides: Record<string, unknown> = {}) {
  mockGetContext.mockResolvedValue({
    id: "e1",
    participantId: "p1",
    organizationId: "org-1",
    cohortId: "c1",
    programId: "program-1",
    status: "INVITED",
    cohort: {
      id: "c1",
      coachSelectionEnd: new Date("2099-12-31"),
    },
    program: {
      id: "program-1",
      pool: "MLP_ALP",
    },
    ...overrides,
  } as never);
}

describe("GET /api/participant/coaches", () => {
  beforeEach(() => {
    mockReadSession.mockReturnValue(validSession);
    mockWriteSession.mockImplementation(() => {});
    mockValidContext();
    mockListPool.mockResolvedValue([
      buildCoachProfileBundle({ id: "c1" }),
      buildCoachProfileBundle({ id: "c2" }),
      buildCoachProfileBundle({ id: "c3" }),
      buildCoachProfileBundle({ id: "c4" }),
      buildCoachProfileBundle({ id: "c5" }),
    ] as never);
  });

  it("returns 401 INVALID_SESSION when no session cookie", async () => {
    mockReadSession.mockReturnValue(null);

    const response = await GET(buildGetRequest());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("INVALID_SESSION");
  });

  it("returns 409 ALREADY_SELECTED when engagement is not INVITED", async () => {
    mockValidContext({ status: "COACH_SELECTED" });

    const response = await GET(buildGetRequest());
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toBe("ALREADY_SELECTED");
  });

  it("returns 409 WINDOW_CLOSED when selection window is past", async () => {
    mockValidContext({
      status: "INVITED",
      cohort: { id: "c1", coachSelectionEnd: new Date("2020-01-01") },
    });

    const response = await GET(buildGetRequest());
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toBe("WINDOW_CLOSED");
  });

  it("returns 3 coaches and sets currentBatchIds for first GET", async () => {
    const response = await GET(buildGetRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.coaches).toHaveLength(3);
    expect(body.coaches[0].wistiaMediaId).toBe("test-media-id");
    expect(body.allAtCapacity).toBe(false);

    // writeParticipantSession was called with currentBatchIds set
    expect(mockWriteSession).toHaveBeenCalled();
    const writeCall = mockWriteSession.mock.calls[0];
    const writtenSession = writeCall[1] as typeof validSession;
    expect(writtenSession.currentBatchIds).toHaveLength(3);
  });

  it("returns same coaches on second GET with pinned currentBatchIds", async () => {
    // Simulate a session that already has pinned batch IDs
    mockReadSession.mockReturnValue({
      ...validSession,
      currentBatchIds: ["c1", "c2", "c3"],
    });

    const response = await GET(buildGetRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.coaches).toHaveLength(3);
    // The IDs should match the pinned ones
    const ids = body.coaches.map((c: { id: string }) => c.id);
    expect(ids).toEqual(expect.arrayContaining(["c1", "c2", "c3"]));
  });

  it("falls back safely for legacy session without currentBatchIds", async () => {
    // Legacy session: currentBatchIds is undefined
    const legacySession = { ...validSession };
    delete (legacySession as Record<string, unknown>).currentBatchIds;
    mockReadSession.mockReturnValue(legacySession);

    const response = await GET(buildGetRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.coaches.length).toBeGreaterThan(0);
  });

  it("returns allAtCapacity with remixUsed and empty currentBatchIds when all coaches at capacity", async () => {
    mockListPool.mockResolvedValue([
      buildCoachProfileBundle({ id: "c1", atCapacity: true, remainingCapacity: 0 }),
      buildCoachProfileBundle({ id: "c2", atCapacity: true, remainingCapacity: 0 }),
    ] as never);

    mockReadSession.mockReturnValue({ ...validSession, remixUsed: true });

    const response = await GET(buildGetRequest());
    const body = await response.json();

    expect(body.allAtCapacity).toBe(true);
    expect(body.remixUsed).toBe(true);
    expect(body.coaches).toHaveLength(0);
  });

  it("always includes remixUsed in response", async () => {
    const response = await GET(buildGetRequest());
    const body = await response.json();

    expect(body).toHaveProperty("remixUsed");
    expect(body.remixUsed).toBe(false);
  });
});
