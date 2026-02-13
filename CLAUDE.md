# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Production build (standalone output for Docker)
npm run lint         # ESLint
```

## Architecture

FranklinCovey Coaching Platform frontend — Next.js 15 App Router with three portals for a government coaching engagement program (400 participants, 5-10 coaches).

**Three portals, two layout patterns:**
- **Participant** (`/participant/*`) — Immersive, no sidebar. Simple top header bar. Pages build their own layout.
- **Coach** (`/coach/*`) — Uses `PortalShell` sidebar layout from `src/components/navigation.tsx`.
- **Admin** (`/admin/*`) — Uses `PortalShell` sidebar layout from `src/components/navigation.tsx`.

All page components are `"use client"` with hardcoded demo data (no backend yet). The PRD for the full platform is at `prd_for_apps/franklincovey-coaching-platform-prd.md` in the parent `.cursor` directory.

## Design System: "Quiet Luxury"

**Typography** — two font families, loaded via Google Fonts in `globals.css`:
- `font-display` → Cormorant Garamond (serif) — all headings (`h1`-`h6` apply it automatically)
- `font-body` → Plus Jakarta Sans (sans-serif) — body text, buttons, labels

**Color palette** — three custom scales in `tailwind.config.ts` beyond the shadcn HSL variables:
- `navy-*` (50–950) — primary brand color, text, sidebar, dark backgrounds
- `gold-*` (50–900) — accent, CTAs, attention states, "Needs Attention" indicators
- `sage-*` (50–900) — success, completion, positive states

**Status colors** — utility classes in `globals.css` (`.status-invited`, `.status-completed`, etc.) and corresponding functions in `src/lib/utils.ts` (`getStatusColor()`, `getStatusLabel()`).

**Animations** — staggered entrance animations are a core pattern. Use `opacity-0 animate-fade-in` with `stagger-1` through `stagger-6` classes for sequential reveals. Additional animations: `animate-fade-in-up`, `animate-slide-in-right`, `animate-scale-in`, `animate-pulse-subtle`. The `gold-shimmer` class creates an animated highlight effect.

**Textures** — Cards use `paper-texture` class (subtle gradient). Dark pages use `grain` class (noise overlay via SVG filter).

## Component Conventions

UI primitives live in `src/components/ui/` following **shadcn/ui new-york style** with project-specific additions:

- **Button** has custom variants: `gold`, `gold-outline` (in addition to standard `default`, `outline`, `ghost`, `secondary`, `destructive`, `link`). Sizes include `xl`.
- **Badge** has custom variants: `gold`, `sage`, `warning`, `info` (in addition to standard ones).
- **Card** automatically applies `paper-texture` class.

Icons are inline SVGs throughout — no icon library is imported at the component level. Use `width/height` of 16–24, `strokeWidth="2"`, `strokeLinecap="round"`, `strokeLinejoin="round"`.

## Key Files

- `src/components/navigation.tsx` — `PortalShell` component: sidebar + mobile-responsive shell for coach/admin portals. Takes `navItems`, `portalName`, `portalIcon`, `userName`, `userRole`.
- `src/lib/utils.ts` — `cn()` merge helper, `formatDate()`, `formatRelativeTime()`, `getStatusColor()`, `getStatusLabel()`, `getInitials()`.
- `src/lib/config.ts` — Domain constants: `SESSION_TOPICS`, `SESSION_OUTCOMES`, `DURATION_OPTIONS`, `NUDGE_THRESHOLDS`, `PROGRAM_TRACK_SESSIONS`. These match the PRD spec.
- `src/app/globals.css` — CSS variables (HSL values without `hsl()` wrapper), custom utility classes, status colors.
- `docs/solutions/` — Documented solutions knowledge base. **Check here first** before investigating issues — past root causes, fixes, and prevention strategies are indexed by category and tags. See `docs/solutions/README.md` for the full index.

## Architecture Decisions

**Scheduling: Link-based, no API integration (decided 2026-02-10, client-confirmed 2026-02-11)**

The original PRD specified full Calendly API integration (webhooks, embeds, session auto-sync). A 3-reviewer technical analysis unanimously recommended removing the API layer. Client confirmed (2026-02-11) that the MVP requirement is "take each coach's scheduling link and hide it behind a button" — which is exactly what this approach delivers.

**What ships:**
- Each coach's Calendly scheduling link (or Acuity, Teams Bookings, etc.) stored as `meetingBookingUrl` on `CoachProfile`
- Participant sees a **"Book Next Session" button** that opens the coach's Calendly page directly
- Participant books on Calendly as normal — coaches' existing workflow is unchanged
- Coach logs the completed session in our platform afterward (date/time + structured notes)

**What was removed (Calendly API plumbing only):**
- Webhook handler, iframe embeds, session auto-sync, reconciliation cron
- FedRAMP blocker, Calendly DPA, $80-160/month Professional plan cost
- `react-calendly` dependency, CSP rules for Calendly domains

**Schema impact:** Rename `calendlyUrl` to `meetingBookingUrl` on `CoachProfile` (tool-agnostic name). Remove `calendlyEventUri` from `Session` (no webhook sync). No new models needed.

**What this means for the frontend:** The participant engagement page shows a "Book Next Session" button that opens the coach's `meetingBookingUrl` (external link, new tab). Sessions appear in the timeline when the coach logs them.

## Engagement Status Values

The domain model uses these engagement statuses throughout: `INVITED`, `COACH_SELECTED`, `IN_PROGRESS`, `COMPLETED`, `CANCELED`, `ON_HOLD`. Session statuses: `SCHEDULED`, `COMPLETED`, `CANCELED`, `NO_SHOW`. Program tracks: `TWO_SESSION` (2 sessions), `FIVE_SESSION` (5 sessions).
