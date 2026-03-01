---
title: Wistia Coach Introduction Videos
type: feat
date: 2026-02-28
timeline: 36 hours to go-live
risk: low
brainstorm: docs/brainstorms/2026-02-28-wistia-coach-intro-videos-brainstorm.md
deepened: 2026-02-28
review-agents: typescript, performance, frontend-races, security, simplicity, architecture, pattern-recognition, learnings
---

# feat: Wistia Coach Introduction Videos

## Enhancement Summary

**Deepened on:** 2026-02-28
**Review agents:** 8 (TypeScript, Performance, Frontend Races, Security, Simplicity, Architecture, Pattern Recognition, Learnings)

### Key Improvements from Deepening
1. **Tiered scope** -- Split into Tier 1 (ship in 36h) and Tier 2 (fast follow) to reduce risk
2. **Progressive enhancement** -- Photo always renders first; video mounts deterministically on top (no load-event visibility gate)
3. **Performance** -- `preload="none"`, dynamic import, App Router page-level preconnect hints
4. **Race condition mitigations** -- Synchronous pause before remix/modal + `onPlay` pause-other helper
5. **Architecture correction** -- Resolver moved to `src/lib/server/wistia.ts` per established patterns
6. **Release safety** -- Feature flag kill switch enables instant rollback without redeploy

### Scope Reduction (Simplicity Review)
Original plan: 11 files, 3 new abstractions, cross-component state management
**Tier 1 plan: 8 product files + targeted tests, 1 thin component, minimal coordination**

| Cut from Tier 1 | Reason | When to Add |
|------------------|--------|-------------|
| CoachBioModal changes | Don't touch working components for polish | Tier 2 |
| Universal 16:9 card redesign | Only change cards that have video | Tier 2 |
| Separate `resolve-media-id.ts` file | One-line lookup; inline it | Never (YAGNI) |

---

## Overview

Embed Wistia-hosted coach introduction videos (~90s each) as the hero element on participant coach selection cards. Participants see the video thumbnail with a play button as their primary impression of each coach, enabling a richer matching experience. Coaches without videos gracefully fall back to the current headshot photo.

## Problem Statement / Motivation

The current coach selection experience relies on a small circular avatar photo, a short bio, and credentials. For a decision as personal as choosing a coach, participants have limited signal. Short video introductions let coaches convey personality, communication style, and warmth -- dramatically improving match quality.

Videos are already recorded, exported, and uploaded to Wistia. This plan covers embedding them into the existing selection flow.

## Proposed Solution

**Video-first coach cards** with graceful photo fallback, powered by Wistia's official React component and a static JSON mapping file.

### Data Flow

```
src/lib/wistia/media-map.json          <- Static: coach email -> Wistia media ID
  | (imported server-side ONLY)
src/lib/server/wistia.ts               <- Inline lookup in server module
  |
participant-coach-service.ts            <- Lookup during toParticipantCoachCards()
  |
ParticipantCoachCard.wistiaMediaId      <- New optional field in API response
  |
select-coach/page.tsx                   <- Render WistiaPlayer or existing avatar
```

### Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Video placement | Inline on cards (hero element) | Maximum impact, video-first experience |
| No-video fallback | **Keep existing circular avatar** (Tier 1) | Don't redesign working photo cards; only change cards with video |
| At-capacity + video | Show existing avatar, not video | Don't tease unavailable coaches with engaging video |
| Data storage | Static JSON mapping (server-side import) | No DB migration, proven pattern, ships fast |
| Data contract | New `wistiaMediaId` field (not repurpose `videoUrl`) | Different purpose: media ID vs external URL |
| Multiple videos | `onPlay` pause-other helper + explicit transition pauses | Prevent simultaneous audio overlap |
| Error handling | Photo/initials as base layer; video mounts immediately and hides only on error | Progressive enhancement -- never a blank card |
| Wistia integration | `@wistia/wistia-player-react` via `next/dynamic` | Official React wrapper, SSR-safe with dynamic import |
| Preload strategy | **`preload="none"`** | Only loads minimum to render player; no metadata fetch until play intent |

### Research Insights: Design Decision Rationale

