import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { prismaMock } from "@/lib/__mocks__/db";

vi.mock("@/lib/server/session", () => ({
  readPortalSession: vi.fn(),
}));

vi.mock("@/lib/server/admin-scope", () => ({
  resolveAdminOrgScope: vi.fn(),
}));

import { readPortalSession } from "@/lib/server/session";
import { resolveAdminOrgScope } from "@/lib/server/admin-scope";

const mockReadPortalSession = vi.mocked(readPortalSession);
const mockResolveAdminOrgScope = vi.mocked(resolveAdminOrgScope);

const { GET } = await import("./route");

describe("GET /api/admin/coaches", () => {
  beforeEach(() => {
    mockReadPortalSession.mockReturnValue({
      userId: "admin-1",
      email: "admin@test.gov",
      role: "ADMIN",
    });
    mockResolveAdminOrgScope.mockResolvedValue("org-usps");
  });

  it("returns 401 when session is missing", async () => {
    mockReadPortalSession.mockReturnValue(null);
    const request = new NextRequest("http://localhost/api/admin/coaches");
    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it("returns USPS-scoped coach utilization list", async () => {
    prismaMock.organizationCoach.findMany.mockResolvedValue([
      {
        id: "oc-1",
        active: true,
        maxEngagements: 20,
        updatedAt: new Date("2026-02-28T00:00:00.000Z"),
        coachProfile: {
          id: "coach-1",
          displayName: "Coach One",
          user: {
            email: "coach1@test.gov",
          },
        },
        poolMemberships: [{ pool: "MLP_ALP" }],
        _count: {
          engagements: 8,
        },
      },
    ] as never);

    const request = new NextRequest("http://localhost/api/admin/coaches");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.items).toHaveLength(1);
    expect(body.items[0]).toMatchObject({
      coachId: "coach-1",
      organizationCoachId: "oc-1",
      name: "Coach One",
      email: "coach1@test.gov",
      current: 8,
      max: 20,
      utilizationPct: 40,
    });
  });
});
