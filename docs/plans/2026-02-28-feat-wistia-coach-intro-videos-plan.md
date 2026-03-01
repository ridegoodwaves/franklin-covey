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
2. **Progressive enhancement** -- Photo always renders first; video overlays on top when ready
3. **Performance** -- `preload="none"`, dynamic import, preconnect hints save ~50% page weight
4. **Race condition mitigations** -- Synchronous pause before remix/modal, module-scope mutex
5. **Architecture correction** -- Resolver moved to `src/lib/server/wistia.ts` per established patterns

### Scope Reduction (Simplicity Review)
Original plan: 8 files, 3 new abstractions, cross-component state management
**Tier 1 plan: 5 files, 1 thin component, minimal coordination**

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
| Multiple videos | Single-active-player via module-scope mutex | Prevent simultaneous audio overlap |
| Error handling | Photo as base layer; video overlays when ready | Progressive enhancement -- never a blank card |
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
- Wistia player overlays on top only after it reports ready
- If Wistia never loads (CDN blocked, bad ID), participant sees the photo -- zero degraded UX
- Eliminates the 10-second timeout race condition entirely

---

## Technical Approach

### Tier 1: Ship in 36 Hours (5 files)

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
  "darren.jones@franklincovey.com": "1zaxkjtw1m",
  "coach.email@franklincovey.com": "abc123def"
}
```

- Same pattern as `src/lib/headshots/generated-map.json`
- **Server-side import only** -- imported from `src/lib/server/wistia.ts`, never from `'use client'` components
- Coaches without videos are simply omitted from the file

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
  readonly onReady?: () => void;
  readonly onError?: () => void;
}

export function WistiaCoachPlayer({ mediaId, coachName, onReady, onError }: WistiaCoachPlayerProps) {
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
        onLoadStart={onReady}
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
  const [videoReady, setVideoReady] = useState(false);

  // At-capacity coaches: always show existing avatar, never video
  if (coach.atCapacity || !coach.wistiaMediaId) {
    return null; // Existing Avatar component renders in CardHeader as before
  }

  // Coach has video: photo base layer + video overlay
  return (
    <div className="relative aspect-video overflow-hidden rounded-lg">
      {/* Photo always renders -- instant, zero-delay fallback */}
      {coach.photo && (
        <img
          src={coach.photo}
          alt={coach.name}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}

      {/* Video overlays on top when ready */}
      <div className={cn(
        "absolute inset-0 transition-opacity duration-300",
        videoReady ? "opacity-100" : "opacity-0"
      )}>
        <WistiaCoachPlayer
          mediaId={coach.wistiaMediaId}
          coachName={coach.name}
          onReady={() => setVideoReady(true)}
          onError={() => setVideoReady(false)}
        />
      </div>
    </div>
  );
}
```

**Card layout change:** Only cards with `wistiaMediaId` get the video treatment. Cards without video keep the existing circular `Avatar` layout unchanged. This eliminates the visual regression risk for photo-only coaches.

#### Research Insight: Type Narrowing (TypeScript Review)

The conditional `if (coach.atCapacity || !coach.wistiaMediaId)` narrows `wistiaMediaId` from `string | undefined` to `string` in the video branch. Do NOT use a separate `hasVideo` boolean -- it creates a sync hazard.

#### 1.7 Single-active-player behavior

**Per Wistia docs + Frontend Races Review:** Use module-scope mutex, not React state.

```typescript
// At module scope in select-coach/page.tsx (NOT in a component)
let activePlayerId: string | null = null;

function pauseAllWistiaPlayers() {
  document.querySelectorAll('wistia-player').forEach((el) => {
    if (typeof (el as any).pause === 'function') {
      (el as any).pause();
    }
  });
  activePlayerId = null;
}
```

**Wistia also provides a built-in approach** (from Context7 docs):

```javascript
window._wq = window._wq || [];
_wq.push({ id: "_all", onReady: function(video) {
  video.bind('play', function() {
    var allVideos = Wistia.api.all();
    for (var i = 0; i < allVideos.length; i++) {
      if (allVideos[i].hashedId() !== video.hashedId()) {
        allVideos[i].pause();
      }
    }
  });
}});
```

