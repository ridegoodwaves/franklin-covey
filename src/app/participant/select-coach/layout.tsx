import type { ReactNode } from "react";

const WISTIA_PRECONNECT = [
  "https://fast.wistia.com",
  "https://fast.wistia.net",
] as const;

const WISTIA_DNS_PREFETCH = [
  "https://embed-ssl.wistia.com",
  "https://embedwistia-a.akamaihd.net",
] as const;

const WISTIA_INLINE_ENABLED = process.env.NEXT_PUBLIC_ENABLE_WISTIA_COACH_VIDEOS === "true";

export default function SelectCoachLayout({
  children,
}: {
  readonly children: ReactNode;
}) {
  return (
    <>
      {WISTIA_INLINE_ENABLED ? (
        <>
          {WISTIA_PRECONNECT.map((origin) => (
            <link key={`preconnect-${origin}`} rel="preconnect" href={origin} crossOrigin="anonymous" />
          ))}
          {WISTIA_DNS_PREFETCH.map((origin) => (
            <link key={`prefetch-${origin}`} rel="dns-prefetch" href={origin} />
          ))}
        </>
      ) : null}
      {children}
    </>
  );
}
