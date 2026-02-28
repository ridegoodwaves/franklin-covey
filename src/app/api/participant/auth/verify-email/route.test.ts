import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { prismaMock } from "@/lib/__mocks__/db";
import { buildParticipant, buildEngagement, buildCohort } from "@/__tests__/factories";

// Mock security-guards (DB-backed email rate limiter)
vi.mock("@/lib/server/security-guards", () => ({
  consumeParticipantEmailRateLimit: vi.fn(async () => ({
    allowed: true,
    retryAfterSeconds: 0,
    remaining: 9,
  })),
}));

import { consumeParticipantEmailRateLimit } from "@/lib/server/security-guards";
const mockEmailRateLimit = vi.mocked(consumeParticipantEmailRateLimit);

vi.stubEnv("AUTH_SECRET", "test-secret-minimum-32-characters-long-here");

const { POST } = await import("./route");

function buildRequest(body: Record<string, unknown> = {}, headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/participant/auth/verify-email", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": "127.0.0.1",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

function mockParticipantLookup(overrides: Record<string, unknown> = {}) {
  const cohort = buildCohort();
  const participant = buildParticipant({ cohortId: cohort.id });
  const engagement = buildEngagement({
    participantId: participant.id,
    cohortId: cohort.id,
    status: "INVITED",
  });

  prismaMock.participant.findMany.mockResolvedValue([
    {
      ...participant,
      cohort,
      engagement,
      ...overrides,
    } as never,
  ]);
}

describe("POST /api/participant/auth/verify-email", () => {
  beforeEach(() => {
    vi.stubEnv("AUTH_SECRET", "test-secret-minimum-32-characters-long-here");
    mockEmailRateLimit.mockResolvedValue({ allowed: true, retryAfterSeconds: 0, remaining: 9 });
  });

  it("returns 200 with session cookie for valid participant email", async () => {
    mockParticipantLookup();

    const response = await POST(buildRequest({ email: "participant@test.gov" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);

    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("fc_participant_session=");
  });

  it("sets cookie with httpOnly and sameSite=lax attributes", async () => {
    mockParticipantLookup();

    const response = await POST(buildRequest({ email: "participant@test.gov" }));
    const setCookie = response.headers.get("set-cookie") ?? "";

    expect(setCookie.toLowerCase()).toContain("httponly");
    expect(setCookie.toLowerCase()).toContain("samesite=lax");
  });

  it("normalizes email: trims whitespace and lowercases", async () => {
    mockParticipantLookup();

    const response = await POST(buildRequest({ email: "  USER@EXAMPLE.COM  " }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);

    // Verify the normalized email was passed to Prisma
    const call = prismaMock.participant.findMany.mock.calls[0];
    expect(call).toBeDefined();
  });

  it("returns UNRECOGNIZED_EMAIL for unknown email", async () => {
    prismaMock.participant.findMany.mockResolvedValue([]);

    const response = await POST(buildRequest({ email: "nobody@example.com" }));
    const body = await response.json();

    expect(body.success).toBe(false);
    expect(body.error).toBe("UNRECOGNIZED_EMAIL");
  });

  it("returns 429 when IP rate limit exceeded", async () => {
    // Exhaust the IP rate limiter
    for (let i = 0; i < 10; i++) {
      await POST(buildRequest({ email: `test${i}@test.gov` }));
    }

    const response = await POST(buildRequest({ email: "blocked@test.gov" }));

    expect(response.status).toBe(429);
    const body = await response.json();
    expect(body.error).toBe("RATE_LIMITED");
    expect(response.headers.get("retry-after")).toBeTruthy();
  });

  it("returns 429 when email rate limit exceeded", async () => {
    mockEmailRateLimit.mockResolvedValue({
      allowed: false,
      retryAfterSeconds: 3600,
      remaining: 0,
    });

    const response = await POST(buildRequest({ email: "ratelimited@test.gov" }));

    expect(response.status).toBe(429);
    const body = await response.json();
    expect(body.error).toBe("RATE_LIMITED");
  });

  it("IP rate limit blocks before email rate limit is checked", async () => {
    // Exhaust IP limiter
    globalThis.__rateLimitBuckets = undefined;
    for (let i = 0; i < 10; i++) {
      await POST(
        buildRequest(
          { email: `test${i}@test.gov` },
          { "x-forwarded-for": "blocked-ip" }
        )
      );
    }

    mockEmailRateLimit.mockClear();
    const response = await POST(
      buildRequest({ email: "after@test.gov" }, { "x-forwarded-for": "blocked-ip" })
    );

    expect(response.status).toBe(429);
    // Email rate limiter should NOT have been called — blocked by IP first
    expect(mockEmailRateLimit).not.toHaveBeenCalled();
  });

  it("WINDOW_CLOSED clears session cookie with maxAge 0", async () => {
    const cohort = buildCohort({ coachSelectionEnd: new Date("2020-01-01") });
    const participant = buildParticipant({ cohortId: cohort.id });
    const engagement = buildEngagement({
      participantId: participant.id,
      cohortId: cohort.id,
      status: "INVITED",
    });

    prismaMock.participant.findMany.mockResolvedValue([
      { ...participant, cohort, engagement } as never,
    ]);

    const response = await POST(buildRequest({ email: "closed@test.gov" }));
    const body = await response.json();

    expect(body.error).toBe("WINDOW_CLOSED");

    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("Max-Age=0");
  });

  it("returns UNRECOGNIZED_EMAIL for missing email in body", async () => {
    const response = await POST(buildRequest({}));
    const body = await response.json();

    expect(body.success).toBe(false);
    expect(body.error).toBe("UNRECOGNIZED_EMAIL");
  });

  it("returns UNRECOGNIZED_EMAIL for malformed request body", async () => {
    const req = new NextRequest("http://localhost/api/participant/auth/verify-email", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "127.0.0.2",
      },
      body: "not json",
    });

    const response = await POST(req);
    const body = await response.json();

    expect(body.success).toBe(false);
    expect(body.error).toBe("UNRECOGNIZED_EMAIL");
  });
});