**Why `preload="none"` over `preload="metadata"` (Performance Review):**
- `preload="metadata"` forces 3 HTTP requests to Wistia servers before any play intent
- On USPS government networks (corporate proxy, DNS filtering, bandwidth caps), each hop adds 100-500ms
- `preload="none"` loads only the minimum to render the player UI; swatch thumbnails still display
- Saves ~10-30KB and 3 round-trips per page load for participants who never play a video

**Why keep existing avatar for photo-only cards (Simplicity Review):**
- Redesigning ALL cards to 16:9 rectangular layout doubles QA surface and risks visual regression
- Cards with video get the 16:9 player; cards without video keep the proven circular avatar
- Consistent height across mixed sets is a Tier 2 concern -- the height difference is acceptable for launch

**Why progressive enhancement over error-timeout fallback (Performance + Races Review):**
- Always render the coach photo first (base layer)
- Wistia player mounts immediately on top (deterministic), with error fallback to photo-only
- If Wistia never loads (CDN blocked, bad ID), participant sees the photo -- zero degraded UX
- Eliminates the 10-second timeout race condition entirely

---

## Technical Approach

### Tier 1: Ship in 36 Hours (8 product files + tests)

#### 1.0 Add rollout kill switch (required)

Gate all inline video rendering behind an env flag:

```env
NEXT_PUBLIC_ENABLE_WISTIA_COACH_VIDEOS=true
```

- `false` => existing avatar-only experience (fast rollback path)
- `true` => Wistia video experience enabled for coaches with mapped media IDs
- Read from client page with `process.env.NEXT_PUBLIC_ENABLE_WISTIA_COACH_VIDEOS === "true"`
- Add to `.env.example` for discoverability

**Approved defaults (2026-03-01):**
- `staging`: `NEXT_PUBLIC_ENABLE_WISTIA_COACH_VIDEOS=true`
- `production`: `NEXT_PUBLIC_ENABLE_WISTIA_COACH_VIDEOS=false` until local + preview sign-off

**Promotion note:** this is a `NEXT_PUBLIC_*` flag, so changing production to `true` requires env update + redeploy.

#### 1.1 Install Wistia React package

```bash
npm install @wistia/wistia-player-react
```

Verify compatibility with React 19 + Next.js 15 App Router. If incompatible, fall back to vanilla `<wistia-player>` web component with imperative DOM management:

```typescript
// Escape hatch (if React wrapper fails with React 19)
useEffect(() => {
  const player = document.createElement('wistia-player');
  player.setAttribute('media-id', mediaId);
  containerRef.current?.appendChild(player);
  return () => { containerRef.current?.removeChild(player); };
}, [mediaId]);
```

#### Research Insight: React 19 Strict Mode

React 19 Strict Mode double-invokes effects: mount -> unmount -> mount. Wistia's web component handles `disconnectedCallback` cleanup, so double-init in dev is expected but harmless. The escape hatch above sidesteps React's reconciliation entirely if needed.

#### 1.2 Create Wistia media mapping file

```
src/lib/wistia/media-map.json
```

```json
{
  "armin.pajand@franklincovey.com": "o5p8ck2u9a",
  "ashley.seeley@franklincovey.com": "2obttzt558",
  "beth.toth@franklincovey.com": "jk75kuseij",
  "bethany.klynn@franklincovey.com": "4acordbi05",
  "christophe.leroy@franklincovey.com": "ck3sx3fqw5",
  "dani.fake@franklincovey.com": "lunscwnyx5",
  "darren.jones@franklincovey.com": "nsbgwix3il",
  "david.dye@franklincovey.com": "535n3njg3l",
  "deb.mitchell@franklincovey.com": "4ew2p2toqs",
  "devi.mcfadden@franklincovey.com": "pf2auqipvy",
  "didier.perrileux@franklincovey.com": "o8hidbcmoo",
  "greg.goates@franklincovey.com": "tfvy29l10c",
  "heather.vassilev@franklincovey.com": "mjx6jo2hl0",
  "helle.hegelund@franklincovey.com": "ds9mspz7u3",
  "henry.lescault@franklincovey.com": "603fk97lmb",
  "jennifer.irwin@franklincovey.com": "x00f7palkr",
  "jennifer.sanders@franklincovey.com": "6gn2trb3z6",
  "jessica.mccann@franklincovey.com": "djmcxk4acq",
  "karen.agrait@franklincovey.com": "37y5biskw7",
  "kasia.jamroz@franklincovey.com": "kofjameq2n",
  "kevin.cheesebrough@franklincovey.com": "jzc2fkk1lx",
  "kristen.schmitt@franklincovey.com": "75eo8ybohf",
  "kristen.dombrowski@franklincovey.com": "qs9d5yfpn6",
  "missy.mcnabb@franklincovey.com": "cc5g702fv0",
  "nnenna.ozobia@franklincovey.com": "mc339uhr8h",
  "ofelia.olivero@franklincovey.com": "t67veeb7bu",
  "pallavi.ridout@franklincovey.com": "liqfyg9j6u",
  "rogelio.marroquin@franklincovey.com": "7jw03ewu29",
  "sarah.hyche@franklincovey.com": "xbokzucnnp",
  "taylor.morrison@franklincovey.com": "mws9dh3o3n",
  "yuval.goren@franklincovey.com": "1zaxkjtw1m"
}
```

