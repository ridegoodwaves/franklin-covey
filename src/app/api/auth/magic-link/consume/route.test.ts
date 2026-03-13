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

const { createMagicLinkToken } = await import("@/lib/server/session");
const { GET, POST } = await import("./route");

interface TokenOverrides {
  userId?: string;
  email?: string;
  role?: "COACH" | "ADMIN";
}

function createValidToken(overrides: TokenOverrides = {}) {
  return createMagicLinkToken({
    userId: "user-1",
    email: "coach@test.gov",
    role: "COACH" as const,
    ...overrides,
  });
}

function buildGetRequest(token?: string) {
  const url = new URL("http://localhost/api/auth/magic-link/consume");
  if (token) {
    url.searchParams.set("token", token);
  }
  return new NextRequest(url);
}

function buildJsonPostRequest(body: { token?: string } = {}) {
  return new NextRequest("http://localhost/api/auth/magic-link/consume", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function buildFormPostRequest(token: string) {
  const body = new URLSearchParams({ token, _redirect: "1" });
  return new NextRequest("http://localhost/api/auth/magic-link/consume", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
}

describe("GET /api/auth/magic-link/consume", () => {
  beforeEach(() => {
    vi.stubEnv("AUTH_SECRET", "test-secret-minimum-32-characters-long-here");
    mockConsumeOneTime.mockResolvedValue(true);

    const user = buildUser({ id: "user-1", email: "coach@test.gov", role: "COACH" });
    prismaMock.user.findFirst.mockResolvedValue(user as never);
  });

  it("returns HTML landing page for valid token and does not consume", async () => {
    const token = createValidToken();
    mockConsumeOneTime.mockClear();
    prismaMock.user.findFirst.mockClear();
    const response = await GET(buildGetRequest(token));
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(response.headers.get("x-robots-tag")).toContain("noindex");

    expect(body).toContain('<form method="POST" action="/api/auth/magic-link/consume"');
    expect(body).toContain('<input type="hidden" name="token"');
    expect(body).toContain('<input type="hidden" name="_redirect" value="1"');
    expect(body).toContain('<html lang="en">');
    expect(body).toContain('<meta name="viewport" content="width=device-width, initial-scale=1" />');
    expect(body).toContain("<h1");
    expect(body).toContain("Sign in to FranklinCovey");
    expect(body).toContain("<button");
    expect(body).toContain("Sign in");
    expect(body).not.toContain("<img");
    expect(body).not.toContain("<link");
    expect(body).not.toContain('src="http');

    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(setCookie).not.toContain("fc_portal_session=");
    expect(mockConsumeOneTime).not.toHaveBeenCalled();
    expect(prismaMock.user.findFirst).not.toHaveBeenCalled();
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

  it("returns HTML for token even if consume check would fail", async () => {
    mockConsumeOneTime.mockResolvedValue(false);

    const token = createValidToken();
    const response = await GET(buildGetRequest(token));
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(body).toContain("Sign in to FranklinCovey");
    expect(mockConsumeOneTime).not.toHaveBeenCalled();
  });

  it("redirects to error page for tampered token", async () => {
    const response = await GET(buildGetRequest("tampered.token"));
    const location = response.headers.get("location") ?? "";

    expect(location).toContain("/auth/signin");
    expect(location).toContain("error=expired");
  });

  it("redirects to signin when token is missing", async () => {
    const response = await GET(buildGetRequest());
    const location = response.headers.get("location") ?? "";

    expect(response.status).toBe(307);
    expect(location).toContain("/auth/signin");
    expect(location).toContain("error=expired");
  });

  it("does not set session cookie on valid GET", async () => {
    const token = createValidToken({ role: "COACH" });
    const response = await GET(buildGetRequest(token));
    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(setCookie).not.toContain("fc_portal_session=");
  });
});

describe("POST /api/auth/magic-link/consume", () => {
  beforeEach(() => {
    vi.stubEnv("AUTH_SECRET", "test-secret-minimum-32-characters-long-here");
    mockConsumeOneTime.mockResolvedValue(true);

    const user = buildUser({ id: "user-1", email: "coach@test.gov", role: "COACH" });
    prismaMock.user.findFirst.mockResolvedValue(user as never);
  });

  it("redirects with 303 and sets cookie for valid form token", async () => {
    const token = createValidToken();
    const response = await POST(buildFormPostRequest(token));
    const location = response.headers.get("location") ?? "";
    const setCookie = response.headers.get("set-cookie") ?? "";

    expect(response.status).toBe(303);
    expect(location).toContain("/coach/dashboard");
    expect(setCookie).toContain("fc_portal_session=");
    expect(setCookie.toLowerCase()).toContain("httponly");
    expect(setCookie.toLowerCase()).toContain("samesite=lax");
  });

  it("redirects form mode to signin when token already consumed", async () => {
    mockConsumeOneTime.mockResolvedValue(false);
    const token = createValidToken();
    const response = await POST(buildFormPostRequest(token));
    const location = response.headers.get("location") ?? "";

    expect(response.status).toBe(303);
    expect(location).toContain("/auth/signin");
    expect(location).toContain("error=expired");
  });

  it("redirects form mode to signin for invalid token", async () => {
    const response = await POST(buildFormPostRequest("bad.token"));
    const location = response.headers.get("location") ?? "";

    expect(response.status).toBe(303);
    expect(location).toContain("/auth/signin");
    expect(location).toContain("error=expired");
  });

  it("returns role and redirectTo JSON for valid token", async () => {
    const token = createValidToken();
    const response = await POST(buildJsonPostRequest({ token }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.role).toBe("COACH");
    expect(body.redirectTo).toBe("/coach/dashboard");

    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("fc_portal_session=");
  });

  it("returns 400 for invalid/expired token via POST", async () => {
    const response = await POST(buildJsonPostRequest({ token: "bad.token" }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("INVALID_TOKEN");
  });
});
