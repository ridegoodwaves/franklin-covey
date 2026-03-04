---
title: "CSP + Client-Side Navigation Blocking Third-Party Resources in Next.js App Router"
date: "2026-03-01"
category: security-issues
tags:
  - csp
  - content-security-policy
  - nextjs
  - app-router
  - client-navigation
  - wistia
  - third-party-cdn
  - headers
severity: high
component: "next.config.ts / CSP header configuration"
symptoms:
  - "Wistia coach intro videos load correctly on full page reload but fail silently after client-side router.push() navigation"
  - "Chrome DevTools console shows CSP violations blocking fast.wistia.com fetch/connect requests"
  - "Videos blocked specifically on /participant/select-coach when reached via client-side navigation from /participant"
  - "No JS errors thrown — failure mode is silent (CSP violations are reported, not thrown)"
  - "Full hard reload of /participant/select-coach resolves the issue temporarily"
root_cause: >
  Next.js App Router CSP headers are set per-route-pattern at the server level and are not re-applied
  during client-side navigation. The /participant catch-all route served baseCsp (no Wistia domains).
  When the user navigated client-side to /participant/select-coach, the browser retained the
  baseCsp from the initial page load — the more permissive wistiaCsp applied to
  /participant/select-coach/:path* was never sent because no new HTTP response was issued.
resolution_summary: >
  Two-commit fix. adad876 introduced a split-CSP architecture with baseCsp for all routes and
  wistiaCsp scoped to /participant/select-coach/:path*. cf29d3f resolved the client-navigation
  inheritance problem by promoting all Wistia domains into baseCsp itself, ensuring the permissive
  policy is served on the first HTTP response regardless of which route the user lands on.
prevention_tags:
  - "Always audit CSP when adding third-party embeds: check every ancestor route"
  - "Test third-party resource loading via client-side navigation, not only via full page reload"
  - "Next.js route-scoped CSP headers only apply to the initial HTTP response"
  - "Use Chrome DevTools Network > Headers tab to confirm which CSP is being served"
related_issues:
  - "PR #9: feat: add Wistia coach intro videos with CSP and staged rollout"
  - "Issue #6: Security and data hardening backlog (post-audit)"
  - "docs/plans/2026-02-28-feat-wistia-coach-intro-videos-plan.md"
  - "docs/solutions/integration-issues/calendly-api-scope-miscommunication.md (CSP removal precedent)"
affected_files:
  - "next.config.ts"
  - "src/app/participant/select-coach/WistiaCoachPlayer.tsx"
  - "src/app/participant/select-coach/layout.tsx"
  - "src/app/participant/select-coach/head.tsx (deleted)"
  - "scripts/backfill-wistia-media-ids.mjs"
---

# CSP + Client-Side Navigation Blocking Third-Party Resources in Next.js App Router

## Problem Statement

Wistia coach introduction videos loaded correctly when navigating directly to `/participant/select-coach` (full page reload, F5, or direct URL entry) but were blocked by CSP errors when arriving via `router.push()` from `/participant` (client-side SPA navigation).

The browser console showed CSP violations blocking `script-src`, `connect-src`, `frame-src`, and `media-src` from `*.wistia.com` and `*.wistia.net` domains. The failure mode was silent — no JS errors thrown, just CSP violation reports. The photo fallback layer showed through (progressive enhancement working, but for the wrong reason).

## Investigation Steps

### Step 1 — Initial CSP was maximally permissive but global

The first implementation added a broad global CSP applied to all routes (`source: "/:path*"`):

```typescript
const contentSecurityPolicy = [
  "default-src 'self' https: data: blob:",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://fast.wistia.com https://embed-ssl.wistia.com",
  "connect-src 'self' https: wss: https://fast.wistia.com https://embed-ssl.wistia.com",
  "frame-src 'self' https://fast.wistia.com https://embed-ssl.wistia.com",
  // ...
].join("; ");
```

Videos still failed on client navigation from `/participant`.

### Step 2 — Added .net domains

Browser console revealed violations from `*.wistia.net` subdomains (CDN delivery nodes) in addition to `*.wistia.com`. Extended the allowlist, but videos still failed on client-side navigation. This confirmed the issue was not about missing domains.

### Step 3 — Attempted route-scoped CSP with a tighter base policy (commit adad876)

