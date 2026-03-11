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

describe("GET /api/export", () => {
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
    const request = new NextRequest("http://localhost/api/export?format=csv");
    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  it("returns sanitized CSV with null-safe daysSinceActivity and security headers", async () => {
    prismaMock.engagement.count.mockResolvedValue(1);
    prismaMock.engagement.findMany.mockResolvedValue([
      {
        status: "COACH_SELECTED",
        totalSessions: 2,
        lastActivityAt: null,
        participant: { email: "=danger@example.com" },
        organization: { code: "USPS" },
        program: { code: "ALP" },
        cohort: { code: "ALP-135" },
        organizationCoach: {
          coachProfile: {
            displayName: "Jane Coach",
            firstName: "Jane",
            lastName: "Coach",
            user: { email: "jane@coach.test" },
          },
        },
        _count: { sessions: 0 },
      },
    ] as never);

    const request = new NextRequest(
      "http://localhost/api/export?format=csv&tab=needs_attention&programId=ALP&status=COACH_SELECTED"
    );
    const response = await GET(request);
    const csv = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("x-export-truncated")).toBe("false");
    expect(response.headers.get("x-export-total-rows")).toBe("1");
    expect(response.headers.get("content-type")).toContain("text/csv");
    expect(response.headers.get("content-disposition")).toContain(
      "fc-needs-attention-alp-coach-selected-"
    );
    expect(csv).toContain("\t=danger@example.com");

    const lines = csv.split("\r\n");
    const row = lines[1]?.split(",") ?? [];
    expect(row[row.length - 1]).toBe("");
  });

  it("sanitizes formula payloads that start after leading whitespace", async () => {
    prismaMock.engagement.count.mockResolvedValue(1);
    prismaMock.engagement.findMany.mockResolvedValue([
      {
        status: "INVITED",
        totalSessions: 2,
        lastActivityAt: null,
        participant: { email: " =HYPERLINK(evil)" },
        organization: { code: "USPS" },
        program: { code: "ALP" },
        cohort: { code: "ALP-135" },
        organizationCoach: null,
        _count: { sessions: 0 },
      },
    ] as never);

    const request = new NextRequest("http://localhost/api/export?format=csv");
    const response = await GET(request);
    const csv = await response.text();

    expect(response.status).toBe(200);
    expect(csv).toContain("\t =HYPERLINK(evil)");
  });

  it("adds truncation warning headers when export row cap is exceeded", async () => {
    prismaMock.engagement.count.mockResolvedValue(5001);
    prismaMock.engagement.findMany.mockResolvedValue([] as never);

    const request = new NextRequest("http://localhost/api/export?format=csv");
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("x-export-truncated")).toBe("true");
    expect(response.headers.get("x-export-row-limit")).toBe("5000");
    expect(response.headers.get("x-export-total-rows")).toBe("5001");
    expect(response.headers.get("x-export-warning")).toContain("Truncated to 5000 rows");
  });
});
