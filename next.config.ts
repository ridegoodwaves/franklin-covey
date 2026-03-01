import type { NextConfig } from "next";

const contentSecurityPolicy = [
  "default-src 'self' https: data: blob:",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://fast.wistia.com https://embed-ssl.wistia.com",
  "style-src 'self' 'unsafe-inline' https:",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https:",
  "connect-src 'self' https: wss: https://fast.wistia.com https://embed-ssl.wistia.com",
  "frame-src 'self' https://fast.wistia.com https://embed-ssl.wistia.com",
  "media-src 'self' https: blob:",
  "worker-src 'self' blob:",
].join("; ");

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.cloudfront.net" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "fast.wistia.com" },
      { protocol: "https", hostname: "embed-ssl.wistia.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: contentSecurityPolicy,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
