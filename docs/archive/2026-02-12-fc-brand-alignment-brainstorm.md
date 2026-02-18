# FC Brand Alignment - Brainstorm

**Date**: 2026-02-12
**Status**: Ready for planning
**Participants**: Amit + Claude

---

## What We're Building

A full brand refresh of the FranklinCovey Coaching Platform to align with FranklinCovey's official brand identity. The current "Quiet Luxury" design system (navy/gold/sage, paper textures, grain overlays) will be replaced with FC's clean, minimal, corporate aesthetic across all pages.

### The Problem

The platform currently uses a bespoke "Quiet Luxury" design system that, while polished, doesn't match FranklinCovey's actual brand. When 400 government participants access this tool, it should feel like an official FranklinCovey product — not a third-party app.

### Success Criteria

- All pages visually feel like an extension of franklincovey.com
- Typography, colors, and button styles match FC's brand guidelines
- The design is clean and minimal (corporate, not boutique)
- No functional regressions — all interactive elements still work

---

## Why This Approach

### Brand Research Summary

**Source**: [Brandfetch](https://brandfetch.com/franklincovey.com), [Stoke Group rebrand case study](https://thestokegroup.com/portfolio/franklincovey-rebrand/), franklincovey.com analysis

FranklinCovey's official brand uses:

| Element | Official | Our Substitute |
|---------|----------|----------------|
| Title font | **TiemposFine** (Klim Type Foundry, $$) | **Cormorant Garamond** (Google Fonts) |
| Body font | **Rand** (Optimo, $$) | **Inter** (Google Fonts) |
| Primary accent | `#3253FF` Blue Ribbon | `#3253FF` (already matched) |
| Dark background | `#141928` Mirage | `#141928` (already matched) |
| Button style | Pill-shaped (`border-radius: 9999px`) | Currently `0.625rem` - needs update |
| Visual approach | Clean, minimal, white-dominant | Currently textured (grain, paper) |

We chose Google Fonts alternatives because TiemposFine and Rand are premium commercial fonts. Cormorant Garamond is already a known pairing with Rand-family fonts and shares TiemposFine's sharp editorial serif character. Inter is the closest free match to Rand's neutral Swiss grotesque aesthetic.

---

## Key Decisions

### 1. Typography

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Heading font | **Keep Cormorant Garamond** | Already close to TiemposFine. Known pairing with Rand-family fonts. |
| Body font | **Swap Plus Jakarta Sans to Inter** | Inter is closer to Rand's clean Swiss aesthetic than Plus Jakarta Sans. |

### 2. Color Palette — Consolidate to FC

**Before (4 scales):** navy, gold, sage, fc-blue
**After (1 primary scale + functional accents):**

- **Primary**: `fc` scale (`#3253FF` Blue Ribbon through `#141928` Mirage) — all brand elements
- **Gold**: Keep ONLY for status badge `.status-coach-selected` — remove gold button variants
- **Sage**: Drop entirely — use green/emerald Tailwind defaults for success states if needed
- **Navy**: Drop — use `fc` scale dark end instead (`fc-900`, `fc-950`)
- **Grays**: Use Tailwind default gray/slate scale for neutral UI elements
- **Status colors**: Simplify to use `fc` scale + Tailwind defaults (blue for in-progress, green for completed, red for canceled, amber for on-hold)

### 3. Button Style — Pill Buttons

- All buttons get `border-radius: 9999px` (pill shape)
- Primary CTA: `fc-600` (#3253FF) background, white text
- Secondary: white/transparent background, `fc-600` border/text
- Remove `gold` and `gold-outline` button variants
- Keep `destructive`, `ghost`, `link`, `outline` variants

### 4. Visual Cleanup — Remove Luxury Textures

- **Remove** `.paper-texture` class and all references
- **Remove** `.grain` class and the SVG noise filter
- **Remove** `.gold-shimmer` animation
- **Simplify** backgrounds to clean white/light gray/fc-950 dark
- **Keep** staggered entrance animations (`fade-in`, `stagger-*`) — these are UX, not decoration
- **Keep** smooth scrolling and focus styles

### 5. Scope — All Pages

Every page gets the brand refresh:
- `src/app/page.tsx` (landing page)
- `src/app/participant/select-coach/page.tsx`
- `src/app/participant/engagement/page.tsx`
- `src/app/coach/dashboard/page.tsx`
- `src/app/coach/engagement/page.tsx`
- `src/app/admin/dashboard/page.tsx`
- `src/app/admin/coaches/page.tsx`
- `src/app/admin/import/page.tsx`
- `src/components/navigation.tsx` (PortalShell sidebar)
- `src/components/ui/button.tsx` (pill radius + remove gold variants)
- `src/components/ui/badge.tsx` (remove gold/sage variants)
- `src/components/ui/card.tsx` (remove paper-texture)

---

## Open Questions

| # | Question | Impact |
|---|----------|--------|
| 1 | Should we add the FC logo SVG to the header/nav? | Visual brand alignment |
| 2 | FC's site uses dark gray (`#32373c`) for primary buttons, not blue. Should our primary CTA be blue or dark gray? | Button hierarchy |
| 3 | Should `::selection` highlight color change from gold to fc-blue? | Minor polish detail |

---

## Files Affected

### Config / Foundation (change once, propagates)
- `tailwind.config.ts` — font family swap, remove navy/sage/gold scales (or keep gold minimal), update radius default
- `src/app/globals.css` — swap Google Fonts import (Inter replaces Plus Jakarta Sans), remove texture utilities, update HSL variables, update status colors, update selection color
- `src/app/layout.tsx` — update font loading if using next/font

### Components (update variants)
- `src/components/ui/button.tsx` — pill radius, remove gold variants, update default color
- `src/components/ui/badge.tsx` — remove gold/sage variants, add fc-blue variants
- `src/components/ui/card.tsx` — remove paper-texture reference
- `src/components/navigation.tsx` — sidebar colors from navy to fc scale

### Pages (update color classes)
- All 8+ pages — find/replace navy-* with fc-* equivalents, gold-* with fc-* or remove, sage-* with green/emerald defaults

---

## Implementation Estimate

| Phase | Effort |
|-------|--------|
| Foundation (tailwind + globals + fonts) | ~30 min |
| Component updates (button, badge, card, nav) | ~45 min |
| Page-by-page color class updates | ~1.5 hours |
| Visual QA + adjustments | ~30 min |
| **Total** | **~3 hours** |

---

## Next Steps

Run `/workflows:plan` to generate the detailed implementation plan from this brainstorm.
