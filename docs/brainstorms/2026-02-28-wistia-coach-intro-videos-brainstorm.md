# Brainstorm: Wistia Coach Introduction Videos

**Date:** 2026-02-28
**Status:** Ready for planning
**Timeline constraint:** ~36 hours to Phase 1 go-live

## What We're Building

Embed Wistia-hosted coach introduction videos on the participant coach selection page. Videos replace the headshot photo as the hero element on coach cards, giving participants a richer signal for choosing their coach.

## Why This Approach

- **Video-first cards**: Wistia player replaces the photo slot on coach cards. Participants see the video thumbnail with a play button as their first impression.
- **Photo fallback**: Coaches without videos gracefully degrade to the current headshot photo card. No visual gaps.
- **Static mapping file**: Coach email → Wistia media ID stored in `src/lib/wistia/media-map.json` (same pattern as `generated-map.json` for photos). Zero DB migration risk.
- **Modal unchanged**: `CoachBioModal` keeps current photo layout. Video is card-exclusive.

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Video placement | Inline on cards (video-first) | Maximum impact, video as hero element |
| No-video fallback | Show headshot photo | Seamless degradation, no content gaps |
| Data storage | Static JSON mapping file | No DB migration, ships in hours, same proven pattern |
| Modal treatment | Keep photo in modal | Reduces scope, modal unchanged |
| Video coverage | Starting with subset | Not all 32 coaches have videos yet |
| Wistia integration | `@wistia/wistia-player-react` npm package | Official React wrapper, handles script loading |

## Wistia Embed Settings

```
player-color="#1A4C6E"         // FC brand navy
aspect={16/9}                  // Prevent layout shift
preload="metadata"             // Fast start, no video bytes until play
settings-control={false}       // Hide gear icon
playback-rate-control={false}  // Unnecessary for ~90s intros
quality-control={false}        // Wistia auto-selects
rounded-player={8}             // Match card border-radius
```

## Risk Assessment

- **Overall: Low risk** -- purely frontend + static config
- No database migration
- No API route structural changes
- Graceful fallback for coaches without videos
- Wistia player is ~45KB total, video bytes deferred until play
- Estimated implementation: 2-4 hours

## Files Affected

1. `src/app/participant/select-coach/page.tsx` -- Card layout (photo → player swap)
2. `src/lib/server/participant-coach-service.ts` -- Thread wistiaMediaId to response
3. `src/lib/api-client.ts` -- Add wistiaMediaId to type
4. **New:** `src/lib/wistia/media-map.json` -- Email → media ID mapping
5. `package.json` -- Add @wistia/wistia-player-react

## Open Questions

- Exact list of coaches with videos + their Wistia media IDs (user to provide)
- FC brand color confirmation for player controls (#1A4C6E or other)
