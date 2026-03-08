---
status: pending
priority: p2
issue_id: pr4
tags: [performance, headshots, supabase, storage, coach-selection]
---

# Headshot Signed URL Fetched per Coach per Request — No Caching

## Problem Statement

`resolveCoachPhotoUrl` in `src/lib/server/headshots.ts` makes an outbound Supabase Storage API call for each coach that has a `photoPath` when `SUPABASE_HEADSHOTS_BUCKET_MODE` is set to `private` (the default). The `toParticipantCoachCards` function calls this for every coach in the batch using `Promise.all`.

For a batch of 3 coaches on the initial load, this is 3 simultaneous Supabase Storage API calls per participant page load. For the remix path it is another 3. Signed URLs expire after `SIGNED_URL_TTL_SECONDS` (default 3600 seconds / 1 hour), but are re-fetched on every request rather than being cached.

With 400 participants loading the page near-simultaneously around March 16 launch, this is potentially 400 × 6 = 2400 Supabase Storage sign requests within a short window.

## Findings

File: `/Users/amitbhatia/.cursor/franklin-covey/src/lib/server/headshots.ts`

```typescript
export async function resolveCoachPhotoUrl(photoPath: string | null | undefined): Promise<string | undefined> {
  // ...
  const signUrl = `${supabaseUrl}/storage/v1/object/sign/${HEADSHOTS_BUCKET}/${encodedPath}`;
  const response = await fetch(signUrl, {
    method: "POST",
    // ...
    cache: "no-store", // Explicitly disabled caching
  });
  // ...
}
```

`cache: "no-store"` ensures Next.js data cache is bypassed. Each request generates fresh signed URLs regardless of recent identical requests.

For the public bucket mode (`SUPABASE_HEADSHOTS_BUCKET_MODE=public`), URLs are static and this is not an issue. But the default is private.

## Proposed Solutions

**Option A — Switch to public bucket for headshots (simplest):**

Headshot photos are not sensitive data. Set `SUPABASE_HEADSHOTS_BUCKET_MODE=public` in staging and production. Supabase public URLs are permanent and require no API call. This eliminates the problem entirely.

**Option B — Server-side cache with TTL (if staying private):**

Add a `globalThis.__signedUrlCache: Map<string, { url: string; expiresAt: number }>` cache keyed by `photoPath`. Check cache before signing; populate on miss with `expiresAt = now + (TTL - 60s buffer)`. Same single-instance caveat as the rate limiter applies.

**Option C — Precompute signed URLs at import time:**

Run a script that signs all coach photo URLs for the 24h period and stores them in a Supabase table or the generated map JSON. Refresh daily via cron.

Recommendation: Option A for MVP (headshots are not sensitive). If FC compliance requires private storage, use Option B.

## Acceptance Criteria

- [ ] Either: bucket mode is set to public (no API call per photo) — OR —
- [ ] Signed URL cache implemented with TTL-based invalidation
- [ ] Under simulated 400-concurrent-user load, photo resolution does not create Supabase API rate-limit errors
- [ ] `SUPABASE_HEADSHOTS_BUCKET_MODE` value and rationale documented in `.env.example`

## Work Log

- 2026-02-25: Identified during PR #4 review — `cache: "no-store"` + per-request signing pattern