- Same pattern as `src/lib/headshots/generated-map.json`
- **Server-side import only** -- imported from `src/lib/server/wistia.ts`, never from `'use client'` components
- Coaches without videos are simply omitted from the file
- Approved canonical Didier mapping: `didier.perrileux@franklincovey.com` only

#### Research Insight: Type Safety on JSON Import

Use `satisfies` at the import site for compile-time structural checking:

```typescript
import rawMediaMap from '../wistia/media-map.json';
const mediaMap = rawMediaMap satisfies Record<string, string>;
```

This catches malformed entries (non-string values, wrong structure) at compile time without runtime overhead.

#### 1.3 Server-side lookup (inline in existing module)

**Per architecture review:** Place the lookup in `src/lib/server/wistia.ts` -- matching the pattern where static data lives in `src/lib/<domain>/` and server resolution lives in `src/lib/server/<domain>.ts`.

```
src/lib/server/wistia.ts
```

```typescript
import "server-only";
import rawMediaMap from '../wistia/media-map.json';

const mediaMap = rawMediaMap satisfies Record<string, string>;

/** Resolve a Wistia media ID for a coach by email. Returns undefined if no video. */
export function resolveWistiaMediaId(email: string): string | undefined {
  return mediaMap[email.toLowerCase()];
}
```

**Key details (TypeScript Review):**
- Returns `undefined` (not `null`) to match the optional field type `wistiaMediaId?: string`
- Email normalized to lowercase to prevent case-mismatch silent failures
- No separate `resolve-media-id.ts` file -- this is a one-line lookup, inline it

#### 1.4 Thread `wistiaMediaId` through data pipeline

**`src/lib/api-client.ts`** -- Add field to interface:
```typescript
interface ParticipantCoachCard {
  // ... existing fields

  /** External video link (non-embedded). Displayed as text link in bio modal. */
  videoUrl?: string;

  /** Wistia media ID for embedded coach introduction video on card.
   *  When present + coach not at capacity, inline player renders.
   *  NOT related to videoUrl (different purpose). */
  wistiaMediaId?: string;
}
```

**`src/lib/server/participant-coach-service.ts`** -- Add lookup in `toParticipantCoachCards()`:
```typescript
import { resolveWistiaMediaId } from './wistia';

// Inside the map:
wistiaMediaId: resolveWistiaMediaId(coach.profile.user.email),
```

**`src/app/participant/select-coach/page.tsx`** -- Map explicitly in `apiCoachToLocal()`:
```typescript
wistiaMediaId: apiCoach.wistiaMediaId, // explicit, not spread
```

#### 1.5 Create WistiaCoachPlayer component

**Per architecture review:** Colocate with the select-coach page initially (single consumer).

```
src/app/participant/select-coach/WistiaCoachPlayer.tsx
```

A `'use client'` component, **dynamically imported** to avoid SSR hydration issues:

```typescript
// In select-coach/page.tsx:
import dynamic from 'next/dynamic';

const WistiaCoachPlayer = dynamic(
  () => import('./WistiaCoachPlayer').then(m => m.WistiaCoachPlayer),
  {
    ssr: false,
    loading: () => (
      <div
        role="img"
        aria-label="Loading video player"
        className="aspect-video bg-fc-50 animate-pulse rounded-lg"
      />
    ),
  }
);
```

