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

vi.mock("@/lib/needs-attention", () => ({
  getCoachNeedsAttentionEngagements: vi.fn(),
}));

import { readPortalSession } from "@/lib/server/session";
import { resolveCoachScope } from "@/lib/server/coach-scope";
import { getCoachNeedsAttentionEngagements } from "@/lib/needs-attention";

const mockReadPortalSession = vi.mocked(readPortalSession);
const mockResolveCoachScope = vi.mocked(resolveCoachScope);
const mockGetCoachNeedsAttentionEngagements = vi.mocked(getCoachNeedsAttentionEngagements);

const { GET } = await import("./route");

describe("GET /api/coach/dashboard", () => {
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
    mockGetCoachNeedsAttentionEngagements.mockResolvedValue([
      {
        engagementId: "eng-1",
        participantEmail: "participant@test.gov",
        cohortCode: "ALP-135",
        daysOverdue: 4,
      },
    ]);
  });

  it("returns 401 for missing session", async () => {
    mockReadPortalSession.mockReturnValue(null);
    const response = await GET(new NextRequest("http://localhost/api/coach/dashboard"));
    expect(response.status).toBe(401);
  });

  it("returns dashboard stats", async () => {
    (
      prismaMock.engagement.groupBy as typeof prismaMock.engagement.groupBy & {
        mockResolvedValue: (value: never) => void;
      }
    ).mockResolvedValue([
      { status: "COACH_SELECTED", _count: { _all: 2 } },
      { status: "IN_PROGRESS", _count: { _all: 3 } },
      { status: "COMPLETED", _count: { _all: 5 } },
    ] as never);
    prismaMock.session.count.mockResolvedValue(6);
    prismaMock.coachProfile.findUnique.mockResolvedValue({
      displayName: "Coach Riley",
    } as never);

    const response = await GET(new NextRequest("http://localhost/api/coach/dashboard"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.activeCount).toBe(5);
    expect(body.completedCount).toBe(5);
    expect(body.sessionsThisWeek).toBe(6);
    expect(body.completionRate).toBe(50);
    expect(body.coachName).toBe("Coach Riley");
    expect(body.needsAttention).toHaveLength(1);
  });
});
