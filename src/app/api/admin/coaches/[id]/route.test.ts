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

const { PATCH } = await import("./route");

function buildPatchRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/admin/coaches/oc-1", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/admin/coaches/:id", () => {
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
    const response = await PATCH(buildPatchRequest({}), {
      params: Promise.resolve({ id: "oc-1" }),
    });
    expect(response.status).toBe(401);
  });

  it("returns 409 when optimistic lock precondition fails", async () => {
    prismaMock.organizationCoach.updateMany.mockResolvedValue({ count: 0 } as never);

    const response = await PATCH(
      buildPatchRequest({
        maxEngagements: 25,
        active: true,
        updatedAt: "2026-02-28T00:00:00.000Z",
      }),
      {
        params: Promise.resolve({ id: "oc-1" }),
      }
    );

    expect(response.status).toBe(409);
  });
});