**Recommendation:** Use `pauseAllWistiaPlayers()` for explicit pause points (remix, modal) and let Wistia's `_all` handler manage play-toggling between videos.

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

**In `select-coach/page.tsx` or its layout** (Performance Review):

```typescript
import Head from 'next/head';

// In the component return:
<Head>
  <link rel="preconnect" href="https://fast.wistia.com" crossOrigin="anonymous" />
  <link rel="dns-prefetch" href="https://fast.wistia.com" />
</Head>
```

**Only on the select-coach page** -- participants on the email verification page should not pay DNS resolution cost for a CDN they haven't reached yet.

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

- [ ] Coaches with Wistia media IDs show a 16:9 video player on their card
- [ ] Coaches without Wistia media IDs keep the existing circular avatar layout
- [ ] At-capacity coaches always show avatar (not video), regardless of Wistia ID
- [ ] Clicking play starts the video; only one video plays at a time
- [ ] Video player uses FC brand color (#1A4C6E) for controls
- [ ] "Remix" pauses all videos before swapping coaches, mounts new players cleanly
- [ ] If Wistia fails to load, participant sees the coach photo (progressive enhancement)
- [ ] Coach photo always renders first; video fades in on top when ready
- [ ] No coach emails exposed to client (server-side mapping lookup)

### Tier 2 (Fast Follow)

- [ ] All card heights consistent regardless of video/photo mix (16:9 everywhere)
- [ ] CoachBioModal removes "Watch intro video" link for coaches with inline video
- [ ] Video pauses when bio modal or confirmation dialog opens (effect-based)
- [ ] Page load increase is under 100KB gzipped
- [ ] Works on mobile (responsive 16:9 player, tap to play)
- [ ] Accessible: `aria-label` on player, keyboard-navigable play button

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
| Two play events near-simultaneous | P1 | Module-scope `activePlayerId` mutex (sync, not state) |
| Modal opens while player initializing | P1 | Explicit pause + 1.5s delayed re-check for late-init |
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

## Pre-Go-Live Checklist

- [ ] Verify Wistia CDN accessibility from USPS network endpoint
- [ ] Confirm which coaches have videos + collect all Wistia media IDs
- [ ] Populate `src/lib/wistia/media-map.json` with email -> media ID entries
- [ ] Test: 3 coaches with video (all video cards)
- [ ] Test: 3 coaches without video (all avatar cards, unchanged)
- [ ] Test: mixed set (some video, some avatar)
- [ ] Test: at-capacity coach with video (should show avatar)
- [ ] Test: remix flow while video is playing (should pause, swap cleanly)
- [ ] Test: click play on video A, then play on video B (A should pause)
- [ ] Test on mobile viewport
- [ ] Check captions status on Wistia videos (Section 508 flag for stakeholders)

---

## Tier 1 File Change Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `package.json` | Modify | Add `@wistia/wistia-player-react` |
| `src/lib/wistia/media-map.json` | **New** | Coach email -> Wistia media ID mapping |
| `src/lib/server/wistia.ts` | **New** | `resolveWistiaMediaId()` -- 8-line server module |
| `src/lib/api-client.ts` | Modify | Add `wistiaMediaId?: string` to `ParticipantCoachCard` |
| `src/lib/server/participant-coach-service.ts` | Modify | Lookup + thread `wistiaMediaId` in `toParticipantCoachCards()` |
| `src/app/participant/select-coach/WistiaCoachPlayer.tsx` | **New** | Thin Wistia wrapper (~25 lines) with FC defaults |
| `src/app/participant/select-coach/page.tsx` | Modify | Card media swap, dynamic import, single-active-player, preconnect |

## Future Considerations (Post-MVP)

- Add `wistiaMediaId` column to `CoachProfile` Prisma schema (replace static JSON)
- Add Wistia domains to CSP allowlist when security hardening is implemented
- Video analytics: track play rates per coach for matching insights
- Consider iframe embed as lighter alternative if npm package proves problematic
- Consider popover mode for video in CoachBioModal
- Mobile-specific treatment: suppress inline player, show "Watch Video" link

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
