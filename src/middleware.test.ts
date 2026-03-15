import { describe, it, expect, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { middleware } from "@/middleware";
import { writePortalSession } from "@/lib/server/session";

function extractPortalToken(response: NextResponse): string {
  const setCookie = response.headers.get("set-cookie") || "";
  const match = setCookie.match(/fc_portal_session=([^;]+)/);
  if (!match?.[1]) {
    throw new Error("Missing portal session cookie");
  }
  return match[1];
}

function buildPortalCookie(role: "ADMIN" | "COACH"): string {
  const response = NextResponse.json({ ok: true });
  writePortalSession(response, {
    userId: "user-1",
    email: "user@test.gov",
    role,
  });
  return extractPortalToken(response);
}

function buildRequest(url: string, cookie?: string): NextRequest {
  return new NextRequest(url, {
    headers: cookie ? { cookie: `fc_portal_session=${cookie}` } : undefined,
  });
}

describe("middleware auth guards", () => {
  it("redirects unauthenticated admin page requests to /auth/signin", async () => {
    vi.stubEnv("AUTH_SECRET", "test-secret-minimum-32-characters-long-here");
    const request = buildRequest("http://localhost/admin/dashboard");
    const response = await middleware(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/auth/signin");
  });

  it("allows ADMIN role for /admin/* and refreshes portal cookie", async () => {
    vi.stubEnv("AUTH_SECRET", "test-secret-minimum-32-characters-long-here");
    const cookie = buildPortalCookie("ADMIN");
    const request = buildRequest("http://localhost/admin/dashboard", cookie);
    const response = await middleware(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("fc_portal_session=");
  });

  it("sets Secure on refreshed cookie for HTTPS requests", async () => {
    vi.stubEnv("AUTH_SECRET", "test-secret-minimum-32-characters-long-here");
    vi.stubEnv("NODE_ENV", "development");
    const cookie = buildPortalCookie("ADMIN");
    const request = buildRequest("https://preview.vercel.app/admin/dashboard", cookie);
    const response = await middleware(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("Secure");
  });

  it("denies COACH role on /admin/*", async () => {
    vi.stubEnv("AUTH_SECRET", "test-secret-minimum-32-characters-long-here");
    const cookie = buildPortalCookie("COACH");
    const request = buildRequest("http://localhost/admin/dashboard", cookie);
    const response = await middleware(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/auth/signin");
  });

  it("returns 401 for unauthenticated /api/admin/* requests", async () => {
    vi.stubEnv("AUTH_SECRET", "test-secret-minimum-32-characters-long-here");
    const request = buildRequest("http://localhost/api/admin/dashboard/kpis");
    const response = await middleware(request);

    expect(response.status).toBe(401);
  });

  it("redirects authenticated admin /admin/import requests to /admin/dashboard", async () => {
    vi.stubEnv("AUTH_SECRET", "test-secret-minimum-32-characters-long-here");
    const cookie = buildPortalCookie("ADMIN");
    const request = buildRequest("http://localhost/admin/import", cookie);
    const response = await middleware(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/admin/dashboard");
  });

  it("does not redirect /api/admin/import requests", async () => {
    vi.stubEnv("AUTH_SECRET", "test-secret-minimum-32-characters-long-here");
    const cookie = buildPortalCookie("ADMIN");
    const request = buildRequest("http://localhost/api/admin/import", cookie);
    const response = await middleware(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("does not rewrite /admin/engagements requests", async () => {
    vi.stubEnv("AUTH_SECRET", "test-secret-minimum-32-characters-long-here");
    const cookie = buildPortalCookie("ADMIN");
    const request = buildRequest("http://localhost/admin/engagements", cookie);
    const response = await middleware(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });
});
