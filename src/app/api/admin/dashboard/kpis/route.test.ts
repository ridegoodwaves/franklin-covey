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

describe("GET /api/admin/dashboard/kpis", () => {
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
    const request = new NextRequest("http://localhost/api/admin/dashboard/kpis");
    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it("returns KPI counts, completionRate, and program breakdown", async () => {
    (prismaMock.engagement.groupBy as unknown as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([
        { status: "INVITED", _count: { _all: 2 } },
        { status: "COACH_SELECTED", _count: { _all: 1 } },
        { status: "IN_PROGRESS", _count: { _all: 4 } },
        { status: "ON_HOLD", _count: { _all: 1 } },
        { status: "COMPLETED", _count: { _all: 2 } },
        { status: "CANCELED", _count: { _all: 0 } },
      ] as never)
      .mockResolvedValueOnce([
        { programId: "p-1", status: "COMPLETED", _count: { _all: 2 } },
        { programId: "p-1", status: "IN_PROGRESS", _count: { _all: 3 } },
      ] as never);

    prismaMock.program.findMany.mockResolvedValue([
      { id: "p-1", code: "ALP" },
    ] as never);
    prismaMock.engagement.count.mockResolvedValue(3);

    const request = new NextRequest("http://localhost/api/admin/dashboard/kpis");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.total).toBe(10);
    expect(body.needsAttention).toBe(3);
    expect(body.completionRate).toBe(20);
    expect(body.programBreakdown).toEqual([
      {
        programCode: "ALP",
        total: 5,
        completed: 2,
        completionRate: 40,
      },
    ]);
  });
});
