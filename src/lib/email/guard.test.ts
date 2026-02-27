import { describe, it, expect } from "vitest";
import { evaluateEmailGuard } from "./guard";

describe("evaluateEmailGuard", () => {
  it("returns NO_RECIPIENTS when no recipients provided", () => {
    const result = evaluateEmailGuard("", {
      emailOutboundEnabled: "true",
      emailMode: "sandbox",
      appEnv: "staging",
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("No recipients");
  });

  it("returns OUTBOUND_DISABLED when EMAIL_OUTBOUND_ENABLED=false", () => {
    const result = evaluateEmailGuard("user@test.gov", {
      emailOutboundEnabled: "false",
      appEnv: "staging",
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("EMAIL_OUTBOUND_ENABLED");
  });

  it("blocks production when EMAIL_MODE is not live", () => {
    const result = evaluateEmailGuard("user@test.gov", {
      emailOutboundEnabled: "true",
      appEnv: "production",
      emailMode: "sandbox",
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('EMAIL_MODE="live"');
  });

  it("allows production when EMAIL_MODE=live", () => {
    const result = evaluateEmailGuard("user@test.gov", {
      emailOutboundEnabled: "true",
      appEnv: "production",
      emailMode: "live",
    });
    expect(result.allowed).toBe(true);
    expect(result.blockedRecipients).toHaveLength(0);
  });

  it("blocks non-production when EMAIL_MODE is not sandbox", () => {
    const result = evaluateEmailGuard("user@test.gov", {
      emailOutboundEnabled: "true",
      appEnv: "staging",
      emailMode: "live",
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('EMAIL_MODE="sandbox"');
  });

  it("blocks non-production sandbox with empty allowlist", () => {
    const result = evaluateEmailGuard("user@test.gov", {
      emailOutboundEnabled: "true",
      appEnv: "staging",
      emailMode: "sandbox",
      emailAllowlist: "",
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("EMAIL_ALLOWLIST is empty");
  });

  it("allows non-production sandbox recipient on allowlist", () => {
    const result = evaluateEmailGuard("user@test.gov", {
      emailOutboundEnabled: "true",
      appEnv: "staging",
      emailMode: "sandbox",
      emailAllowlist: "user@test.gov,admin@test.gov",
    });
    expect(result.allowed).toBe(true);
    expect(result.blockedRecipients).toHaveLength(0);
  });

  it("blocks non-production sandbox recipient NOT on allowlist", () => {
    const result = evaluateEmailGuard("attacker@evil.com", {
      emailOutboundEnabled: "true",
      appEnv: "staging",
      emailMode: "sandbox",
      emailAllowlist: "user@test.gov",
    });
    expect(result.allowed).toBe(false);
    expect(result.blockedRecipients).toContain("attacker@evil.com");
  });
});
