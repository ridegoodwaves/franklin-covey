---
title: "feat: FC Brand Alignment Refresh"
type: feat
date: 2026-02-12
brainstorm: docs/brainstorms/2026-02-12-fc-brand-alignment-brainstorm.md
---

# FC Brand Alignment Refresh

## Overview

Full visual brand refresh of the FranklinCovey Coaching Platform to align with FranklinCovey's official brand identity. Replaces the bespoke "Quiet Luxury" design system (navy/gold/sage, paper textures, grain overlays) with FC's clean, minimal, corporate aesthetic. When 400 government participants access this platform, it should feel like an official FranklinCovey product.

**Scope:** 21 files across config, components, and pages — 256 color class replacements, font swap, button restyling, texture removal, and official FC logo integration.

## Problem Statement

The platform currently uses custom colors (navy/gold/sage) and a "boutique" aesthetic that doesn't match FranklinCovey's actual brand. The FC brand colors (`#3253FF` Blue Ribbon, `#141928` Mirage) are already defined in the Tailwind config as the `fc` scale but are unused in any UI. The body font (Plus Jakarta Sans) doesn't match FC's Rand typeface.

## Proposed Solution

Migrate all visual elements to FC brand standards:
1. Swap body font to Inter (closest free match to FC's Rand)
2. Consolidate colors from 4 custom scales to 1 primary (fc) + Tailwind defaults
3. Update buttons to pill shape (matching franklincovey.com)
4. Remove decorative textures for clean corporate aesthetic
5. Replace mock logo with official FranklinCovey logo SVG

---

## Technical Approach

### Color Migration Map

#### Navy -> FC Shade Mapping (179 instances)

| Navy Shade | Hex | FC Replacement | Hex | Context |
|------------|-----|----------------|-----|---------|
| `navy-50` | #f0f3f8 | `fc-50` | #eef1ff | Light backgrounds, hover states |
| `navy-100` | #dce3f0 | `fc-100` | #dfe4ff | Status badges, subtle borders |
| `navy-200` | #b9c7e0 | `fc-200` | #c6ccff | Borders, dividers |
| `navy-300` | #8aa3cb | `fc-300` | #a3a8ff | Focus rings, muted accents |
| `navy-400` | #5b7db5 | `fc-400` | #7e79ff | Secondary text |
| `navy-500` | #3d5f99 | `fc-500` | #6357fa | Medium accents |
| `navy-600` | #2e4a7c | `fc-600` | #3253FF | Primary brand — buttons, links |
| `navy-700` | #1e3a5f | `fc-700` | #2a42d4 | Status text, dark accents |
| `navy-800` | #142b4a | `fc-800` | #2336ab | Dark UI elements |
| `navy-900` | #0c1b33 | `fc-900` | #1e2f87 | Dark backgrounds |
| `navy-950` | #060d1a | `fc-950` | #141928 | Darkest backgrounds (Mirage) |

**Special case — buttons:** Current `bg-navy-800` default buttons become `bg-fc-600` (primary brand blue), not `bg-fc-800`. This matches the brainstorm decision that primary CTA = fc-600.

#### Gold Replacement Map (36 instances — only `.status-coach-selected` stays gold)

| Current Usage | Gold Class | Replacement | Rationale |
|---------------|-----------|-------------|-----------|
| **Status badge** (COACH_SELECTED) | `bg-gold-100 text-gold-800` | **KEEP AS-IS** | Only surviving gold usage |
| **Button variant** (gold) | `bg-gold-600 hover:bg-gold-700` | **Remove variant entirely** — use `default` (fc-600) | Gold CTAs become brand blue |
| **Button variant** (gold-outline) | `border-gold-300 text-gold-700` | **Remove variant entirely** — use `outline` | Gold outlines become fc outline |
| **Attention states** ("Needs Attention" cards) | `border-gold-200 bg-gold-50` | `border-amber-200 bg-amber-50` | Amber = warning/attention in Tailwind convention |
| **Progress bar fill** | `bg-gold-600` | `bg-fc-600` | Brand blue for progress |
| **Notification badge** (sidebar) | `bg-gold-600` | `bg-fc-600` | Brand blue for badges |
| **Drag-active dropzone** | `bg-gold-100 text-gold-700` | `bg-fc-100 text-fc-700` | Brand blue for active state |
| **Import step indicator** | `bg-gold-600 shadow-gold-600/25` | `bg-fc-600 shadow-fc-600/25` | Brand blue for active step |
| **Shimmer effect** | `gold-shimmer` class | **Remove entirely** | Texture elimination |
| **Paper texture** | `rgba(184, 150, 90, 0.03)` in gradient | **Remove entirely** | Texture elimination |
| **Selection highlight** | `hsl(38 40% 54% / 0.2)` | `hsl(230 100% 60% / 0.15)` | FC-blue selection |

#### Sage Replacement Map (41 instances)

| Current Usage | Sage Class | Replacement | Rationale |
|---------------|-----------|-------------|-----------|
| **Status badge** (COMPLETED) | `bg-sage-100 text-sage-700` | `bg-emerald-100 text-emerald-700` | Emerald is richer than green, better for "calm success" |
| **Progress/completion** indicators | `bg-sage-500` / `text-sage-600` | `bg-emerald-500` / `text-emerald-600` | Consistent success color |
| **Availability** indicators | `bg-sage-50 text-sage-700` | `bg-emerald-50 text-emerald-700` | Positive/available state |
| **Badge variant** (sage) | `bg-sage-100 text-sage-700` | **Remove variant** — use inline `bg-emerald-100 text-emerald-700` | Simplify badge variants |

#### HSL CSS Variables Update (globals.css :root)

| Variable | Current HSL | New HSL | Notes |
|----------|-------------|---------|-------|
| `--primary` | `222 47% 20%` (navy-based) | `233 100% 60%` (fc-600 based) | Primary brand color |
| `--primary-foreground` | `30 25% 97%` | `0 0% 100%` | White text on primary |
| `--accent` | `38 40% 54%` (gold-based) | `233 100% 55%` (fc-500) | Accent = brand secondary |
| `--accent-foreground` | `0 0% 100%` | `0 0% 100%` | Keep white |
| `--ring` | `222 47% 20%` (navy-based) | `233 100% 60%` (fc-600) | Focus ring = brand blue |

**Keep unchanged:** `--background`, `--foreground`, `--card`, `--popover`, `--secondary`, `--muted`, `--border`, `--input`, `--destructive`, `--radius`.

#### Status Color System

```css
/* Updated status utilities */
.status-invited       { @apply bg-fc-100 text-fc-700; }
.status-coach-selected { @apply bg-gold-100 text-gold-800; }  /* ONLY gold usage */
.status-in-progress   { @apply bg-blue-50 text-blue-700; }    /* Keep - Tailwind default */
.status-completed     { @apply bg-emerald-100 text-emerald-700; }
.status-canceled      { @apply bg-red-50 text-red-700; }      /* Keep - Tailwind default */
.status-on-hold       { @apply bg-amber-50 text-amber-700; }  /* Keep - Tailwind default */
```

---

### Implementation Phases

#### Phase 1: Foundation (Config + CSS) — ~30 min

Update the three foundational files. All subsequent phases depend on this.

**1.1 `tailwind.config.ts`**

```typescript
fontFamily: {
  display: ["Cormorant Garamond", "Georgia", "serif"],  // KEEP
  body: ["Inter", "system-ui", "sans-serif"],            // SWAP
},
```

- [x] Update `fontFamily.body` from `Plus Jakarta Sans` to `Inter`
- [x] Remove `navy` color scale (lines 58-70) — NOT YET, keep until Phase 3 completes (avoids build errors)
- [x] Remove `sage` color scale (lines 71-82) — NOT YET, keep until Phase 3 completes
- [x] Keep `gold` scale (needed for `.status-coach-selected`)
- [x] Keep `fc` scale (primary brand)

**1.2 `src/app/globals.css`**

- [x] Update Google Fonts import (line 1):
  ```css
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400;1,500&family=Inter:ital,wght@0,100..900;1,100..900&display=swap');
  ```
- [x] Update HSL variables in `:root` (lines 8-29) per mapping table above
- [x] Update status color utilities (lines 94-99) per mapping above
- [x] Remove `.grain::before` utility (lines 56-64)
- [x] Remove `.paper-texture` utility (lines 67-71)
- [x] Remove `.gold-shimmer` utility (lines 74-83)
- [x] Update `::selection` color (line 130-132) to fc-blue:
  ```css
  ::selection {
    background: hsl(233 100% 60% / 0.15);
    color: hsl(222 47% 11%);
  }
  ```

**1.3 `src/app/layout.tsx`**

- [x] No changes needed — fonts loaded via globals.css `@import`, body class uses `font-body` which maps to Inter via tailwind config

**Phase 1 verification:** `npm run build` passes, Inter loads on page.

---

#### Phase 2: Components — ~45 min

Update all UI components with new brand styles. Order: base primitives first, then layout components.

**2.1 `src/components/ui/button.tsx`**

- [x] Update base `buttonVariants` to use `rounded-full` instead of `rounded-md`:
  ```typescript
  // In the CVA base classes:
  "rounded-full"  // was "rounded-md"
  ```
- [x] Update `default` variant: `bg-navy-800 hover:bg-navy-900` → `bg-fc-600 hover:bg-fc-700`
- [x] Update `outline` variant: `border-navy-200 text-navy-800 hover:bg-navy-50 hover:border-navy-300` → `border-fc-200 text-fc-700 hover:bg-fc-50 hover:border-fc-300`
- [x] Update `ghost` variant: `text-navy-700 hover:bg-navy-50 hover:text-navy-900` → `text-fc-700 hover:bg-fc-50 hover:text-fc-900`
- [x] Update `link` variant: `text-navy-700` → `text-fc-700`
- [x] **Remove** `gold` variant entirely
- [x] **Remove** `gold-outline` variant entirely

**2.2 `src/components/ui/badge.tsx`**

- [x] Update `default` variant: `bg-navy-800` → `bg-fc-600`
- [x] Update `outline` variant: `border-navy-200 text-navy-700` → `border-fc-200 text-fc-700`
- [x] **Remove** `gold` variant
- [x] **Remove** `sage` variant
- [x] Keep `warning` (amber) and `info` (blue) variants

**2.3 `src/components/ui/card.tsx`**

- [x] Remove `paper-texture` from Card component class list (line 11)

**2.4 `src/components/ui/input.tsx`**

- [x] Update `ring-navy-300` → `ring-fc-300` (if present)
- [x] Update `border-navy-300` → `border-fc-300` (if present)

**2.5 `src/components/ui/tabs.tsx`**

- [x] Update `text-navy-800` → `text-fc-700` (active tab state)

**2.6 `src/components/ui/avatar.tsx`**

- [x] Update `bg-navy-100 text-navy-700` → `bg-fc-100 text-fc-700` (fallback)

**2.7 `src/components/ui/progress.tsx`**

- [x] Update `bg-navy-100` → `bg-fc-100` or `bg-gray-100` (track)
- [x] Update `bg-gold-600` → `bg-fc-600` (fill)

**2.8 `src/components/navigation.tsx`**

- [x] Sidebar background: all `navy-*` → `fc-*` equivalents
  - `bg-navy-950/20` overlay → `bg-fc-950/20`
  - `bg-navy-800` logo container → `bg-fc-600` (brand blue)
  - `text-navy-900` portal name → `text-fc-900`
  - `bg-navy-50 text-navy-900` active nav → `bg-fc-50 text-fc-900`
  - `hover:text-navy-800` inactive nav → `hover:text-fc-800`
  - `bg-navy-800` active icon → `bg-fc-600`
  - `group-hover:bg-navy-100 group-hover:text-navy-700` → `group-hover:bg-fc-100 group-hover:text-fc-700`
  - `bg-gold-600` notification badge → `bg-fc-600`
  - `text-navy-900` user name → `text-fc-900`
  - `text-navy-900` mobile header → `text-fc-900`

**2.9 `src/lib/utils.ts`**

- [x] Update `getStatusColor()` if it returns inline color classes with navy/sage references. The function may return CSS class names that reference the status utilities — verify these still map correctly after globals.css update.

**2.10 Official FC Logo Integration**

The official FranklinCovey logo SVG is at `https://www.franklincovey.com/wp-content/uploads/2022/02/FC_logo.svg`. It uses:
- `#141928` (Mirage) fill for the "FranklinCovey" wordmark
- Radial gradient `#67dfff` → `#3253FF` for the logomark (4-petal geometric icon)
- viewBox: `0 0 800 143.98` (wide horizontal)

**Steps:**

- [x] Save the FC logo SVG to `public/fc-logo.svg` (full horizontal logo with wordmark)
- [x] Also extract just the logomark (first ~144px) as `public/fc-logomark.svg` for compact use in sidebar
- [x] Create a white-on-transparent version of both for dark backgrounds (`public/fc-logo-white.svg`, `public/fc-logomark-white.svg`). Swap `fill:#141928` to `fill:#ffffff` and gradient stops to white.

**Logo placements to update:**

| Location | Current | New | File |
|----------|---------|-----|------|
| **Sidebar header** (coach/admin) | Book icon SVG (24px) + "FranklinCovey" text | FC logomark (28px) + full wordmark text OR horizontal logo | `navigation.tsx:57-68` |
| **Landing page header** | Book icon SVG + "FranklinCovey" text (white) | White FC logo (auto height ~24-28px) | `page.tsx:20-38` |
| **Video thumbnail watermark** | Book icon + "Introduction" text | FC logomark (white, small) + "Introduction" | `select-coach/page.tsx:459-467` |
| **Footer** | Text only "&copy; 2026 FranklinCovey" | Could add small logo mark before text | `page.tsx:224` |

**Phase 2 verification:** `npm run build` passes, all components render with new styles, FC logo appears correctly.

---

#### Phase 3: Pages — ~1.5 hours

Systematic find-and-replace across all 8 page files. Process each page:
1. Replace `navy-*` → `fc-*` per mapping table
2. Replace `gold-*` → `fc-*` or `amber-*` per gold replacement map
3. Replace `sage-*` → `emerald-*` per sage replacement map
4. Remove `grain` class references
5. Remove `gold-shimmer` class references
6. Update any hardcoded button variants from `gold`/`gold-outline` to `default`/`outline`

**3.1 `src/app/page.tsx`** (Landing page — 17 color refs)
- [x] Replace 12 navy-* instances with fc-* equivalents
- [x] Replace 5 sage-* instances with emerald-*
- [x] Remove `grain` class from hero section (line ~14)

**3.2 `src/app/participant/select-coach/page.tsx`** (47 navy refs — heaviest file)
- [x] Replace 47 navy-* instances with fc-*
- [x] This page is navy-only (no gold/sage) — straightforward

**3.3 `src/app/participant/engagement/page.tsx`** (39 color refs)
- [x] Replace 19 navy-* → fc-*
- [x] Replace 9 gold-* → fc-*/amber-* per context
- [x] Replace 11 sage-* → emerald-*
- [x] Update any `variant="gold"` buttons to `variant="default"`

**3.4 `src/app/coach/dashboard/page.tsx`** (33 color refs)
- [x] Replace 21 navy-* → fc-*
- [x] Replace 7 gold-* → fc-*/amber-* per context (attention states → amber)
- [x] Replace 5 sage-* → emerald-*
- [x] Remove `gold-shimmer` reference (if present on KPI cards)

**3.5 `src/app/coach/engagement/page.tsx`** (40 color refs)
- [x] Replace 28 navy-* → fc-*
- [x] Replace 5 gold-* → fc-*/amber-*
- [x] Replace 7 sage-* → emerald-*

**3.6 `src/app/admin/dashboard/page.tsx`** (24 color refs)
- [x] Replace 15 navy-* → fc-*
- [x] Replace 8 gold-* → fc-*/amber-* (attention KPIs → amber)
- [x] Replace 1 sage-* → emerald-*
- [x] Remove `gold-shimmer` from attention-state KPI cards (line ~374)

**3.7 `src/app/admin/coaches/page.tsx`** (20 color refs)
- [x] Replace 14 navy-* → fc-*
- [x] Replace 1 gold-* → fc-*/amber-*
- [x] Replace 5 sage-* → emerald-*

**3.8 `src/app/admin/import/page.tsx`** (36 color refs)
- [x] Replace 23 navy-* → fc-*
- [x] Replace 6 gold-* → fc-*/amber-* (dropzone active → fc, step indicator → fc)
- [x] Replace 7 sage-* → emerald-*

**Phase 3 verification:** `npm run build` passes, all pages render correctly.

---

#### Phase 4: Cleanup & QA — ~30 min

**4.1 Tailwind Config Cleanup**

- [x] Remove `navy` color scale from `tailwind.config.ts`
- [x] Remove `sage` color scale from `tailwind.config.ts`
- [x] Keep `gold` scale (needed for `.status-coach-selected`)
- [x] Verify no remaining references to navy/sage in codebase:
  ```bash
  grep -r "navy-\|sage-" src/ --include="*.tsx" --include="*.css"
  ```

**4.2 Accessibility Audit**

- [x] Verify `bg-fc-600 text-white` contrast ratio >= 4.5:1 (WCAG AA for normal text)
- [x] Verify `bg-fc-50 text-fc-700` contrast for status badges
- [x] Verify `border-fc-300` visibility on white backgrounds (>= 3:1 for UI components)
- [x] Test focus ring visibility (`outline: 2px solid fc-600`) on all backgrounds

**4.3 Visual QA Checklist**

- [x] Landing page — hero section, feature cards, CTA buttons
- [x] Select-coach — filter bar, coach cards, video thumbnails, modals
- [x] Engagement — progress ring, session timeline, stats, booking CTA
- [x] Coach dashboard — KPI cards, engagement list, sidebar active state
- [x] Coach engagement — session notes, timeline, status badges
- [x] Admin dashboard — KPI cards, participant table, attention states
- [x] Admin coaches — coach list, availability indicators
- [x] Admin import — upload dropzone, step indicator, validation states
- [x] Mobile responsive — sidebar toggle, filter bar collapse, button sizes
- [x] All status badges — INVITED through ON_HOLD correct colors

**4.4 Build Verification**

- [x] `npm run build` — zero errors
- [x] `npm run lint` — zero errors related to changes
- [x] No `navy-` or `sage-` classes remaining in source (except gold in status utility)

---

## Acceptance Criteria

### Functional Requirements

- [x] All buttons render as pill-shaped (border-radius: 9999px)
- [x] Body text renders in Inter font
- [x] Headings render in Cormorant Garamond font (unchanged)
- [x] Primary CTA buttons use fc-600 (#3253FF) background with white text
- [x] All 6 engagement status badges render correctly with new colors
- [x] Status badge for COACH_SELECTED still uses gold-100/gold-800
- [x] No navy-* or sage-* classes remain in codebase (except gold in status utility)
- [x] No `paper-texture`, `grain`, or `gold-shimmer` classes remain
- [x] Sidebar navigation renders with fc-* colors instead of navy-*
- [x] Filter bar, modals, and video player on select-coach page still function
- [x] All page layouts remain responsive on mobile
- [x] Official FC logo SVG renders in sidebar header, landing page header, and video watermarks
- [x] White logo variant displays correctly on dark backgrounds (landing hero, video thumbnails)

### Non-Functional Requirements

- [x] WCAG AA contrast ratios met for all text/background combinations
- [x] No flash of unstyled text on page load (fonts load cleanly)
- [x] Build passes: `npm run build` completes with zero errors
- [x] No type errors introduced

### Quality Gates

- [x] All 8 pages visually inspected
- [x] Mobile layout verified for all pages
- [x] Status badges verified across all portal contexts

---

## Dependencies & Prerequisites

- No external dependencies — all changes are within the existing codebase
- FC brand colors already defined in `tailwind.config.ts` (fc-50 through fc-950)
- Google Fonts Inter is freely available via @import URL
- No backend changes required

---

## Risk Analysis & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Missed navy/gold/sage class in template literal | Medium | Low | Grep audit in Phase 4 catches stragglers |
| fc-600 fails WCAG contrast on white | Low | Medium | Test in Phase 4; fallback to fc-700 if needed |
| Pill buttons look awkward at `size="sm"` | Low | Low | Visual QA in Phase 4; keep rounded-md for sm if needed |
| Dynamic class names purged by Tailwind | Low | Medium | Full classes used (not template literals with shades) |
| Font FOUT during Inter swap | Medium | Low | Acceptable for MVP; migrate to next/font later if needed |

---

## Resource Requirements

**Effort:** ~3 hours total (1 developer)
**Files:** 20 files modified
**Color instances:** 256 class replacements

---

## Future Considerations

- **next/font migration:** Consider migrating from `@import url()` to `next/font/google` for better font loading performance and FOUT prevention
- **Dark mode:** If needed later, define `dark:` variants for fc-* scale. Currently `darkMode: ["class"]` is configured but unused
- **FC logo optimization:** Consider using `next/image` for the logo with proper width/height/priority for LCP optimization
- **Licensed fonts:** If FC provides TiemposFine + Rand font files, swap from Google Fonts alternatives to self-hosted originals

---

## References & Research

### Internal References
- Brainstorm: `docs/brainstorms/2026-02-12-fc-brand-alignment-brainstorm.md`
- Tailwind config: `tailwind.config.ts:8-11` (fontFamily), `tailwind.config.ts:46-96` (color scales)
- Global CSS: `src/app/globals.css:1` (font import), `src/app/globals.css:56-83` (textures)
- Button variants: `src/components/ui/button.tsx:12-26`
- Badge variants: `src/components/ui/badge.tsx:11-25`
- Navigation: `src/components/navigation.tsx:45-167`
- Status utilities: `src/app/globals.css:94-99`
- Status function: `src/lib/utils.ts` (getStatusColor)

### External References
- [Brandfetch - FranklinCovey](https://brandfetch.com/franklincovey.com) — Brand colors + fonts
- [Stoke Group - FC Rebrand](https://thestokegroup.com/portfolio/franklincovey-rebrand/) — Rebrand case study
- [Klim Type Foundry - TiemposFine](https://klim.co.nz/fonts/tiempos-fine/) — FC heading font (premium)
- [Maxibestof - Rand](https://maxibestof.one/typefaces/rand) — FC body font (premium)
- [Google Fonts - Inter](https://fonts.google.com/specimen/Inter) — Body font alternative
