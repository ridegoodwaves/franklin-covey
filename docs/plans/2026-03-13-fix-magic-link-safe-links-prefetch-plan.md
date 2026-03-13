---
title: "fix: Magic Link Broken by Microsoft Safe Links Pre-fetching (Gap 9)"
type: fix
date: 2026-03-13
deadline: 2026-03-15 (deploy before EF-1 opens March 16)
priority: P0 BLOCKER
parent: docs/plans/2026-03-11-chore-mvp-full-launch-plan.md (Gap 9)
---

# fix: Magic Link Broken by Microsoft Safe Links Pre-fetching

## Overview

Coach and admin magic link sign-ins are broken for all FranklinCovey users. Microsoft 365 Safe Links pre-fetches every URL in inbound emails via GET, which consumes the one-time token before the human clicks the link. The user always lands on an "expired" error page.

**Reported by:** Andrea Sherman (Director of Operations), 2026-03-13
**Confirmed root cause:** FranklinCovey uses Microsoft 365 / Exchange Online (confirmed via email headers: `MN2PR06MB5693.namprd06.prod.outlook.com`, tenant `3c4a5246-fa05-45bf-ac80-0c6a22f77761`). Safe Links is an organization-wide policy — not configurable per user.

**Impact:** 100% of coach and admin logins are broken. No workaround exists for end users.

---

## Problem Statement

### Current Flow (Broken)

```
1. User requests magic link → POST /api/auth/magic-link/request
2. Email sent with link: GET /api/auth/magic-link/consume?token=...
3. Safe Links bot pre-fetches the GET URL (within seconds of delivery)
4. GET handler calls consumeToken() → consumeMagicLinkOneTime() burns the token
5. Human clicks link minutes later → token already consumed → redirect to /auth/signin?error=expired
```

### Additional Diagnostic Problem

The consume route (`src/app/api/auth/magic-link/consume/route.ts:16-62`) has three distinct failure points that all return the same generic error `{ ok: false, error: "INVALID_TOKEN" }` with no server-side logging:

| Failure Point | Line | Cause | Current Output |
|---|---|---|---|
| `verifyMagicLinkToken()` returns null | 21-23 | Token expired or tampered | `INVALID_TOKEN` |
| `prisma.user.findFirst()` returns null | 41-42 | User not found, inactive, or archived | `INVALID_TOKEN` |
| `consumeMagicLinkOneTime()` returns false | 54-55 | Token already consumed | `INVALID_TOKEN` |

All three redirect to `/auth/signin?error=expired`. This makes it impossible to diagnose which check failed from Vercel logs.

---

## Proposed Solution

**Industry-standard pattern:** Intermediate HTML landing page. Safe Links only follows GET requests — it does not execute JavaScript or submit forms.

### Fixed Flow

```
1. User requests magic link → POST /api/auth/magic-link/request (unchanged)
2. Email sent with link: GET /api/auth/magic-link/consume?token=... (unchanged)
3. Safe Links bot pre-fetches GET → receives HTML page → discards it (token NOT consumed)
4. Human clicks link → GET returns HTML landing page with "Sign in" button
5. Human clicks "Sign in" → native form POST to /api/auth/magic-link/consume
6. POST handler consumes token, writes session cookie, redirects to dashboard
```

### Design Decisions (Pre-Resolved)

| Decision | Choice | Rationale |
|---|---|---|
| Auto-submit via JS? | **No** — explicit button click only | Launch plan specifies no auto-submit to avoid future scanner classes that execute JS |
| JS on landing page? | **Zero JavaScript** | Simplest, most robust. Accept native form double-submit risk (mitigated by one-time token). |
| CSRF token? | **Not needed** — magic link token is the unguessable secret | Token is single-use, user-specific, time-limited. Standard pattern for magic link flows. |
| GET checks DB for user/consumption? | **No** — token structure + expiry only | Keep GET lightweight since bots will hit it. Accept minor UX gap on second-click. |
| Logo on landing page? | **Inline SVG** (no external requests) | External image request would leak token URL via Referer header |
| Error on GET (expired/tampered)? | **Redirect to `/auth/signin?error=expired`** | Page exists and handles this case already (line 59-63). Consistent with current pattern. |
| Error on POST (form mode)? | **Redirect to `/auth/signin?error=expired`** | Same as above. Consistent UX. |
| POST dual-mode? | **Yes** — detect Content-Type, branch response | Form submissions get redirect; JSON API calls get JSON (preserve existing contract) |
| Redirect status for form POST? | **303 See Other** | Prevents browser back-button "Confirm Form Resubmission" dialog |

---

## Technical Approach

### File: `src/app/api/auth/magic-link/consume/route.ts`

#### GET Handler Changes (line 64-82 → full rewrite)

**Before:** Calls `consumeToken()` → redirects to dashboard or error.

**After:**

