import type { NextRequest } from "next/server";

interface RateLimitBucket {
  hits: number[];
}

interface ConsumeRateLimitInput {
  key: string;
  maxRequests: number;
  windowMs: number;
}

export interface ConsumeRateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
  remaining: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __rateLimitBuckets: Map<string, RateLimitBucket> | undefined;
}

function getBuckets(): Map<string, RateLimitBucket> {
  if (!globalThis.__rateLimitBuckets) {
    globalThis.__rateLimitBuckets = new Map();
  }
  return globalThis.__rateLimitBuckets;
}

export function consumeRateLimit({
  key,
  maxRequests,
  windowMs,
}: ConsumeRateLimitInput): ConsumeRateLimitResult {
  const now = Date.now();
  const windowStart = now - windowMs;

  const buckets = getBuckets();
  const current = buckets.get(key) ?? { hits: [] };
  current.hits = current.hits.filter((ts) => ts > windowStart);

  if (current.hits.length >= maxRequests) {
    const oldest = current.hits[0] ?? now;
    const retryAfterMs = Math.max(0, oldest + windowMs - now);
    buckets.set(key, current);
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
      remaining: 0,
    };
  }

  current.hits.push(now);
  buckets.set(key, current);

  return {
    allowed: true,
    retryAfterSeconds: 0,
    remaining: Math.max(0, maxRequests - current.hits.length),
  };
}

export function getRequestIpAddress(request: NextRequest): string {
  const requestWithIp = request as NextRequest & { ip?: string };

  try {
    if (requestWithIp.ip && requestWithIp.ip.trim().length > 0) {
      return requestWithIp.ip.trim();
    }
  } catch {
    // Some test/local request objects do not fully support `request.ip`.
  }

  const realIp = request.headers.get("x-real-ip");
  return realIp?.trim() || "unknown";
}
