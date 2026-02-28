import { describe, it, expect, beforeEach } from "vitest";
import { consumeRateLimit, getRequestIpAddress } from "./rate-limit";

describe("getRequestIpAddress", () => {
  it("returns first segment from x-forwarded-for", () => {
    const headers = new Headers({ "x-forwarded-for": "attacker-ip, real-ip" });
    expect(getRequestIpAddress(headers)).toBe("attacker-ip");
  });

  it("returns x-real-ip header when x-forwarded-for is absent", () => {
    const headers = new Headers({ "x-real-ip": "10.0.0.1" });
    expect(getRequestIpAddress(headers)).toBe("10.0.0.1");
  });

  it('returns "unknown" when no headers present', () => {
    const headers = new Headers();
    expect(getRequestIpAddress(headers)).toBe("unknown");
  });
});

describe("consumeRateLimit", () => {
  beforeEach(() => {
    globalThis.__rateLimitBuckets = undefined;
  });

  it("allows the first request", () => {
    const result = consumeRateLimit({
      key: "test-ip",
      maxRequests: 5,
      windowMs: 60_000,
    });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("allows requests under the limit", () => {
    for (let i = 0; i < 4; i++) {
      consumeRateLimit({ key: "test-ip", maxRequests: 5, windowMs: 60_000 });
    }
    const result = consumeRateLimit({
      key: "test-ip",
      maxRequests: 5,
      windowMs: 60_000,
    });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(0);
  });

  it("blocks at the limit", () => {
    for (let i = 0; i < 5; i++) {
      consumeRateLimit({ key: "test-ip", maxRequests: 5, windowMs: 60_000 });
    }
    const result = consumeRateLimit({
      key: "test-ip",
      maxRequests: 5,
      windowMs: 60_000,
    });
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("allows request exactly at windowMs boundary (strict greater-than filter)", () => {
    // The filter is `ts > windowStart`, meaning hits exactly at the boundary are excluded.
    // Simulate: make requests at time T, then check at T + windowMs.
    const windowMs = 1000;

    // Record a hit at "now"
    consumeRateLimit({ key: "boundary-test", maxRequests: 1, windowMs });

    // Manually move the hit timestamp back to exactly windowMs ago
    const buckets = globalThis.__rateLimitBuckets!;
    const bucket = buckets.get("boundary-test")!;
    bucket.hits[0] = Date.now() - windowMs;

    // Now consume — the old hit should be filtered out (ts > windowStart, i.e., ts > now - windowMs)
    // Since ts === now - windowMs, the filter `ts > windowStart` means ts > ts, which is false.
    // So the hit IS filtered out, and a new request is allowed.
    const result = consumeRateLimit({
      key: "boundary-test",
      maxRequests: 1,
      windowMs,
    });
    expect(result.allowed).toBe(true);
  });

  it("isolates different keys", () => {
    for (let i = 0; i < 5; i++) {
      consumeRateLimit({ key: "ip-a", maxRequests: 5, windowMs: 60_000 });
    }
    const resultA = consumeRateLimit({ key: "ip-a", maxRequests: 5, windowMs: 60_000 });
    expect(resultA.allowed).toBe(false);

    const resultB = consumeRateLimit({ key: "ip-b", maxRequests: 5, windowMs: 60_000 });
    expect(resultB.allowed).toBe(true);
  });
});