1. Extract `token` from query params
2. If no token → redirect to `/auth/signin?error=expired`
3. Call `verifyMagicLinkToken(token)` (signature + expiry check ONLY — no DB hit, no consumption)
4. If null → redirect to `/auth/signin?error=expired`
5. Return self-contained HTML landing page with:
   - Inline FC logomark SVG
   - Heading: "Sign in to FranklinCovey"
   - Body: "Click below to access your coaching portal."
   - Note: "This link can only be used once."
   - `<form method="POST" action="/api/auth/magic-link/consume">`
   - `<input type="hidden" name="token" value="...">` (the full token, **HTML-entity-encoded** via `escapeHtmlAttr()`)
   - `<button type="submit">Sign in</button>` (styled as FC brand button)
6. Response headers:
   - `Content-Type: text/html; charset=utf-8`
   - `Cache-Control: no-store, no-cache, must-revalidate`
   - `Pragma: no-cache`
   - `Referrer-Policy: no-referrer`
   - `X-Robots-Tag: noindex, nofollow`

**HTML page requirements:**
- **Token value must be HTML-entity-encoded** before embedding in the `value` attribute. Use a helper function:
  ```typescript
  function escapeHtmlAttr(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  ```
  Rationale: base64url tokens are currently safe, but defense-in-depth requires encoding any value inserted into HTML attributes. All three technical reviewers flagged this as required.
- All styles inline (no external CSS, no `<link>` tags)
- Logo inlined as SVG element (no `<img>` with external src)
- Zero external requests of any kind
- `<html lang="en">` for accessibility
- `<meta name="referrer" content="no-referrer">` as defense-in-depth
- `<meta name="viewport" content="width=device-width, initial-scale=1">` for mobile
- Color scheme: white background, `#141928` text, `#3253FF` button with white text
- Font: `Arial, sans-serif`
- Button: pill shape, matching existing FC button style
- Centered vertically and horizontally, max-width ~400px

#### POST Handler Changes (line 84-112 → add form-mode branch)

**Before:** Parses JSON body `{ token }`, returns JSON `{ success, role, redirectTo }`.

**After:** Detect content type, branch accordingly:

```
1. Check Content-Type header
2. If "application/x-www-form-urlencoded":
   a. Parse body with request.formData()
   b. Extract token from form field "token"
   c. Call consumeToken(token, request)
   d. If failed → redirect 303 to /auth/signin?error=expired
   e. If success → write portal session cookie → redirect 303 to dashboard path
3. Else (JSON mode — existing behavior):
   a. Parse body with request.json()
   b. Call consumeToken(token, request)
   c. If failed → return JSON { success: false, error: "INVALID_TOKEN" } 400
   d. If success → write portal session cookie → return JSON { success, role, redirectTo }
```

**Key:** Use `303 See Other` for form-mode redirects (not 302) to prevent browser back-button resubmission.

#### Diagnostic Logging (add to `consumeToken` helper, lines 16-62)

Add `console.error` at each failure branch:

```typescript
// After line 23 (verifyMagicLinkToken returns null):
console.error("[magic-link/consume] Token verification failed (expired or tampered)");

// After line 42 (user not found):
console.error("[magic-link/consume] User not found for payload:", {
  userId: payload.userId,
  email: payload.email,
  role: payload.role,
});

// After line 55 (already consumed):
console.error("[magic-link/consume] Token already consumed (one-time guard rejected)");
```

### File: `src/app/api/auth/magic-link/consume/route.test.ts`

**Existing tests to update:**

| Test | Current Assertion | New Assertion |
|---|---|---|
| Valid token GET | Status 307, redirect to dashboard | Status 200, Content-Type text/html, body contains form + token |
| Expired token GET | Status 307, redirect to signin | Status 307, redirect to `/auth/signin?error=expired` (unchanged) |
| Tampered token GET | Status 307, redirect to signin | Status 307, redirect to `/auth/signin?error=expired` (unchanged) |
| Already-consumed GET | Status 307, redirect to signin | Status 200, text/html (GET does NOT check consumption) |
| COACH redirect GET | Status 307, redirect to /coach/dashboard | Status 200, text/html (no redirect on GET) |
| ADMIN redirect GET | Status 307, redirect to /admin/dashboard | Status 200, text/html (no redirect on GET) |
| Cookie attributes GET | fc_portal_session set | fc_portal_session NOT set (GET does not set cookie) |

**New tests to add:**

| Test | Assertion |
|---|---|
| GET valid token: HTML contains hidden form field with token value | Body contains `<input type="hidden" name="token"` |
| GET valid token: HTML contains `_redirect` hidden field | Body contains `<input type="hidden" name="_redirect"` |
| GET valid token: response has security headers | `Cache-Control: no-store`, `Referrer-Policy: no-referrer`, `X-Robots-Tag: noindex` |
| GET valid token: `consumeMagicLinkOneTime` NOT called | Mock assertion: `consumeMagicLinkOneTime` call count is 0 |
| GET missing token: redirects to signin | Status 307 to `/auth/signin?error=expired` |
| POST form-encoded valid token: redirects to dashboard | Status 303, Location contains dashboard path |
| POST form-encoded valid token: sets session cookie | `fc_portal_session` cookie present |
| POST form-encoded expired token: redirects to signin | Status 303, Location contains `/auth/signin?error=expired` |
| POST form-encoded already-consumed: redirects to signin | Status 303 to `/auth/signin?error=expired` |
| POST JSON valid token: preserves existing JSON behavior | Status 200, JSON body `{ success: true }` (regression) |
| POST JSON invalid token: preserves existing error behavior | Status 400, JSON body `{ error: "INVALID_TOKEN" }` (regression) |

