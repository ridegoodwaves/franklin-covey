import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

function parseSupabaseOrigins(rawUrl?: string): { origin?: string; wsOrigin?: string } {
  if (!rawUrl) return {};
  try {
    const parsed = new URL(rawUrl);
    return {
      origin: parsed.origin,
      wsOrigin: `wss://${parsed.host}`,
    };
  } catch {
    return {};
  }
}

function withSources(
  directive: string,
  sources: Array<string | undefined | null | false>
): string {
  const unique = Array.from(
    new Set(
      sources.filter((source): source is string => typeof source === "string" && source.length > 0)
    )
  );
  return `${directive} ${unique.join(" ")}`;
}

const supabase = parseSupabaseOrigins(process.env.NEXT_PUBLIC_SUPABASE_URL);

const baseCsp = [
  "default-src 'self'",
  withSources("script-src", [
    "'self'",
    "'unsafe-inline'",
    isDev ? "'unsafe-eval'" : undefined,
    "https://*.wistia.com",
    "https://*.wistia.net",
    "https://src.litix.io",
    "https://*.sentry-cdn.com",
  ]),
  withSources("connect-src", [
    "'self'",
    supabase.origin,
    supabase.wsOrigin,
    "https://*.wistia.com",
    "https://*.wistia.net",
    "https://*.litix.io",
    "https://*.algolia.net",
  ]),
  "frame-src 'self' https://fast.wistia.com https://fast.wistia.net",
  "frame-ancestors 'none'",
  withSources("img-src", [
    "'self'",
    "data:",
    "blob:",
    supabase.origin,
    "https://*.wistia.com",
    "https://*.wistia.net",
  ]),
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data: https://*.wistia.com",
  "media-src 'self' blob: data: https://*.wistia.com https://*.wistia.net",
  "worker-src 'self' blob:",
  "child-src blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const wistiaCsp = [
  "default-src 'self'",
  withSources("script-src", [
    "'self'",
    "'unsafe-inline'",
    isDev ? "'unsafe-eval'" : undefined,
    "https://*.wistia.com",
    "https://*.wistia.net",
    "https://src.litix.io",
    "https://*.sentry-cdn.com",
  ]),
  withSources("connect-src", [
    "'self'",
    supabase.origin,
    supabase.wsOrigin,
    "https://*.wistia.com",
    "https://*.wistia.net",
    "https://*.litix.io",
    "https://*.algolia.net",
  ]),
  "frame-src https://fast.wistia.com https://fast.wistia.net",
  "frame-ancestors 'none'",
  withSources("img-src", [
    "'self'",
    "data:",
    "blob:",
    supabase.origin,
    "https://*.wistia.com",
    "https://*.wistia.net",
  ]),
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data: https://*.wistia.com",
  "media-src 'self' blob: data: https://*.wistia.com https://*.wistia.net",
  "worker-src 'self' blob:",
  "child-src blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.cloudfront.net" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "fast.wistia.com" },
      { protocol: "https", hostname: "fast.wistia.net" },
      { protocol: "https", hostname: "embed-ssl.wistia.com" },
      { protocol: "https", hostname: "embed-ssl.wistia.net" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: baseCsp,
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      {
        source: "/participant/select-coach/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: wistiaCsp,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