**Component implementation (~25 lines):**

```typescript
'use client';

import { WistiaPlayer } from '@wistia/wistia-player-react';

interface WistiaCoachPlayerProps {
  readonly mediaId: string;     // Required -- caller checks existence
  readonly coachName: string;   // For aria-label
  readonly onPlay?: (mediaId: string) => void;
  readonly onError?: () => void;
}

export function WistiaCoachPlayer({ mediaId, coachName, onPlay, onError }: WistiaCoachPlayerProps) {
  return (
    <div aria-label={`Introduction video for ${coachName}`}>
      <WistiaPlayer
        mediaId={mediaId}
        playerColor="#1A4C6E"
        aspect={16 / 9}
        preload="none"
        settingsControl={false}
        playbackRateControl={false}
        qualityControl={false}
        roundedPlayer={8}
        doNotTrack={true}
        seo={false}
        endVideoBehavior="reset"
        onPlay={() => onPlay?.(mediaId)}
        onError={onError}
      />
    </div>
  );
}
```

**Wistia player settings explained:**

| Setting | Value | Rationale |
|---------|-------|-----------|
| `playerColor` | `#1A4C6E` | FC brand navy |
| `aspect` | `16/9` | Prevents CLS (explicit dimensions before player loads) |
| `preload` | `"none"` | **Changed from "metadata"** -- saves 3 HTTP requests + 10-30KB |
| `settingsControl` | `false` | Unnecessary for ~90s intro videos |
| `playbackRateControl` | `false` | Unnecessary for ~90s intro videos |
| `qualityControl` | `false` | Wistia auto-selects quality |
| `roundedPlayer` | `8` | Matches card border-radius |
| `doNotTrack` | `true` | Privacy: disables Wistia heatmaps/analytics for government context |
| `seo` | `false` | No JSON-LD injection needed for internal tool |
| `endVideoBehavior` | `"reset"` | Returns to thumbnail on completion (not Wistia end screen) |

#### 1.6 Modify coach card in `select-coach/page.tsx`

**Progressive enhancement pattern (Performance + Races Review):**

```typescript
function CoachCardMedia({ coach }: { readonly coach: Coach }) {
  const [videoFailed, setVideoFailed] = useState(false);

  // At-capacity coaches: always show existing avatar, never video
  if (coach.atCapacity || !coach.wistiaMediaId) {
    return null; // Existing Avatar component renders in CardHeader as before
  }

  // Coach has video: photo base layer + video overlay
  return (
    <div className="relative aspect-video overflow-hidden rounded-lg">
      {/* Deterministic base layer, even if video never initializes */}
      <div className="absolute inset-0 bg-fc-50" />
      {coach.photo ? (
        <img
          src={coach.photo}
          alt={coach.name}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-fc-600 to-fc-800">
          <span className="font-display text-3xl font-semibold text-white">{coach.initials}</span>
        </div>
      )}

      {/* Player is mounted immediately; no load-event-based visibility gate */}
      {!videoFailed && (
        <div className="absolute inset-0">
        <WistiaCoachPlayer
          mediaId={coach.wistiaMediaId}
          coachName={coach.name}
          onPlay={pauseOtherWistiaPlayers}
          onError={() => setVideoFailed(true)}
        />
        </div>
      )}
    </div>
  );
}
```

**Card layout change:** Only cards with `wistiaMediaId` get the video treatment. Cards without video keep the existing circular `Avatar` layout unchanged. This eliminates the visual regression risk for photo-only coaches.

#### Research Insight: Type Narrowing (TypeScript Review)

The conditional `if (coach.atCapacity || !coach.wistiaMediaId)` narrows `wistiaMediaId` from `string | undefined` to `string` in the video branch. Do NOT use a separate `hasVideo` boolean -- it creates a sync hazard.

#### 1.7 Single-active-player behavior

Use one explicit strategy for Tier 1: **DOM-level pause helpers + synchronous transition pauses**. Avoid dual registration paths (`_wq` + custom mutex) in MVP.

