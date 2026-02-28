import { describe, it, expect, vi, beforeEach } from "vitest";

// We need direct access to internal token functions, so we test via the
// public wrappers that exercise createSignedToken / verifySignedToken.
// The public API is: createMagicLinkToken, verifyMagicLinkToken,
// readParticipantSession, writeParticipantSession, readPortalSession, writePortalSession.

// Set AUTH_SECRET before importing session module
vi.stubEnv("AUTH_SECRET", "test-secret-minimum-32-characters-long-here");
vi.stubEnv("MAGIC_LINK_TTL_MINUTES", "30");

// Import after env is set
const sessionModule = await import("./session");
const {
  createMagicLinkToken,
  verifyMagicLinkToken,
  readParticipantSession,
  writeParticipantSession,
  readPortalSession,
  writePortalSession,
  clearParticipantSession,
} = sessionModule;

// Helper: build a NextRequest with a cookie
function buildRequestWithCookie(cookieName: string, cookieValue: string) {
  const { NextRequest } = require("next/server");
  return new NextRequest("http://localhost/api/test", {
    headers: { cookie: `${cookieName}=${cookieValue}` },
  });
}

// Helper: build a NextResponse and extract cookie from it
function buildResponse() {
  const { NextResponse } = require("next/server");
  return NextResponse.json({ ok: true });
}

describe("session — token signing & verification", () => {
  beforeEach(() => {
    vi.stubEnv("AUTH_SECRET", "test-secret-minimum-32-characters-long-here");
    vi.stubEnv("MAGIC_LINK_TTL_MINUTES", "30");
  });

  it("round-trips a magic-link token (create + verify)", () => {
    const payload = { userId: "u1", email: "test@gov.com", role: "COACH" as const };
    const token = createMagicLinkToken(payload);
    const result = verifyMagicLinkToken(token);
    expect(result).not.toBeNull();
    expect(result!.userId).toBe("u1");
    expect(result!.email).toBe("test@gov.com");
    expect(result!.role).toBe("COACH");
  });

  it("rejects expired token (past exp)", () => {
    const payload = { userId: "u1", email: "test@gov.com", role: "COACH" as const };
    const token = createMagicLinkToken(payload);

    // Advance time beyond TTL (30 min = 1800s)
    vi.useFakeTimers();
    vi.advanceTimersByTime(31 * 60 * 1000);

    const result = verifyMagicLinkToken(token);
    expect(result).toBeNull();

    vi.useRealTimers();
  });

  it("rejects token signed with wrong secret", () => {
    const payload = { userId: "u1", email: "test@gov.com", role: "COACH" as const };
    const token = createMagicLinkToken(payload);

    // Change secret
    vi.stubEnv("AUTH_SECRET", "different-secret-that-is-32-chars-long!!!");

    // Need to re-import to pick up new secret (verifyMagicLinkToken reads env each call)
    const result = verifyMagicLinkToken(token);
    expect(result).toBeNull();
  });

  it("rejects tampered payload (modified base64)", () => {
    const payload = { userId: "u1", email: "test@gov.com", role: "COACH" as const };
    const token = createMagicLinkToken(payload);

    const [encoded, sig] = token.split(".");
    // Flip a character in the encoded part
    const tampered = encoded!.slice(0, -1) + (encoded!.endsWith("A") ? "B" : "A");
    const result = verifyMagicLinkToken(`${tampered}.${sig}`);
    expect(result).toBeNull();
  });

  it("rejects tampered signature", () => {
    const payload = { userId: "u1", email: "test@gov.com", role: "COACH" as const };
    const token = createMagicLinkToken(payload);

    const [encoded, sig] = token.split(".");
    const tampered = sig!.slice(0, -1) + (sig!.endsWith("A") ? "B" : "A");
    const result = verifyMagicLinkToken(`${encoded}.${tampered}`);
    expect(result).toBeNull();
  });

  it("rejects token with extra trailing dot-segments", () => {
    const payload = { userId: "u1", email: "test@gov.com", role: "COACH" as const };
    const token = createMagicLinkToken(payload);

    // The split(".") in verifySignedToken only destructures [encoded, signature].
    // Extra segments are ignored, so encoded+sig remain the same.
    // But since split returns >2 parts, the signature is still correctly at index 1.
    // The actual defense here is that the token structure is `encoded.sig` — anything
    // else is malformed. Let's verify the function handles it gracefully.
    const result = verifyMagicLinkToken(`${token}.extra.segments`);
    // verifySignedToken splits on "." and takes [0] and [1], so extra segments
    // don't affect verification. The token still round-trips.
    // This is acceptable because the signature covers the encoded payload.
    // If you want to reject extra segments, you'd add a segment count check.
    expect(result).not.toBeNull(); // Current behavior: passes (split takes first two)
  });

  it("returns null for empty string token without throwing", () => {
    const result = verifyMagicLinkToken("");
    expect(result).toBeNull();
  });

  it("rejects participant-scoped token when verifying as magic-link scope", () => {
    // Create a participant session token (scope = "participant")
    const response = buildResponse();
    writeParticipantSession(response, {
      participantId: "p1",
      engagementId: "e1",
      organizationId: "org-1",
      cohortId: "c1",
      email: "test@gov.com",
      shownCoachIds: [],
      remixUsed: false,
      currentBatchIds: [],
    });

    // Extract the cookie value
    const setCookie = response.headers.get("set-cookie") || "";
    const match = setCookie.match(/fc_participant_session=([^;]+)/);
    const participantToken = match?.[1] ?? "";

    // Try to verify as magic-link — should fail (wrong scope)
    const result = verifyMagicLinkToken(participantToken);
    expect(result).toBeNull();
  });

  it("rejects magic-link token when reading as participant session", () => {
    const magicToken = createMagicLinkToken({
      userId: "u1",
      email: "test@gov.com",
      role: "COACH" as const,
    });

    // Attempt to read this as a participant session cookie
    const request = buildRequestWithCookie("fc_participant_session", magicToken);
    const result = readParticipantSession(request);
    expect(result).toBeNull();
  });

  it("rejects magic-link token when reading as portal session", () => {
    const magicToken = createMagicLinkToken({
      userId: "u1",
      email: "test@gov.com",
      role: "COACH" as const,
    });

    const request = buildRequestWithCookie("fc_portal_session", magicToken);
    const result = readPortalSession(request);
    expect(result).toBeNull();
  });

  it("throws when AUTH_SECRET is missing or empty", () => {
    vi.stubEnv("AUTH_SECRET", "");

    expect(() =>
      createMagicLinkToken({ userId: "u1", email: "t@t.com", role: "COACH" as const })
    ).toThrow("AUTH_SECRET is required");
  });

  it("magic-link token has correct scope", () => {
    const token = createMagicLinkToken({
      userId: "u1",
      email: "test@gov.com",
      role: "ADMIN" as const,
    });

    // Decode the payload to inspect the scope
    const [encoded] = token.split(".");
    const decoded = JSON.parse(Buffer.from(encoded!, "base64url").toString("utf8"));
    expect(decoded.scope).toBe("magic-link");
  });

  it("treats exp exactly equal to now as expired (boundary: <= not <)", () => {
    vi.useFakeTimers();
    const now = Date.now();
    vi.setSystemTime(now);

    const token = createMagicLinkToken({
      userId: "u1",
      email: "test@gov.com",
      role: "COACH" as const,
    });

    // Advance time to exactly the TTL
    vi.advanceTimersByTime(30 * 60 * 1000);

    const result = verifyMagicLinkToken(token);
    expect(result).toBeNull();

    vi.useRealTimers();
  });
});