Replaced the single global permissive policy with two policies: a tight `baseCsp` for all routes and a `wistiaCsp` scoped only to `/participant/select-coach/:path*`. This was architecturally correct but didn't fix the actual problem.

### Step 4 — Chrome MCP browser automation verification

Used Chrome MCP to test both navigation paths:
- **Full page reload** of `/participant/select-coach` → videos loaded correctly
- **Client-side navigation** from `/participant` via `router.push()` → videos blocked

This confirmed the root cause was CSP header inheritance during SPA navigation.

### Step 5 — Merged Wistia domains into base CSP (commit cf29d3f)

Recognized that the `baseCsp` applied to `/participant` was what the browser retained during SPA navigation. Added Wistia domain allowances to `baseCsp`.

## Root Cause Analysis

**The core behavior:** In Next.js App Router (and any SPA using client-side routing), when `router.push('/participant/select-coach')` is called from `/participant`, the browser does **not** make a new HTTP request for the destination page. It fetches only the React Server Component payload (a lightweight JSON/text stream) — not a full HTML document with new response headers.

**Consequence for CSP:** The `Content-Security-Policy` header that the browser enforces for the entire SPA session is the one it received on the **initial page load** — whichever route was first visited. In the participant flow, that is `/participant` (the email verification page). When `router.push('/participant/select-coach')` executes, no new HTTP document is fetched, so no new CSP headers are received. The browser continues enforcing the original `/participant` CSP.

**Why route-scoped CSP in `next.config.ts` is insufficient for client-navigated routes:** The `headers()` function in `next.config.ts` sets HTTP response headers on document requests. A route-specific CSP (e.g., `source: "/participant/select-coach/:path*"`) is only delivered when the browser makes a full document request to that path. It has no effect when the route is reached via client-side navigation.

## Working Solution

### Part A — Structured CSP system with helper functions (from adad876)

```typescript
function withSources(
  directive: string,
  sources: Array<string | undefined | null | false>
): string {
  const unique = Array.from(
    new Set(
      sources.filter((source): source is string =>
        typeof source === "string" && source.length > 0
      )
    )
  );
  return `${directive} ${unique.join(" ")}`;
}
```

### Part B — Wistia domains in baseCsp (the critical fix, from cf29d3f)

The `baseCsp` is applied to ALL routes including `/participant`. Because the browser retains this CSP during client-side navigation, Wistia domains must be present here:

```typescript
const baseCsp = [
  "default-src 'self'",
  withSources("script-src", [
    "'self'",
    "'unsafe-inline'",
    isDev ? "'unsafe-eval'" : undefined,  // dev-only for Next.js 15
    "https://*.wistia.com",               // REQUIRED in base for SPA navigation
    "https://*.wistia.net",               // REQUIRED in base for SPA navigation
    "https://src.litix.io",
    "https://*.sentry-cdn.com",
  ]),
  withSources("connect-src", [
    "'self'",
    supabase.origin,
    supabase.wsOrigin,
    "https://*.wistia.com",               // REQUIRED in base for SPA navigation
    "https://*.wistia.net",               // REQUIRED in base for SPA navigation
    "https://*.litix.io",
  ]),
  "frame-src 'self' https://fast.wistia.com https://fast.wistia.net",
  "frame-ancestors 'none'",
  // ... remaining directives
].join("; ");
```

### Part C — Route-scoped wistiaCsp kept as belt-and-suspenders

```typescript
// Kept for direct-URL loads of /participant/select-coach
// but NOT relied upon for client-side navigation paths
const wistiaCsp = [ /* same Wistia allowances */ ].join("; ");
```

### Part D — Preconnect hints moved to route layout (replacing broken head.tsx)

```typescript
// src/app/participant/select-coach/layout.tsx
// head.tsx is NOT a valid App Router convention — silently ignored
export default function SelectCoachLayout({ children }: { readonly children: ReactNode }) {
  return (
    <>
      {WISTIA_INLINE_ENABLED ? (
        <>
          {WISTIA_PRECONNECT.map((origin) => (
            <link key={origin} rel="preconnect" href={origin} crossOrigin="anonymous" />
          ))}
          {WISTIA_DNS_PREFETCH.map((origin) => (
            <link key={origin} rel="dns-prefetch" href={origin} />
          ))}
        </>
      ) : null}
      {children}
    </>
  );
}
```

