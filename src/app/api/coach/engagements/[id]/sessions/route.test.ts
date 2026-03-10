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

const { GET } = await import("./route");

describe("GET /api/coach/engagements/[id]/sessions", () => {
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

  it("returns ordered sessions", async () => {
    prismaMock.engagement.findFirst.mockResolvedValue({
      id: "eng-1",
      totalSessions: 5,
      sessions: [
        {
          id: "s-1",
          sessionNumber: 1,
          status: "COMPLETED",
          occurredAt: new Date("2026-02-01T10:00:00.000Z"),
          topic: "Driving Unit Performance",
          outcome: "In Progress",
          durationMinutes: 60,
          privateNotes: "note-1",
          createdAt: new Date("2026-02-01T10:30:00.000Z"),
          updatedAt: new Date("2026-02-01T10:30:00.000Z"),
          engagementId: "eng-1",
          createdBy: null,
          updatedBy: null,
          archivedAt: null,
        },
      ],
    } as never);

    const response = await GET(
      new NextRequest("http://localhost/api/coach/engagements/eng-1/sessions"),
      { params: Promise.resolve({ id: "eng-1" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.engagementId).toBe("eng-1");
    expect(body.items).toHaveLength(1);
    expect(body.items[0].sessionNumber).toBe(1);
  });
});