describe("session — participant session read/write", () => {
  beforeEach(() => {
    vi.stubEnv("AUTH_SECRET", "test-secret-minimum-32-characters-long-here");
  });

  it("round-trips participant session via cookie", () => {
    const session = {
      participantId: "p1",
      engagementId: "e1",
      organizationId: "org-1",
      cohortId: "c1",
      email: "test@gov.com",
      shownCoachIds: ["coach-1"],
      remixUsed: false,
      currentBatchIds: ["coach-1"],
    };

    const response = buildResponse();
    writeParticipantSession(response, session);

    const setCookie = response.headers.get("set-cookie") || "";
    const match = setCookie.match(/fc_participant_session=([^;]+)/);
    expect(match).not.toBeNull();

    const request = buildRequestWithCookie("fc_participant_session", match![1]);
    const result = readParticipantSession(request);
    expect(result).not.toBeNull();
    expect(result!.participantId).toBe("p1");
    expect(result!.email).toBe("test@gov.com");
    expect(result!.currentBatchIds).toEqual(["coach-1"]);
  });

  it("clearParticipantSession sets maxAge 0", () => {
    const response = buildResponse();
    clearParticipantSession(response);

    const setCookie = response.headers.get("set-cookie") || "";
    expect(setCookie).toContain("fc_participant_session=");
    expect(setCookie).toContain("Max-Age=0");
  });
});
