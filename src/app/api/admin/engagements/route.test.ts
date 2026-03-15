import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { prismaMock } from "@/lib/__mocks__/db";

vi.mock("@/lib/server/session", () => ({
  readPortalSession: vi.fn(),
}));

vi.mock("@/lib/server/admin-scope", () => ({
  resolveAdminOrgScope: vi.fn(),
}));

vi.mock("@/lib/needs-attention", () => ({
  buildNeedsAttentionWhere: vi.fn(() => ({ OR: [] })),
}));

import { readPortalSession } from "@/lib/server/session";
import { resolveAdminOrgScope } from "@/lib/server/admin-scope";

const mockReadPortalSession = vi.mocked(readPortalSession);
const mockResolveAdminOrgScope = vi.mocked(resolveAdminOrgScope);

const { GET } = await import("./route");

describe("GET /api/admin/engagements", () => {
  beforeEach(() => {
    mockReadPortalSession.mockReturnValue({
      userId: "admin-1",
      email: "admin@test.gov",
      role: "ADMIN",
    });
    mockResolveAdminOrgScope.mockResolvedValue("org-usps");
  });

  it("returns 401 when unauthenticated", async () => {
    mockReadPortalSession.mockReturnValue(null);
    const request = new NextRequest("http://localhost/api/admin/engagements");
    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it("returns paginated rows with email-only search filters", async () => {
    prismaMock.engagement.count.mockResolvedValue(1);
    prismaMock.engagement.findMany
      .mockResolvedValueOnce([
        {
          id: "eng-1",
          status: "IN_PROGRESS",
          totalSessions: 2,
          coachSelectedAt: new Date("2026-02-01T00:00:00.000Z"),
          lastActivityAt: new Date("2026-02-10T00:00:00.000Z"),
          organizationCoachId: "oc-1",
          participant: { email: "participant1@test.gov" },
          program: { code: "ALP" },
          cohort: { code: "ALP-135" },
          organizationCoach: { id: "oc-1", coachProfile: { displayName: "Coach One" } },
          _count: { sessions: 1 },
        },
      ] as never)
      .mockResolvedValueOnce([{ id: "eng-1" }] as never);

    const request = new NextRequest(
      "http://localhost/api/admin/engagements?search=participant1@test.gov&page=1&sort=coach&tab=all"
    );
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.items).toHaveLength(1);
    expect(body.items[0].participantEmail).toBe("participant1@test.gov");
    expect(body.items[0].coachName).toBe("Coach One");
    expect(body.sort).toBe("coach");
    expect(body.tab).toBe("all");
    expect(body.totalItems).toBe(1);
    expect(body.totalPages).toBe(1);
  });

  it("returns empty pagination state when filters match no engagements", async () => {
    prismaMock.engagement.count.mockResolvedValue(0);
    prismaMock.engagement.findMany.mockResolvedValue([] as never);

    const request = new NextRequest(
      "http://localhost/api/admin/engagements?search=none@test.gov&page=1&sort=days_desc&tab=all"
    );
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.items).toEqual([]);
    expect(body.page).toBe(1);
    expect(body.totalItems).toBe(0);
    expect(body.totalPages).toBe(1);
  });
});
