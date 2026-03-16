import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { prismaMock } from "@/lib/__mocks__/db";

vi.mock("@/lib/server/session", () => ({
  readPortalSession: vi.fn(),
  clearPortalSession: vi.fn(),
}));

vi.mock("@/lib/server/coach-scope", () => ({
  resolveCoachScope: vi.fn(),
  CoachScopeError: class extends Error {
    code: "COACH_PROFILE_NOT_FOUND" | "COACH_ACCESS_DISABLED";

    constructor(code: "COACH_PROFILE_NOT_FOUND" | "COACH_ACCESS_DISABLED") {
      super(code);
      this.code = code;
    }
  },
}));

import { readPortalSession } from "@/lib/server/session";
import { resolveCoachScope } from "@/lib/server/coach-scope";

const mockReadPortalSession = vi.mocked(readPortalSession);
const mockResolveCoachScope = vi.mocked(resolveCoachScope);

const { POST } = await import("./route");

function buildRequest(body: object) {
  return new NextRequest("http://localhost/api/coach/sessions", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
    },
  });
}

function mockBaseCreateDeps() {
  prismaMock.$executeRaw.mockResolvedValue(1 as never);
  prismaMock.engagement.findFirst.mockResolvedValue({
    id: "eng-1",
    status: "COACH_SELECTED",
    statusVersion: 2,
    totalSessions: 2,
    program: { code: "ALP" },
  } as never);
  prismaMock.session.aggregate.mockResolvedValue({
    _max: {
      sessionNumber: null,
    },
  } as never);
}

describe("POST /api/coach/sessions", () => {
  beforeEach(() => {
    mockReadPortalSession.mockReturnValue({
      userId: "coach-user-1",
      email: "coach@test.gov",
      role: "COACH",
    });
    mockResolveCoachScope.mockResolvedValue({
      coachProfileId: "cp-1",
      organizationCoachId: "oc-1",
      organizationId: "org-1",
    });

    prismaMock.$transaction.mockImplementation(async (fn) => {
      if (typeof fn === "function") {
        return fn(prismaMock as never);
      }
      return fn;
    });
  });

  it("returns 401 for missing session", async () => {
    mockReadPortalSession.mockReturnValue(null);
    const response = await POST(buildRequest({}));
    expect(response.status).toBe(401);
  });

  it("creates a first session and returns 201", async () => {
    mockBaseCreateDeps();
    prismaMock.session.create.mockResolvedValue({
      id: "s-1",
      engagementId: "eng-1",
      sessionNumber: 1,
      status: "COMPLETED",
      occurredAt: new Date("2026-03-01T12:00:00.000Z"),
      topic: "Developing People",
      outcomes: JSON.stringify(["Action plan created", "Resources provided"]),
      nextSteps: "Next session scheduled",
      engagementLevel: 4,
      actionCommitment: "Last session's action(s) completed",
      notes: "note",
      createdAt: new Date("2026-03-01T12:00:00.000Z"),
      updatedAt: new Date("2026-03-01T12:00:00.000Z"),
      createdBy: null,
      updatedBy: null,
      archivedAt: null,
    } as never);
    prismaMock.engagement.updateMany.mockResolvedValue({ count: 1 } as never);

    const response = await POST(
      buildRequest({
        engagementId: "eng-1",
        status: "COMPLETED",
        occurredAt: "2026-03-01T12:00:00.000Z",
        topic: "Developing People",
        outcomes: ["Action plan created", "Resources provided"],
        nextSteps: "Next session scheduled",
        engagementLevel: 4,
        actionCommitment: "Last session's action(s) completed",
        notes: "note",
      })
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.item.id).toBe("s-1");
    expect(body.item.sessionNumber).toBe(1);
    expect(body.item.outcomes).toEqual(["Action plan created", "Resources provided"]);
  });

  it("returns 422 for empty outcomes array", async () => {
    mockBaseCreateDeps();

    const response = await POST(
      buildRequest({
        engagementId: "eng-1",
        status: "COMPLETED",
        occurredAt: "2026-03-01T12:00:00.000Z",
        topic: "Developing People",
        outcomes: [],
        nextSteps: "Next session scheduled",
        engagementLevel: 3,
        actionCommitment: "Last session's action(s) completed",
      })
    );

    expect(response.status).toBe(422);
  });

  it("returns 422 for duplicate outcomes", async () => {
    mockBaseCreateDeps();

    const response = await POST(
      buildRequest({
        engagementId: "eng-1",
        status: "COMPLETED",
        occurredAt: "2026-03-01T12:00:00.000Z",
        topic: "Developing People",
        outcomes: ["Action plan created", "Action plan created"],
        nextSteps: "Next session scheduled",
        engagementLevel: 3,
        actionCommitment: "Last session's action(s) completed",
      })
    );

    expect(response.status).toBe(422);
  });

  it("returns 422 for invalid outcome value", async () => {
    mockBaseCreateDeps();

    const response = await POST(
      buildRequest({
        engagementId: "eng-1",
        status: "COMPLETED",
        occurredAt: "2026-03-01T12:00:00.000Z",
        topic: "Developing People",
        outcomes: ["In Progress"],
        nextSteps: "Next session scheduled",
        engagementLevel: 3,
        actionCommitment: "Last session's action(s) completed",
      })
    );

    expect(response.status).toBe(422);
  });

  it("returns 422 when action commitment is missing on completed session", async () => {
    mockBaseCreateDeps();

    const response = await POST(
      buildRequest({
        engagementId: "eng-1",
        status: "COMPLETED",
        occurredAt: "2026-03-01T12:00:00.000Z",
        topic: "Developing People",
        outcomes: ["Action plan created"],
        nextSteps: "Next session scheduled",
        engagementLevel: 3,
      })
    );

    expect(response.status).toBe(422);
  });

  it("returns 422 for invalid action commitment value", async () => {
    mockBaseCreateDeps();

    const response = await POST(
      buildRequest({
        engagementId: "eng-1",
        status: "COMPLETED",
        occurredAt: "2026-03-01T12:00:00.000Z",
        topic: "Developing People",
        outcomes: ["Action plan created"],
        nextSteps: "Next session scheduled",
        engagementLevel: 3,
        actionCommitment: "Completed",
      })
    );

    expect(response.status).toBe(422);
  });

  it("returns 409 when all sessions are already logged", async () => {
    prismaMock.$executeRaw.mockResolvedValue(1 as never);
    prismaMock.engagement.findFirst.mockResolvedValue({
      id: "eng-1",
      status: "IN_PROGRESS",
      statusVersion: 3,
      totalSessions: 2,
      program: { code: "ALP" },
    } as never);
    prismaMock.session.aggregate.mockResolvedValue({
      _max: {
        sessionNumber: 2,
      },
    } as never);

    const response = await POST(
      buildRequest({
        engagementId: "eng-1",
        status: "COMPLETED",
        occurredAt: "2026-03-01T12:00:00.000Z",
        topic: "Developing People",
        outcomes: ["Action plan created"],
        nextSteps: "Next session scheduled",
        engagementLevel: 3,
        actionCommitment: "Last session's action(s) completed",
      })
    );

    expect(response.status).toBe(409);
  });
});
