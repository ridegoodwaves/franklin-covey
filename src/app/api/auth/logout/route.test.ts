import { describe, expect, it } from "vitest";

const { POST } = await import("./route");

describe("POST /api/auth/logout", () => {
  it("clears portal and participant cookies", async () => {
    const response = await POST();

    expect(response.status).toBe(204);
    expect(response.headers.get("cache-control")).toBe("no-store");

    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("fc_portal_session=");
    expect(setCookie).toContain("fc_participant_session=");
    expect(setCookie).toContain("Max-Age=0");
  });
});
