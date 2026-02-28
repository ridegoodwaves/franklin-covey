import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { prismaMock } from "@/lib/__mocks__/db";

vi.mock("@/lib/server/session", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/server/session")>();
  return {
    ...real,
    readParticipantSession: vi.fn(),
  };
});

vi.mock("@/lib/server/participant-coach-service", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/server/participant-coach-service")>();
  return {
    ...real,
    getSessionContext: vi.fn(),
    listCoachPool: vi.fn(),
    toParticipantCoachCards: vi.fn(async (coaches) =>
      coaches.map((c: { id: string; bookingLinkPrimary?: string }) => ({
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
        meetingBookingUrl: c.bookingLinkPrimary,
        quotes: [],
      }))
    ),
  };
});

import { readParticipantSession } from "@/lib/server/session";
import { getSessionContext, listCoachPool } from "@/lib/server/participant-coach-service";
import { buildCoachProfileBundle } from "@/__tests__/factories";

const mockReadSession = vi.mocked(readParticipantSession);
const mockGetContext = vi.mocked(getSessionContext);
const mockListPool = vi.mocked(listCoachPool);

const { POST } = await import("./route");

const validSession = {
  participantId: "p1",
  engagementId: "e1",
  organizationId: "org-1",
  cohortId: "c1",
  email: "test@gov.com",
  shownCoachIds: ["coach-1"],
  remixUsed: false,
  currentBatchIds: ["coach-1"],
};

function buildPostRequest(body: Record<string, unknown> = {}) {
  return new NextRequest("http://localhost/api/participant/coaches/select", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/participant/coaches/select", () => {
  beforeEach(() => {
    mockReadSession.mockReturnValue(validSession);
    mockGetContext.mockResolvedValue({
      id: "e1",
      status: "INVITED",
      organizationId: "org-1",
      cohort: { id: "c1", coachSelectionEnd: new Date("2099-12-31") },
      program: { id: "program-1", pool: "MLP_ALP" },
    } as never);

    // Mock $transaction to execute the callback
    prismaMock.$transaction.mockImplementation(
      async (fn: (tx: typeof prismaMock) => Promise<unknown>) => fn(prismaMock)
    );

    // Mock engagement lookup inside transaction
    prismaMock.engagement.findFirst.mockResolvedValue({
      id: "e1",
      participantId: "p1",
      organizationId: "org-1",
      status: "INVITED",
      statusVersion: 1,
      program: { id: "program-1", pool: "MLP_ALP" },
    } as never);

    // Mock coach lookup inside transaction
    prismaMock.organizationCoach.findFirst.mockResolvedValue({
      id: "coach-1",
      organizationId: "org-1",
      maxEngagements: 20,
    } as never);

    // Mock advisory lock
    prismaMock.$queryRaw.mockResolvedValue([{ locked: true }] as never);

    // Mock capacity count
    prismaMock.engagement.count.mockResolvedValue(5);

    // Mock updateMany (successful selection)
    prismaMock.engagement.updateMany.mockResolvedValue({ count: 1 } as never);

    // Mock listCoachPool for post-selection coach fetch
    mockListPool.mockResolvedValue([
      buildCoachProfileBundle({ id: "coach-1", bookingLinkPrimary: "https://calendly.com/test" }),
    ] as never);
  });

  it("returns success with coach and bookingUrl for valid selection", async () => {
    const response = await POST(buildPostRequest({ coachId: "coach-1" }));
    const body = await response.json();

    expect(body.success).toBe(true);
    expect(body.coach).toBeDefined();
    expect(body.coach.id).toBe("coach-1");
    expect(body.bookingUrl).toBe("https://calendly.com/test");
  });

  it("returns INVALID_SESSION when no session cookie", async () => {
    mockReadSession.mockReturnValue(null);

    const response = await POST(buildPostRequest({ coachId: "coach-1" }));
    const body = await response.json();

    expect(body.success).toBe(false);
    expect(body.error).toBe("INVALID_SESSION");
  });

  it("returns WINDOW_CLOSED when selection window is past", async () => {
    mockGetContext.mockResolvedValue({
      id: "e1",
      status: "INVITED",
      organizationId: "org-1",
      cohort: { id: "c1", coachSelectionEnd: new Date("2020-01-01") },
      program: { id: "program-1", pool: "MLP_ALP" },
    } as never);

    const response = await POST(buildPostRequest({ coachId: "coach-1" }));
    const body = await response.json();

    expect(body.success).toBe(false);
    expect(body.error).toBe("WINDOW_CLOSED");
  });

  it("returns ALREADY_SELECTED when engagement is not INVITED", async () => {
    prismaMock.engagement.findFirst.mockResolvedValue({
      id: "e1",
      participantId: "p1",
      organizationId: "org-1",
      status: "COACH_SELECTED",
      statusVersion: 1,
      program: { id: "program-1", pool: "MLP_ALP" },
    } as never);

    const response = await POST(buildPostRequest({ coachId: "coach-1" }));
    const body = await response.json();

    expect(body.success).toBe(false);
    expect(body.error).toBe("ALREADY_SELECTED");
  });

  it("returns CAPACITY_FULL when lock contention (advisory lock fails)", async () => {
    prismaMock.$queryRaw.mockResolvedValue([{ locked: false }] as never);

    const response = await POST(buildPostRequest({ coachId: "coach-1" }));
    const body = await response.json();

    expect(body.success).toBe(false);
    expect(body.error).toBe("CAPACITY_FULL");
  });

  it("returns CAPACITY_FULL for missing/invalid request body", async () => {
    const req = new NextRequest("http://localhost/api/participant/coaches/select", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "not json",
    });

    const response = await POST(req);
    const body = await response.json();

    expect(body.success).toBe(false);
    expect(body.error).toBe("CAPACITY_FULL");
  });
});
