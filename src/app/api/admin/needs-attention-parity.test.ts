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
  buildNeedsAttentionWhere: vi.fn(() => ({ OR: [{ status: "IN_PROGRESS" }] })),
}));

import { readPortalSession } from "@/lib/server/session";
import { resolveAdminOrgScope } from "@/lib/server/admin-scope";

const mockReadPortalSession = vi.mocked(readPortalSession);
const mockResolveAdminOrgScope = vi.mocked(resolveAdminOrgScope);

const { GET: getKpis } = await import("./dashboard/kpis/route");
const { GET: getEngagements } = await import("./engagements/route");

describe("needs-attention parity across KPI and engagements tab", () => {
  beforeEach(() => {
    mockReadPortalSession.mockReturnValue({
      userId: "admin-1",
      email: "admin@test.gov",
      role: "ADMIN",
    });
    mockResolveAdminOrgScope.mockResolvedValue("org-usps");
  });

  it("returns matching needs-attention count and tab total", async () => {
    (prismaMock.engagement.groupBy as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([
        { status: "INVITED", _count: { _all: 1 } },
        { status: "IN_PROGRESS", _count: { _all: 2 } },
      ] as never)
      .mockResolvedValueOnce([
        { programId: "p-1", status: "IN_PROGRESS", _count: { _all: 2 } },
      ] as never);

    prismaMock.program.findMany.mockResolvedValue([
      { id: "p-1", code: "ALP" },
    ] as never);

    prismaMock.engagement.count
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(2);

    prismaMock.engagement.findMany.mockResolvedValueOnce([
      {
        id: "eng-1",
        status: "IN_PROGRESS",
        totalSessions: 2,
        coachSelectedAt: null,
        lastActivityAt: new Date("2026-02-10T00:00:00.000Z"),
        organizationCoachId: "oc-1",
        participant: { email: "p1@test.gov" },
        program: { code: "ALP" },
        cohort: { code: "ALP-135" },
        organizationCoach: { id: "oc-1", coachProfile: { displayName: "Coach One" } },
        _count: { sessions: 1 },
      },
      {
        id: "eng-2",
        status: "IN_PROGRESS",
        totalSessions: 2,
        coachSelectedAt: null,
        lastActivityAt: new Date("2026-02-09T00:00:00.000Z"),
        organizationCoachId: "oc-2",
        participant: { email: "p2@test.gov" },
        program: { code: "ALP" },
        cohort: { code: "ALP-135" },
        organizationCoach: { id: "oc-2", coachProfile: { displayName: "Coach Two" } },
        _count: { sessions: 0 },
      },
    ] as never);

    const kpiResponse = await getKpis(
      new NextRequest("http://localhost/api/admin/dashboard/kpis")
    );
    const kpiBody = await kpiResponse.json();

    const tableResponse = await getEngagements(
      new NextRequest(
        "http://localhost/api/admin/engagements?tab=needs_attention&sort=days_desc&page=1"
      )
    );
    const tableBody = await tableResponse.json();

    expect(kpiResponse.status).toBe(200);
    expect(tableResponse.status).toBe(200);
    expect(kpiBody.needsAttention).toBe(tableBody.totalItems);
    expect(tableBody.items).toHaveLength(2);
    expect(tableBody.items.every((item: { needsAttention: boolean }) => item.needsAttention)).toBe(true);
  });
});
