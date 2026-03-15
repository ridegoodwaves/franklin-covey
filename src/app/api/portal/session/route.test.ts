import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/server/session", () => ({
  readPortalSession: vi.fn(),
}));

import { readPortalSession } from "@/lib/server/session";

const mockReadPortalSession = vi.mocked(readPortalSession);

const { GET } = await import("./route");

describe("GET /api/portal/session", () => {
  it("returns 401 when no portal session exists", async () => {
    mockReadPortalSession.mockReturnValue(null);

    const request = new NextRequest("http://localhost/api/portal/session");
    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  it("returns current portal identity when session exists", async () => {
    mockReadPortalSession.mockReturnValue({
      userId: "user-1",
      email: "amit@onusleadership.com",
      role: "ADMIN",
    });

    const request = new NextRequest("http://localhost/api/portal/session");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      userId: "user-1",
      email: "amit@onusleadership.com",
      role: "ADMIN",
    });
  });
});
