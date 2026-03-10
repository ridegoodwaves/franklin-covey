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

describe("GET /api/coach/engagements/[id]", () => {
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

  it("returns 404 when engagement is not found", async () => {
    prismaMock.engagement.findFirst.mockResolvedValue(null);
    const response = await GET(new NextRequest("http://localhost/api/coach/engagements/eng-1"), {
      params: Promise.resolve({ id: "eng-1" }),
    });
    expect(response.status).toBe(404);
  });

  it("returns engagement detail", async () => {
    prismaMock.engagement.findFirst.mockResolvedValue({
      id: "eng-1",
      status: "IN_PROGRESS",
      totalSessions: 5,
      coachSelectedAt: new Date("2026-01-20T00:00:00.000Z"),
      lastActivityAt: new Date("2026-03-01T00:00:00.000Z"),
      participant: { email: "participant@test.gov" },
      organization: { name: "USPS" },
      cohort: { code: "ALP-135" },
      program: { code: "ALP", name: "Advanced Leadership Program", track: "TWO_SESSION" },
      organizationCoach: { coachProfile: { bookingLinkPrimary: "https://calendly.com/coach" } },
      _count: { sessions: 2 },
    } as never);

    const response = await GET(new NextRequest("http://localhost/api/coach/engagements/eng-1"), {
      params: Promise.resolve({ id: "eng-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.item.engagementId).toBe("eng-1");
    expect(body.item.participantEmail).toBe("participant@test.gov");
    expect(body.item.meetingBookingUrl).toBe("https://calendly.com/coach");
  });
});
