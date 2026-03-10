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
    prismaMock.session.create.mockResolvedValue({
      id: "s-1",
      engagementId: "eng-1",
      sessionNumber: 1,
      status: "COMPLETED",
      occurredAt: new Date("2026-03-01T12:00:00.000Z"),
      topic: "Developing People",
      outcome: "In Progress",
      durationMinutes: 60,
      privateNotes: "note",
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
        outcome: "In Progress",
        durationMinutes: 60,
        privateNotes: "note",
      })
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.item.id).toBe("s-1");
    expect(body.item.sessionNumber).toBe(1);
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
        outcome: "In Progress",
        durationMinutes: 60,
      })
    );

    expect(response.status).toBe(409);
  });
});