## Key Technical Insights

### 1. SPA navigation never re-fetches document headers

`router.push()` in Next.js App Router fetches RSC payloads, not full HTML documents. HTTP response headers — including `Content-Security-Policy` — are only delivered on full document requests. Whatever CSP the browser received for the initial page of the session is the policy enforced for all subsequent client-navigated routes.

### 2. Route-scoped CSP in next.config.ts is a partial solution

It correctly protects direct URL loads and server-rendered responses, but is invisible to the browser during SPA navigation. The only reliable CSP for resources needed during client-side navigation is the policy present on the entry-point page.

### 3. The entry-point matters, not the destination

In a sequential flow (`/participant` -> `/participant/select-coach`), the CSP for `/participant` is the effective policy for the entire session. Resources needed on any downstream page must be allowlisted in the entry-point's CSP.

### 4. head.tsx is a dead pattern in App Router

The `head.tsx` convention was part of early Next.js App Router betas and does not inject tags into `<head>`. No error, no warning — it just silently does nothing. Use `layout.tsx` with React 19 link hoisting instead.

### 5. Wistia uses more domains than its documentation advertises

The initial implementation allowlisted only `fast.wistia.com` and `embed-ssl.wistia.com`. Browser violations revealed `*.wistia.net` variants (CDN delivery nodes). Additional observed domains: `src.litix.io` (analytics), `*.sentry-cdn.com` (error tracking embedded in the player). Use wildcard subdomain patterns.

### 6. Header ordering in next.config.ts is "last match wins"

When multiple rules in the `headers()` array match the same path, they are applied in order. The `/:path*` rule fires first, then `/participant/select-coach/:path*` fires second and overwrites the `Content-Security-Policy` header for direct document loads. On SPA navigation, only the first rule's output is relevant.

### 7. child-src blob: is required for Wistia

The Wistia player spawns web workers using blob URLs. Without `child-src blob:` (in addition to `worker-src blob:`), some browser/CSP combinations block the worker creation.

## Prevention Strategies

### Architectural: One Policy Per Application Shell

Design CSP around the SPA entry point, not per-route. The CSP bound to the initial document governs the entire SPA session.

**Single CSP owner rule:** Own CSP in exactly one place (either `next.config.ts` or `middleware.ts`, not both). Mixed ownership causes "why did my config-file CSP get ignored" bugs.

### Testing: Playwright CSP Verification

```typescript
test('resources load after client-side navigation from restrictive route', async ({ page }) => {
  const cspViolations: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error' && msg.text().includes('Content Security Policy')) {
      cspViolations.push(msg.text());
    }
  });

  // Load restrictive entry-point route
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');

  // Client-side navigate to route with third-party dependencies
  await page.click('[data-testid="nav-link-embed"]');
  await page.waitForSelector('[data-testid="third-party-widget"]');

  expect(cspViolations).toHaveLength(0);
});
```

### Code Review Checklist for Third-Party Integrations

- [ ] What domains does this integration load from? (Check network tab, not just vendor docs)
- [ ] Are the domains added to the ENTRY-POINT route's CSP, not just the destination route?
- [ ] Was the PR tested via client-side navigation, not only via direct URL reload?
- [ ] Does `connect-src` use explicit domains (not bare `https:` or `wss:` — exfiltration risk)?
- [ ] Is `'unsafe-eval'` guarded by `NODE_ENV === 'development'`?
- [ ] CSP changes are in a single owner (middleware.ts OR next.config.ts, not both)?

### Monitoring: CSP Report-To

Add `report-to` and `report-uri` directives to detect CSP violations in production. A spike in violations with non-empty `referrer` = client-navigation CSP mismatch. Use `Content-Security-Policy-Report-Only` to shadow-test policy changes for 24-48h before enforcing.

## Applicability

This pattern affects **any Next.js App Router application** (or any SPA framework) that:
1. Uses route-specific CSP headers in `next.config.ts` or server config
2. Loads third-party resources (Stripe, Intercom, Wistia, analytics SDKs, etc.) on routes reached via client-side navigation
3. Has a multi-step flow where the entry-point route has a different CSP than downstream routes

The fix principle is universal: **the CSP on the entry-point page must accommodate all resources needed across the entire client-side navigation session**.
