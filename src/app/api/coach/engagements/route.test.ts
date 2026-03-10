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

describe("GET /api/coach/engagements", () => {
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
        daysOverdue: 2,
      },
    ]);
  });

  it("returns 401 when unauthenticated", async () => {
    mockReadPortalSession.mockReturnValue(null);
    const response = await GET(new NextRequest("http://localhost/api/coach/engagements"));
    expect(response.status).toBe(401);
  });

  it("returns active engagements page", async () => {
    prismaMock.engagement.count.mockResolvedValue(1);
    prismaMock.engagement.findMany.mockResolvedValue([
      {
        id: "eng-1",
        status: "IN_PROGRESS",
        totalSessions: 5,
        lastActivityAt: new Date("2026-03-01T12:00:00.000Z"),
        participant: { email: "participant@test.gov" },
        cohort: { code: "ALP-135" },
        program: { code: "ALP", track: "TWO_SESSION" },
        organizationCoach: {
          coachProfile: {
            bookingLinkPrimary: "https://calendly.com/coach",
          },
        },
        sessions: [
          {
            occurredAt: new Date("2026-02-28T10:00:00.000Z"),
            createdAt: new Date("2026-02-28T10:00:00.000Z"),
          },
        ],
        _count: { sessions: 2 },
      },
    ] as never);

    const response = await GET(
      new NextRequest("http://localhost/api/coach/engagements?tab=active&page=1")
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.items).toHaveLength(1);
    expect(body.items[0].engagementId).toBe("eng-1");
    expect(body.items[0].needsAttention).toBe(true);
    expect(body.items[0].meetingBookingUrl).toBe("https://calendly.com/coach");
    expect(body.tab).toBe("active");
    expect(body.page).toBe(1);
  });
});
