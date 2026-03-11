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

const { PATCH } = await import("./route");

function buildRequest(body: object) {
  return new NextRequest("http://localhost/api/coach/sessions/s-1", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
    },
  });
}

describe("PATCH /api/coach/sessions/[id]", () => {
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
  });

  it("rejects status field in payload", async () => {
    const response = await PATCH(buildRequest({ status: "COMPLETED" }), {
      params: Promise.resolve({ id: "s-1" }),
    });
    expect(response.status).toBe(422);
  });

  it("updates whitelisted fields", async () => {
    prismaMock.session.findFirst
      .mockResolvedValueOnce({
        id: "s-1",
        engagementId: "eng-1",
        sessionNumber: 1,
        status: "COMPLETED",
        occurredAt: new Date("2026-03-01T12:00:00.000Z"),
        topic: "Developing People",
        outcome: "In Progress",
        durationMinutes: 60,
        privateNotes: "old",
        createdAt: new Date("2026-03-01T12:00:00.000Z"),
        updatedAt: new Date("2026-03-01T12:00:00.000Z"),
        engagement: { program: { code: "ALP" } },
      } as never)
      .mockResolvedValueOnce({
        id: "s-1",
        engagementId: "eng-1",
        sessionNumber: 1,
        status: "COMPLETED",
        occurredAt: new Date("2026-03-01T12:00:00.000Z"),
        topic: "Developing People",
        outcome: "Goal Achieved",
        durationMinutes: 60,
        privateNotes: "new note",
        createdAt: new Date("2026-03-01T12:00:00.000Z"),
        updatedAt: new Date("2026-03-02T12:00:00.000Z"),
        createdBy: null,
        updatedBy: null,
        archivedAt: null,
      } as never);
    prismaMock.session.updateMany.mockResolvedValue({ count: 1 } as never);
    prismaMock.engagement.updateMany.mockResolvedValue({ count: 1 } as never);

    const response = await PATCH(
      buildRequest({
        outcome: "Goal Achieved",
        privateNotes: "new note",
      }),
      { params: Promise.resolve({ id: "s-1" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.item.id).toBe("s-1");
    expect(body.item.outcome).toBe("Goal Achieved");
    expect(prismaMock.engagement.updateMany).toHaveBeenCalledTimes(1);
  });

  it("returns 409 when update conflict occurs", async () => {
    prismaMock.session.findFirst.mockResolvedValue({
      id: "s-1",
      engagementId: "eng-1",
      sessionNumber: 1,
      status: "COMPLETED",
      occurredAt: new Date("2026-03-01T12:00:00.000Z"),
      topic: "Developing People",
      outcome: "In Progress",
      durationMinutes: 60,
      privateNotes: "old",
      createdAt: new Date("2026-03-01T12:00:00.000Z"),
      updatedAt: new Date("2026-03-01T12:00:00.000Z"),
      engagement: { program: { code: "ALP" } },
    } as never);
    prismaMock.session.updateMany.mockResolvedValue({ count: 0 } as never);

    const response = await PATCH(
      buildRequest({
        outcome: "Goal Achieved",
      }),
      { params: Promise.resolve({ id: "s-1" }) }
    );

    expect(response.status).toBe(409);
    expect(prismaMock.engagement.updateMany).not.toHaveBeenCalled();
  });
});