**Test helper additions:**

```typescript
function buildFormPostRequest(token: string): NextRequest {
  const body = new URLSearchParams({ token, _redirect: "1" });
  return new NextRequest("http://localhost:3000/api/auth/magic-link/consume", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
}
```

### No Changes Required

| File | Reason |
|---|---|
| `src/app/api/auth/magic-link/request/route.ts` | Email link URL structure unchanged — still points to GET |
| `src/lib/server/session.ts` | Token verification + session writing functions unchanged |
| `src/lib/server/security-guards.ts` | One-time consumption guard unchanged |
| `src/app/auth/signin/page.tsx` | Already handles `?error=expired` correctly |
| `src/lib/api-client.ts` | No client-side magic link consumption |

---

## Acceptance Criteria

- [x] GET `/api/auth/magic-link/consume?token=...` with valid token returns HTML page (status 200, content-type `text/html`)
- [x] GET response does NOT call `consumeMagicLinkOneTime` (token not consumed on GET)
- [x] GET response does NOT set `fc_portal_session` cookie
- [x] GET response includes security headers: `Cache-Control: no-store`, `Referrer-Policy: no-referrer`, `X-Robots-Tag: noindex, nofollow`
- [x] GET with expired/tampered/missing token redirects to `/auth/signin?error=expired`
- [x] HTML page contains form with `method="POST"` and hidden token field
- [x] HTML page is fully self-contained (zero external requests — inline SVG logo, inline styles)
- [x] HTML page is accessible: `lang="en"`, proper heading, keyboard-navigable submit button
- [x] HTML page is mobile-responsive
- [x] POST with `application/x-www-form-urlencoded` body consumes token and redirects 303 to correct dashboard
- [x] POST with `application/json` body preserves existing JSON response contract (regression safety)
- [x] POST form-mode failure redirects to `/auth/signin?error=expired`
- [x] Diagnostic `console.error` logs at each failure branch in `consumeToken()` with distinct messages
- [x] All existing tests updated, all new tests passing
- [x] End-to-end test: send magic link to a Microsoft 365 mailbox, confirm first human click succeeds

---

## Edge Cases Considered

| Scenario | Expected Behavior | Notes |
|---|---|---|
| Safe Links pre-fetches GET | Returns HTML, bot discards, token survives | Primary fix target |
| Token expires while user is on landing page | POST fails → redirect to signin with "expired" | 30-min TTL; user can request new link |
| User clicks link twice (second tab) | First POST succeeds, second POST fails (already consumed) | Expected one-time behavior |
| User bookmarks landing page URL | GET renders page; if token expired, redirects to signin | Token in URL is same as in original email |
| Browser back button after successful POST | "Confirm resubmission" dialog (303 mitigates in most browsers) | Acceptable |
| Forwarded link — two people click | First POST succeeds, second fails | Expected; token is user-specific |
| User deactivated between GET and POST | GET shows landing page (no DB check), POST fails on user lookup | Rare; acceptable UX gap |
| Google/Barracuda/Mimecast link scanners | Same fix — they only send GET | Covers all known email security scanners |
| No-JS browser | Native form submit works | Zero-JS design |

---

## Estimated Effort

| Task | Time |
|---|---|
| GET handler rewrite + HTML template | 45 min |
| POST handler dual-mode branch | 30 min |
| Diagnostic logging | 10 min |
| Test updates + new tests | 45 min |
| Manual Microsoft 365 end-to-end test | 15 min |
| **Total** | **~2.5 hours** |

---

## Rollback

Revert the single commit. Magic links go back to being broken for Microsoft 365 users (status quo). No database changes, no data impact.

---

## References

- **Parent plan:** `docs/plans/2026-03-11-chore-mvp-full-launch-plan.md` (Gap 9, Task 2a)
- **Consume route:** `src/app/api/auth/magic-link/consume/route.ts`
- **Consume tests:** `src/app/api/auth/magic-link/consume/route.test.ts`
- **Request route:** `src/app/api/auth/magic-link/request/route.ts`
- **Token utilities:** `src/lib/server/session.ts` (lines 150-158)
- **One-time guard:** `src/lib/server/security-guards.ts` (lines 105-142)
- **Signin page:** `src/app/auth/signin/page.tsx`
- **FC logomark:** `public/fc-logomark.svg` (inline as SVG in landing page)
- **Brand colors:** `src/app/globals.css` — `#3253FF` (fc-600), `#141928` (fc-950), Arial font
