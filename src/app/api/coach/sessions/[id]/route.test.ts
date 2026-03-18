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

function completedSession() {
  return {
    id: "s-1",
    engagementId: "eng-1",
    sessionNumber: 1,
    status: "COMPLETED",
    occurredAt: new Date("2026-03-01T12:00:00.000Z"),
    topic: "Developing People",
    outcomes: JSON.stringify(["Action plan created"]),
    nextSteps: "Next session scheduled",
    engagementLevel: 3,
    actionCommitment: "Last session's action(s) completed",
    notes: "old",
    createdAt: new Date("2026-03-01T12:00:00.000Z"),
    updatedAt: new Date("2026-03-01T12:00:00.000Z"),
    engagement: { program: { code: "ALP" } },
  };
}

function forfeitedSession() {
  return {
    id: "s-1",
    engagementId: "eng-1",
    sessionNumber: 1,
    status: "FORFEITED_CANCELLED",
    occurredAt: null,
    topic: null,
    outcomes: null,
    nextSteps: null,
    engagementLevel: null,
    actionCommitment: null,
    notes: "old",
    createdAt: new Date("2026-03-01T12:00:00.000Z"),
    updatedAt: new Date("2026-03-01T12:00:00.000Z"),
    engagement: { program: { code: "ALP" } },
  };
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

  it("rejects empty payload", async () => {
    const response = await PATCH(buildRequest({}), {
      params: Promise.resolve({ id: "s-1" }),
    });
    expect(response.status).toBe(422);
  });

  it("rejects unknown fields", async () => {
    const response = await PATCH(buildRequest({ foo: "bar" }), {
      params: Promise.resolve({ id: "s-1" }),
    });
    expect(response.status).toBe(422);
  });

  it("updates outcomes array and notes", async () => {
    prismaMock.session.findFirst
      .mockResolvedValueOnce(completedSession() as never)
      .mockResolvedValueOnce({
        ...completedSession(),
        outcomes: JSON.stringify(["Action plan created", "Resources provided"]),
        notes: "new note",
        updatedAt: new Date("2026-03-02T12:00:00.000Z"),
        createdBy: null,
        updatedBy: null,
        archivedAt: null,
      } as never);
    prismaMock.session.updateMany.mockResolvedValue({ count: 1 } as never);
    prismaMock.engagement.updateMany.mockResolvedValue({ count: 1 } as never);

    const response = await PATCH(
      buildRequest({
        outcomes: ["Resources provided", "Action plan created"],
        notes: "new note",
      }),
      { params: Promise.resolve({ id: "s-1" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.item.outcomes).toEqual(["Action plan created", "Resources provided"]);
    expect(prismaMock.engagement.updateMany).toHaveBeenCalledTimes(1);
  });

  it("rejects outcomes for forfeited sessions when non-null", async () => {
    prismaMock.session.findFirst.mockResolvedValue(forfeitedSession() as never);

    const response = await PATCH(
      buildRequest({ outcomes: ["Action plan created"] }),
      { params: Promise.resolve({ id: "s-1" }) }
    );

    expect(response.status).toBe(422);
  });

  it("rejects actionCommitment for forfeited sessions when non-null", async () => {
    prismaMock.session.findFirst.mockResolvedValue(forfeitedSession() as never);

    const response = await PATCH(
      buildRequest({ actionCommitment: "Last session's action(s) completed" }),
      { params: Promise.resolve({ id: "s-1" }) }
    );

    expect(response.status).toBe(422);
  });

  it("rejects forfeited payload with outcomes [] and nextSteps empty string", async () => {
    prismaMock.session.findFirst.mockResolvedValue(forfeitedSession() as never);

    const response = await PATCH(
      buildRequest({ outcomes: [], nextSteps: "" }),
      { params: Promise.resolve({ id: "s-1" }) }
    );

    expect(response.status).toBe(422);
  });

  it("accepts forfeited payload with null fields", async () => {
    prismaMock.session.findFirst
      .mockResolvedValueOnce(forfeitedSession() as never)
      .mockResolvedValueOnce({
        ...forfeitedSession(),
        notes: "new note",
        updatedAt: new Date("2026-03-02T12:00:00.000Z"),
        createdBy: null,
        updatedBy: null,
        archivedAt: null,
      } as never);
    prismaMock.session.updateMany.mockResolvedValue({ count: 1 } as never);
    prismaMock.engagement.updateMany.mockResolvedValue({ count: 1 } as never);

    const response = await PATCH(
      buildRequest({
        outcomes: null,
        nextSteps: null,
        engagementLevel: null,
        actionCommitment: null,
        notes: "new note",
      }),
      { params: Promise.resolve({ id: "s-1" }) }
    );

    expect(response.status).toBe(200);
  });

  it("returns 422 for no-op payload with unchanged values", async () => {
    prismaMock.session.findFirst.mockResolvedValue(completedSession() as never);

    const response = await PATCH(
      buildRequest({ notes: "old" }),
      { params: Promise.resolve({ id: "s-1" }) }
    );

    expect(response.status).toBe(422);
    expect(prismaMock.engagement.updateMany).not.toHaveBeenCalled();
  });

  it("returns 409 when update conflict occurs", async () => {
    prismaMock.session.findFirst.mockResolvedValue(completedSession() as never);
    prismaMock.session.updateMany.mockResolvedValue({ count: 0 } as never);

    const response = await PATCH(
      buildRequest({ notes: "new note" }),
      { params: Promise.resolve({ id: "s-1" }) }
    );

    expect(response.status).toBe(409);
    expect(prismaMock.engagement.updateMany).not.toHaveBeenCalled();
  });
});
