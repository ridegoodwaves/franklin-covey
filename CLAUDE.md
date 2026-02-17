# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Production build (standalone output for Docker)
npm run lint         # ESLint
```

## Languages & Conventions

Primary languages: TypeScript, Markdown. Always validate TypeScript with the project's build/type-check before committing. Format Markdown documents consistently.

## Planning & Documents

When creating plan documents, start with the simplest viable format (2-3 pages, brief) unless explicitly asked for a comprehensive RFC. Avoid over-engineering plans — prefer 4 essential tasks over 8 over-engineered ones.

For RFC and comparison documents: present options neutrally. Do not bias toward any particular tool or platform. Include concrete architectural details (how workflows actually work, platform capabilities, listener architecture) — not just high-level summaries.

## Content Rules

CRITICAL: Never author scenario content, creative writing, or domain-specific material without explicit user approval. If source content is missing, FLAG it to the user — do not generate placeholder content. This applies to LeadXLab scenarios, book chapters, and any content where authorship matters.

## File & Directory Navigation

When the user provides a file path that doesn't exist, search for the file by name in the project before asking the user. Common project root is NOT .cursor — verify the actual working directory early.

## Bug Fixing

When fixing a bug, verify the fix doesn't introduce new issues before declaring it complete. Test the full user flow, not just the specific code path. If a fix reveals a deeper issue, communicate it immediately rather than ending in plan mode.

## Session Management

Session handoff documents should be generated at the end of every significant session. Include: what was done, what's remaining, current branch/PR status, and any known issues.

## Architecture

FranklinCovey Coaching Platform frontend — Next.js 15 App Router with three portals for a government coaching engagement program (400 participants, 5-10 coaches).

**Three portals, two layout patterns:**
- **Participant** (`/participant/*`) — Immersive, no sidebar. Simple top header bar. Pages build their own layout.
- **Coach** (`/coach/*`) — Uses `PortalShell` sidebar layout from `src/components/navigation.tsx`.
- **Admin** (`/admin/*`) — Uses `PortalShell` sidebar layout from `src/components/navigation.tsx`.

All page components are `"use client"` with hardcoded demo data (no backend yet). The PRD for the full platform is at `prd_for_apps/franklincovey-coaching-platform-prd.md` in the parent `.cursor` directory.

## Design System: FranklinCovey Brand

**Typography** — two font families, loaded via Google Fonts in `globals.css`:
- `font-display` → Cormorant Garamond (serif) — all headings (`h1`-`h6` apply it automatically)
- `font-body` → Inter (sans-serif) — body text, buttons, labels

**Color palette** — one primary brand scale + Tailwind defaults in `tailwind.config.ts`:
- `fc-*` (50–950) — primary FranklinCovey brand color (#3253FF Blue Ribbon at fc-600, #141928 Mirage at fc-950)
- `gold-*` (50–900) — ONLY used for `.status-coach-selected` badge
- Tailwind `emerald-*` — success/completion states (replaced former sage scale)
- Tailwind `amber-*` — warning/attention states (replaced former gold attention usage)

**Status colors** — utility classes in `globals.css` (`.status-invited`, `.status-completed`, etc.) and corresponding functions in `src/lib/utils.ts` (`getStatusColor()`, `getStatusLabel()`).

**Animations** — staggered entrance animations are a core pattern. Use `opacity-0 animate-fade-in` with `stagger-1` through `stagger-6` classes for sequential reveals. Additional animations: `animate-fade-in-up`, `animate-slide-in-right`, `animate-scale-in`, `animate-pulse-subtle`.

**Logo** — Official FC logo SVGs in `public/`: `fc-logo.svg` (full horizontal), `fc-logomark.svg` (icon only), `fc-logo-white.svg` and `fc-logomark-white.svg` (white variants for dark backgrounds).

## Component Conventions

UI primitives live in `src/components/ui/` following **shadcn/ui new-york style** with project-specific additions:

- **Button** uses pill shape (`rounded-full`). Variants: `default` (fc-600 brand blue), `outline`, `ghost`, `secondary`, `destructive`, `link`. Sizes include `xl`.
- **Badge** variants: `default` (fc-600), `outline`, `warning`, `info` (in addition to standard `secondary`, `destructive`).
- **Card** uses clean border style (no textures).

Icons are inline SVGs throughout — no icon library is imported at the component level. Use `width/height` of 16–24, `strokeWidth="2"`, `strokeLinecap="round"`, `strokeLinejoin="round"`.

## Key Files

- `src/components/navigation.tsx` — `PortalShell` component: sidebar + mobile-responsive shell for coach/admin portals. Takes `navItems`, `portalName`, `portalIcon`, `userName`, `userRole`. Supports `disabled` nav items (grayed out, non-clickable, "Soon" pill).
- `src/lib/nav-config.tsx` — **Single source of truth** for sidebar navigation: `COACH_NAV_ITEMS`, `ADMIN_NAV_ITEMS`, portal icons (`CoachPortalIcon`, `AdminPortalIcon`), portal metadata (`COACH_PORTAL`, `ADMIN_PORTAL`). Add/remove/disable nav items here — all pages import from this file.
- `src/lib/utils.ts` — `cn()` merge helper, `formatDate()`, `formatRelativeTime()`, `getStatusColor()`, `getStatusLabel()`, `getInitials()`.
- `src/lib/config.ts` — Domain constants: `SESSION_TOPICS`, `SESSION_OUTCOMES`, `DURATION_OPTIONS`, `NUDGE_THRESHOLDS`, `PROGRAM_TRACK_SESSIONS`. These match the PRD spec.
- `src/app/globals.css` — CSS variables (HSL values without `hsl()` wrapper), custom utility classes, status colors.
- `docs/solutions/` — Documented solutions knowledge base. **Check here first** before investigating issues — past root causes, fixes, and prevention strategies are indexed by category and tags. See `docs/solutions/README.md` for the full index.

## Demo Readiness

Before any client demo, run a **route audit**: cross-reference all `href` values in `src/` against existing `src/app/**/page.tsx` files to catch dead links that produce white screens. Mark unbuilt routes as `disabled: true` in `src/lib/nav-config.tsx` — the sidebar will render them grayed out with a "Soon" pill. For section header action links (e.g. "View All", "See All"), pass `disabled: true` in the action object to hide them.

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
