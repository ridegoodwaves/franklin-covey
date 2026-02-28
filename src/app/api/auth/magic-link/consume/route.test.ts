import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { prismaMock } from "@/lib/__mocks__/db";
import { buildUser } from "@/__tests__/factories";

// Mock security-guards (one-time consume)
vi.mock("@/lib/server/security-guards", () => ({
  consumeMagicLinkOneTime: vi.fn(async () => true),
}));

import { consumeMagicLinkOneTime } from "@/lib/server/security-guards";
const mockConsumeOneTime = vi.mocked(consumeMagicLinkOneTime);

vi.stubEnv("AUTH_SECRET", "test-secret-minimum-32-characters-long-here");
vi.stubEnv("MAGIC_LINK_TTL_MINUTES", "30");

// We need to create real tokens for consume tests
const { createMagicLinkToken } = await import("@/lib/server/session");
const { GET, POST } = await import("./route");

function createValidToken(overrides: Record<string, unknown> = {}) {
  return createMagicLinkToken({
    userId: "user-1",
    email: "coach@test.gov",
    role: "COACH" as const,
    ...overrides,
  });
}

function buildGetRequest(token: string) {
  const url = new URL("http://localhost/api/auth/magic-link/consume");
  url.searchParams.set("token", token);
  return new NextRequest(url);
}

function buildPostRequest(body: Record<string, unknown> = {}) {
  return new NextRequest("http://localhost/api/auth/magic-link/consume", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/auth/magic-link/consume", () => {
  beforeEach(() => {
    vi.stubEnv("AUTH_SECRET", "test-secret-minimum-32-characters-long-here");
    mockConsumeOneTime.mockResolvedValue(true);

    const user = buildUser({ id: "user-1", email: "coach@test.gov", role: "COACH" });
    prismaMock.user.findFirst.mockResolvedValue(user as never);
  });

  it("sets fc_portal_session cookie and redirects for valid token", async () => {
    const token = createValidToken();
    const response = await GET(buildGetRequest(token));

    expect(response.status).toBe(307); // redirect
    const location = response.headers.get("location") ?? "";
    expect(location).toContain("/coach/dashboard");

    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("fc_portal_session=");
  });

  it("redirects to /auth/signin?error=expired for expired token", async () => {
    vi.useFakeTimers();
    const token = createValidToken();
    vi.advanceTimersByTime(31 * 60 * 1000); // past TTL

    const response = await GET(buildGetRequest(token));
    const location = response.headers.get("location") ?? "";

    expect(location).toContain("/auth/signin");
    expect(location).toContain("error=expired");

    vi.useRealTimers();
  });

  it("redirects to error page for already-consumed token", async () => {
    mockConsumeOneTime.mockResolvedValue(false);

    const token = createValidToken();
    const response = await GET(buildGetRequest(token));
    const location = response.headers.get("location") ?? "";

    expect(location).toContain("/auth/signin");
    expect(location).toContain("error=expired");
  });

  it("redirects to error page for tampered token", async () => {
    const response = await GET(buildGetRequest("tampered.token"));
    const location = response.headers.get("location") ?? "";

    expect(location).toContain("/auth/signin");
    expect(location).toContain("error=expired");
  });

  it("redirects COACH to /coach/dashboard", async () => {
    const token = createValidToken({ role: "COACH" });
    const response = await GET(buildGetRequest(token));
    const location = response.headers.get("location") ?? "";

    expect(location).toContain("/coach/dashboard");
  });

  it("redirects ADMIN to /admin/dashboard", async () => {
    const adminUser = buildUser({ id: "user-1", email: "admin@test.gov", role: "ADMIN" });
    prismaMock.user.findFirst.mockResolvedValue(adminUser as never);

    const token = createValidToken({ role: "ADMIN", email: "admin@test.gov" });
    const response = await GET(buildGetRequest(token));
    const location = response.headers.get("location") ?? "";

    expect(location).toContain("/admin/dashboard");
  });

  it("rejects inactive user (findFirst returns null)", async () => {
    prismaMock.user.findFirst.mockResolvedValue(null);

    const token = createValidToken();
    const response = await GET(buildGetRequest(token));
    const location = response.headers.get("location") ?? "";

    expect(location).toContain("/auth/signin");
    expect(location).toContain("error=expired");
  });

  it("sets cookie with httpOnly and sameSite=lax attributes", async () => {
    const token = createValidToken();
    const response = await GET(buildGetRequest(token));

    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(setCookie.toLowerCase()).toContain("httponly");
    expect(setCookie.toLowerCase()).toContain("samesite=lax");
  });
});

describe("POST /api/auth/magic-link/consume", () => {
  beforeEach(() => {
    vi.stubEnv("AUTH_SECRET", "test-secret-minimum-32-characters-long-here");
    mockConsumeOneTime.mockResolvedValue(true);

    const user = buildUser({ id: "user-1", email: "coach@test.gov", role: "COACH" });
    prismaMock.user.findFirst.mockResolvedValue(user as never);
  });

  it("returns role and redirectTo JSON for valid token", async () => {
    const token = createValidToken();
    const response = await POST(buildPostRequest({ token }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.role).toBe("COACH");
    expect(body.redirectTo).toBe("/coach/dashboard");

    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("fc_portal_session=");
  });

  it("returns 400 for invalid/expired token via POST", async () => {
    const response = await POST(buildPostRequest({ token: "bad.token" }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("INVALID_TOKEN");
  });
});
