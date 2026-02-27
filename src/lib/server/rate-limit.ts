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

export function getRequestIpAddress(headers: Headers): string {
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }
  return headers.get("x-real-ip") || "unknown";
}
