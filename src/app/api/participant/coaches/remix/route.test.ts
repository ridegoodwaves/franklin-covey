import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

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
    pickCoachBatch: real.pickCoachBatch,
    toParticipantCoachCards: vi.fn(async (coaches) =>
      coaches.map((c: { id: string }) => ({
        id: c.id,
        name: "Test Coach",
        initials: "TC",
        bio: "Test bio",
        specialties: [],
        credentials: [],
        location: "Virtual",
        atCapacity: false,
        remainingCapacity: 10,
        yearsExperience: 10,
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

const { POST } = await import("./route");

const validSession = {
  participantId: "p1",
  engagementId: "e1",
  organizationId: "org-1",
  cohortId: "c1",
  email: "test@gov.com",
  shownCoachIds: ["prev-1", "prev-2", "prev-3"],
  remixUsed: false,
  currentBatchIds: ["prev-1", "prev-2", "prev-3"],
};

function buildPostRequest() {
  return new NextRequest("http://localhost/api/participant/coaches/remix", {
    method: "POST",
    headers: { "content-type": "application/json" },
  });
}

describe("POST /api/participant/coaches/remix", () => {
  beforeEach(() => {
    mockReadSession.mockReturnValue(validSession);
    mockWriteSession.mockImplementation(() => {});
    mockGetContext.mockResolvedValue({
      id: "e1",
      status: "INVITED",
      cohort: { id: "c1", coachSelectionEnd: new Date("2099-12-31") },
      program: { id: "program-1", pool: "MLP_ALP" },
    } as never);
    mockListPool.mockResolvedValue([
      buildCoachProfileBundle({ id: "new-1" }),
      buildCoachProfileBundle({ id: "new-2" }),
      buildCoachProfileBundle({ id: "new-3" }),
      buildCoachProfileBundle({ id: "new-4" }),
      buildCoachProfileBundle({ id: "new-5" }),
      buildCoachProfileBundle({ id: "new-6" }),
    ] as never);
  });

  it("returns new batch and sets remixUsed=true for first remix", async () => {
    const response = await POST(buildPostRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.coaches.length).toBeGreaterThan(0);

    // Session should be written with remixUsed: true
    expect(mockWriteSession).toHaveBeenCalled();
    const writtenSession = mockWriteSession.mock.calls[0][1] as typeof validSession;
    expect(writtenSession.remixUsed).toBe(true);
  });

  it("rejects second remix attempt (one-way door)", async () => {
    mockReadSession.mockReturnValue({ ...validSession, remixUsed: true });

    const response = await POST(buildPostRequest());
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toBe("REMIX_ALREADY_USED");
  });

  it("returns 401 when no valid session", async () => {
    mockReadSession.mockReturnValue(null);

    const response = await POST(buildPostRequest());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("INVALID_SESSION");
  });
});
