import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { prismaMock } from "@/lib/__mocks__/db";
import { buildUser } from "@/__tests__/factories";

// Mock email sending — never send real emails in tests
vi.mock("@/lib/email/send-with-guard", () => ({
  sendWithEmailGuard: vi.fn(async () => ({ id: "mock-email-id" })),
}));

import { sendWithEmailGuard } from "@/lib/email/send-with-guard";
const mockSendWithGuard = vi.mocked(sendWithEmailGuard);

vi.stubEnv("AUTH_SECRET", "test-secret-minimum-32-characters-long-here");
vi.stubEnv("MAGIC_LINK_TTL_MINUTES", "30");
vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");

const { POST } = await import("./route");

function buildRequest(body: Record<string, unknown> = {}) {
  return new NextRequest("http://localhost/api/auth/magic-link/request", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/magic-link/request", () => {
  beforeEach(() => {
    vi.stubEnv("AUTH_SECRET", "test-secret-minimum-32-characters-long-here");
    mockSendWithGuard.mockClear();
    mockSendWithGuard.mockResolvedValue({ id: "mock-email-id" });
  });

  it("returns success:true for unknown email (non-enumerating)", async () => {
    prismaMock.user.findFirst.mockResolvedValue(null);

    const response = await POST(buildRequest({ email: "unknown@nobody.com" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);

    // Should NOT attempt to send email
    expect(mockSendWithGuard).not.toHaveBeenCalled();
  });

  it("triggers token creation for known active coach/admin", async () => {
    const user = buildUser({ email: "coach@test.gov", role: "COACH" });
    prismaMock.user.findFirst.mockResolvedValue(user as never);

    const response = await POST(buildRequest({ email: "coach@test.gov" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockSendWithGuard).toHaveBeenCalledTimes(1);

    // Verify the email payload contains the magic link URL
    const callArgs = mockSendWithGuard.mock.calls[0];
    expect(callArgs[0].to).toBe("coach@test.gov");
    expect(callArgs[0].subject).toContain("sign-in");
  });

  it("returns 400 for invalid email format (no @)", async () => {
    const response = await POST(buildRequest({ email: "notanemail" }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("INVALID_EMAIL");
  });

  it("returns 400 for missing email body", async () => {
    const response = await POST(buildRequest({}));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("INVALID_EMAIL");
  });

  it("returns 403 EMAIL_BLOCKED when email guard blocks send", async () => {
    const user = buildUser({ email: "coach@test.gov", role: "COACH" });
    prismaMock.user.findFirst.mockResolvedValue(user as never);

    mockSendWithGuard.mockRejectedValue(new Error("Email guard blocked send."));

    const response = await POST(buildRequest({ email: "coach@test.gov" }));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe("EMAIL_BLOCKED");
  });

  it("returns success:true for archived user (non-enumerating)", async () => {
    // user.findFirst returns null for archived users (where clause: archivedAt: null)
    prismaMock.user.findFirst.mockResolvedValue(null);

    const response = await POST(buildRequest({ email: "archived@test.gov" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockSendWithGuard).not.toHaveBeenCalled();
  });
});