```typescript
function pauseAllWistiaPlayers() {
  document.querySelectorAll('wistia-player').forEach((el) => {
    if (typeof (el as any).pause === 'function') {
      (el as any).pause();
    }
  });
}

function pauseOtherWistiaPlayers(currentMediaId: string) {
  document.querySelectorAll('wistia-player').forEach((el) => {
    if ((el as Element).getAttribute('media-id') !== currentMediaId &&
        typeof (el as any).pause === 'function') {
      (el as any).pause();
    }
  });
}
```

Wire `pauseOtherWistiaPlayers` to the player's `onPlay` callback so only one player continues at a time.

#### 1.8 Synchronous pause at state transitions

**Critical (Races Review):** Pause videos synchronously before any state transition that changes the card set or opens a modal. Do not rely on React effects -- they are deferred and batched.

```typescript
// Before remix
const handleRemix = useCallback(async () => {
  if (remixUsed) return;
  pauseAllWistiaPlayers(); // FIRST: silence everything
  setMounted(false);
  // ... rest of remix flow
}, [remixUsed]);

// Before coach selection (modal -> confirmation dialog transition)
onSelect={(coachId) => {
  const coach = displayedCoaches.find((c) => c.id === coachId);
  if (coach) {
    pauseAllWistiaPlayers(); // Explicit. Synchronous. Done.
    setBioModalCoach(null);
    setConfirmCoach(coach);
  }
}}

// When bio modal opens
const openBioModal = (coach: Coach) => {
  pauseAllWistiaPlayers();
  setBioModalCoach(coach);
};
```

#### 1.9 Add preconnect hint

**App Router approach:** use route-level `head.tsx`, not `next/head` in a `'use client'` page.

```typescript
// src/app/participant/select-coach/head.tsx
export default function Head() {
  return (
    <>
      <link rel="preconnect" href="https://fast.wistia.com" crossOrigin="anonymous" />
      <link rel="dns-prefetch" href="https://fast.wistia.com" />
    </>
  );
}
```

**Only on the select-coach route** -- participants on email verification should not pay DNS resolution cost for Wistia early.

### Tier 2: Fast Follow (Post Go-Live)

These items were cut from Tier 1 to reduce risk. Each is a 30-60 minute task:

| Item | Description | Effort |
|------|-------------|--------|
| Universal 16:9 cards | Change photo-only cards to 16:9 rectangular for consistent heights | 1 hour |
| CoachBioModal cleanup | Remove "Watch intro video" link for coaches with inline video | 30 min |
| Video pause on modal open | `useEffect` watching modal state + delayed re-check for late-init players | 30 min |
| IntersectionObserver | Defer third card's video on mobile until scrolled into view | 45 min |
| Mobile optimization | Suppress inline player on `< 640px`, show "Watch Video" link instead | 1 hour |
| DB migration | Add `wistiaMediaId` column to `CoachProfile` Prisma schema | 1 hour |
| CSP allowlist | Add `fast.wistia.com`, `embed-ssl.wistia.com` to security headers | 30 min |
| `next.config.ts` update | Add Wistia domains to `images.remotePatterns` | 15 min |

---

## Acceptance Criteria

### Tier 1 (Go-Live)

- [x] Coaches with Wistia media IDs show a 16:9 video player on their card
- [x] Coaches without Wistia media IDs render 16:9 photo/initial fallback media
- [x] At-capacity coaches always show static media (not video), regardless of Wistia ID
- [x] Feature flag `NEXT_PUBLIC_ENABLE_WISTIA_COACH_VIDEOS=false` fully restores avatar-only experience
- [x] Clicking play starts the video; only one video plays at a time
- [x] Video player uses FC brand color (#1A4C6E) for controls
- [x] "Remix" pauses all videos before swapping coaches, mounts new players cleanly
- [x] If Wistia fails to load, participant sees the coach photo (progressive enhancement)
- [x] Coach photo/initials base layer always renders first; no blank card on Wistia error
- [x] No coach emails exposed to client (server-side mapping lookup + `server-only` boundary)
- [x] Preconnect tags are injected via `src/app/participant/select-coach/head.tsx` (App Router-safe)

### Tier 2 (Fast Follow)

- [x] All card heights consistent regardless of video/photo mix (16:9 everywhere)
- [x] CoachBioModal removes "Watch intro video" link for coaches with inline video
- [x] Video pauses when bio modal or confirmation dialog opens (effect-based)
- [x] Page load increase is under 100KB gzipped
- [x] Works on mobile (responsive 16:9 player, tap to play)
- [x] Accessible: `aria-label` on player, keyboard-navigable play button

---

## Performance Budget

| Resource | Current | After Tier 1 (Optimized) |
|----------|---------|--------------------------|
| Client JS bundle | ~80 KB gzip | ~80 KB gzip (dynamic import) |
| Third-party scripts | 0 KB | ~50 KB gzip (player.js, deferred) |
| Images | ~15 KB (3 avatars) | ~15 KB initial (swatches deferred) |
| Metadata fetches | 0 | 0 (`preload="none"`) |
| **Total initial load** | **~95 KB** | **~145 KB** |
| **Waterfall hops** | 2 | 3 (+ preconnect) |

On a 1 Mbps throttled USPS connection, this adds ~400ms of load time (vs ~1.3s unoptimized).

---

## Race Condition Mitigations (Deepening Detail)

| Race Condition | Severity | Mitigation |
|----------------|----------|------------|
| Remix while video plays | P0 | Synchronous `pauseAllWistiaPlayers()` before `setMounted(false)` |
| Two play events near-simultaneous | P1 | `onPlay` -> `pauseOtherWistiaPlayers(currentMediaId)` |
| Modal opens while player initializing | P1 | Explicit synchronous pause before opening modal/confirm dialog |
| Wistia init at 9.5s, timeout fires at 10s | P0 | **Eliminated** -- progressive enhancement pattern replaces timeout |
| Coach selection while video plays | P1 | Synchronous pause before batched `setBioModalCoach`/`setConfirmCoach` |
| React 19 Strict Mode double-mount | P2 | Wistia handles `disconnectedCallback`; escape hatch ready if needed |

---

## Security Considerations (Deepening Detail)

| Concern | Assessment | Action |
|---------|-----------|--------|
| Email mapping leaks to client | **Mitigated** -- import only from `src/lib/server/wistia.ts` | Code review check: no client import of media-map.json |
| Wistia media IDs are semi-public | **Accepted** -- anyone with the ID can view the video. These are professional intro videos, not sensitive content. | No additional protection needed |
| Third-party JS execution (CDN) | **Accepted** -- SRI not feasible for dynamic Wistia scripts. Standard trust model for video embedding. | Monitor for Wistia security advisories |
| `doNotTrack={true}` effectiveness | **Partial** -- disables heatmaps/analytics but Wistia may still collect basic telemetry | Document in stakeholder communications; sufficient for MVP |
| Government network CDN blocking | **Mitigated** -- progressive enhancement ensures photo always visible | Test from USPS endpoint before go-live |

---

## Dependencies & Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| `@wistia/wistia-player-react` incompatible with React 19 | Low | Medium | Vanilla web component escape hatch ready |
| Wistia CDN blocked on USPS network | Low-Medium | High | Progressive enhancement: photo always visible; test from USPS network |
| Section 508 caption requirement | Medium | High | Flag to FC stakeholders (Kari/Andrea); Wistia supports captions in dashboard |
| Card layout visual inconsistency (mixed video/avatar heights) | Low | Low | Accepted for Tier 1; Tier 2 normalizes heights |
| Client bundle leakage of email mapping | Low | Medium | Import only from server module; code review check |
| Late-breaking production issue in third-party video path | Medium | High | Feature flag rollback (`NEXT_PUBLIC_ENABLE_WISTIA_COACH_VIDEOS=false`) |

## Pre-Go-Live Checklist

- [x] Verify Wistia CDN accessibility from USPS network endpoint
- [x] Confirm which coaches have videos + collect all Wistia media IDs
- [x] Populate `src/lib/wistia/media-map.json` with email -> media ID entries
- [x] Validate feature flag off path (avatar-only) in preview
- [x] Validate feature flag on path in preview
- [x] After local + preview sign-off, set production flag to `true` and redeploy
- [x] Test: 3 coaches with video (all video cards)
- [x] Test: 3 coaches without video (all static media cards)
- [x] Test: mixed set (some video, some static media)
- [x] Test: at-capacity coach with video (should show static media)
- [x] Test: remix flow while video is playing (should pause, swap cleanly)
- [x] Test: click play on video A, then play on video B (A should pause)
- [x] Test on mobile viewport
- [x] Check captions status on Wistia videos (Section 508 flag for stakeholders)

### Execution Status (2026-03-01)

- [x] Tier 1 implementation completed
- [x] Tier 2 implementation completed
- [x] Typecheck run continuously during implementation (`npx tsc --noEmit`)
- [x] Validation complete: `npm test` and `npm run build` passing

---

## Implementation File Change Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `package.json` | Modify | Add `@wistia/wistia-player-react` |
| `package-lock.json` | Modify | Lock Wistia dependency graph |
| `.env.example` | Modify | Add `NEXT_PUBLIC_ENABLE_WISTIA_COACH_VIDEOS` toggle |
| `.env.staging.example` | Modify | Set staging default `NEXT_PUBLIC_ENABLE_WISTIA_COACH_VIDEOS=true` |
| `.env.production.example` | Modify | Set production default `NEXT_PUBLIC_ENABLE_WISTIA_COACH_VIDEOS=false` |
| `next.config.ts` | Modify | Add Wistia image domains + CSP allowlist headers |
| `prisma/schema.prisma` | Modify | Add `CoachProfile.wistiaMediaId` field |
| `prisma/migrations/20260301_add_wistia_media_id/migration.sql` | **New** | Add nullable `wistiaMediaId` column |
| `src/lib/wistia/media-map.json` | **New** | Coach email -> Wistia media ID mapping |
| `src/lib/server/wistia.ts` | **New** | `resolveWistiaMediaId()` + `import "server-only"` boundary |
| `src/lib/api-client.ts` | Modify | Add `wistiaMediaId?: string` to `ParticipantCoachCard` |
| `src/lib/server/participant-coach-service.ts` | Modify | Thread `wistiaMediaId` with DB-first, static-map fallback |
| `src/app/participant/select-coach/WistiaCoachPlayer.tsx` | **New** | Thin Wistia wrapper (~25 lines) with FC defaults |
| `src/app/participant/select-coach/page.tsx` | Modify | Universal 16:9 media, dynamic import, single-active-player, feature flag, mobile + defer behavior |
| `src/app/participant/select-coach/head.tsx` | **New** | Route-level preconnect + dns-prefetch tags (App Router-safe) |
| `src/components/CoachBioModal.tsx` | Modify | Hide external video link when inline Wistia video is present |
| `src/__tests__/factories.ts` | Modify | Align `photoPath` typing with strict typecheck |
| `src/app/api/participant/coaches/route.test.ts` | Modify | Assert optional `wistiaMediaId` compatibility in response contract |
| `src/app/api/participant/coaches/remix/route.test.ts` | Modify | Assert optional `wistiaMediaId` compatibility in response contract |
| `src/app/api/participant/coaches/select/route.test.ts` | Modify | Assert optional `wistiaMediaId` compatibility in response contract |

## Future Considerations (Post-MVP)

- Video analytics: track play rates per coach for matching insights
- Consider iframe embed as lighter alternative if npm package proves problematic
- Consider popover mode for video in CoachBioModal

## References

- Brainstorm: `docs/brainstorms/2026-02-28-wistia-coach-intro-videos-brainstorm.md`
- Wistia Aurora Player docs: https://docs.wistia.com/docs/player-attributes-and-properties
- Wistia React component: https://docs.wistia.com/docs/player-react-component
- Wistia Player Events: https://docs.wistia.com/docs/player-events
- Wistia JavaScript Player API (single-active-player): https://docs.wistia.com/docs/javascript-player-api
- Existing photo map pattern: `src/lib/headshots/generated-map.json`
- Existing server resolution pattern: `src/lib/server/headshots.ts`
- Coach selection page: `src/app/participant/select-coach/page.tsx`
- Coach data service: `src/lib/server/participant-coach-service.ts`
- Learnings: `docs/solutions/ui-bugs/coach-selector-session-state-refresh-reset.md`
