# AGENTS.md — Franklin-Covey Coaching Platform

> Minimal agent context covering testing framework and design system rules.
> For full project context, read `CLAUDE.md`.

***

## Testing Framework

**Use Vitest — never Jest.**

* Config: `vitest.config.mts` (`.mts` extension — avoids tsconfig conflict with `next.config.ts`)

* Do **not** generate `jest.config.*`, `@jest/*` imports, or any Jest configuration

* Do **not** generate Playwright, Cypress, or `@playwright/*` — E2E uses Chrome MCP only

### Key Mock Patterns

```ts
// Prevent throws outside Next.js runtime
vi.mock('server-only', () => ({}))

// Global Prisma mock (vitest-mock-extended)
vi.mock('@/lib/db', () => ({ prisma: prismaMock }))

// Reset in-memory rate limiter between tests
globalThis.__rateLimitBuckets = undefined  // in beforeEach

// Clean env stubs between tests
vi.unstubAllEnvs()  // in beforeEach

// Route handlers use NextRequest, not Request
new NextRequest(...)  // from 'next/server'

// cookies() and headers() are async in Next.js 15 — mocks must return Promises
// next-test-api-route-handler must be first import (AsyncLocalStorage init order)
```

### Test Structure

| Path                                  | Purpose                                                    |
| :------------------------------------ | :--------------------------------------------------------- |
| `vitest.config.mts`                   | Test config                                                |
| `src/__tests__/setup.ts`              | Global Prisma mock, `server-only` stub, rate limiter reset |
| `src/lib/__mocks__/db.ts`             | Deep mock of `PrismaClient` via `vitest-mock-extended`     |
| `src/__tests__/factories.ts`          | Type-safe test data builders                               |
| `src/__tests__/helpers/assert-api.ts` | Response assertion utilities                               |

***

## Design System — FranklinCovey Brand

### Typography

Two font families — **no Google Fonts, no external font loading:**

| Class                         | Font                     | Usage                                                |
| :---------------------------- | :----------------------- | :--------------------------------------------------- |
| `font-display` / `font-serif` | Times New Roman, Georgia | Headlines `h1`–`h3`, weight 300, line-height 1.15    |
| `font-body` / `font-sans`     | Arial                    | Body text, buttons, labels, subheads `h4`–`h6`, CTAs |

CSS variables: `--fc-font-primary` (Arial), `--fc-font-secondary` (Times New Roman)
Weight scale: `--fc-weight-light` (300), `--fc-weight-regular` (400), `--fc-weight-medium` (500), `--fc-weight-bold` (700)
Utility classes: `.cta` (Arial Bold), `.all-caps` (Arial Bold, uppercase, 0.1em letter-spacing)

### Color Palette

| Scale             | Description                                                               |
| :---------------- | :------------------------------------------------------------------------ |
| `fc-*` (50–950)   | Primary brand — `fc-600` = #3253FF Blue Ribbon, `fc-950` = #141928 Mirage |
| `gold-*` (50–900) | **Only** for `.status-coach-selected` badge                               |
| `emerald-*`       | Success / completion states                                               |
| `amber-*`         | Warning / attention states                                                |

Status colors live as utility classes in `globals.css` (`.status-invited`, `.status-completed`, etc.) and functions in `src/lib/utils.ts` (`getStatusColor()`, `getStatusLabel()`).

### Component Conventions

**Primitives:** `src/components/ui/` — shadcn/ui **new-york style**

* **Button:** pill shape (`rounded-full`). Default variant = `fc-600` brand blue. Sizes include `xl`.

* **Badge variants:** `default` (fc-600), `outline`, `warning`, `info`, `secondary`, `destructive`

* **Card:** clean border style — no textures

**Icons:** Inline SVGs throughout — **no icon library imports at component level**

* `width`/`height`: 16–24px

* `strokeWidth="2"`, `strokeLinecap="round"`, `strokeLinejoin="round"`

### Animations

Staggered entrance animations are a core pattern:

```html
<div class="opacity-0 animate-fade-in stagger-1">...</div>
<div class="opacity-0 animate-fade-in stagger-2">...</div>
```

Available: `animate-fade-in`, `animate-fade-in-up`, `animate-slide-in-right`, `animate-scale-in`, `animate-pulse-subtle`
Stagger classes: `stagger-1` through `stagger-6`

### Logos

SVGs in `public/`:

* `fc-logo.svg` — full horizontal

* `fc-logomark.svg` — icon only

* `fc-logo-white.svg` / `fc-logomark-white.svg` — white variants for dark backgrounds

***

## Content Authorship Rule

**Never generate placeholder content or creative copy without explicit user approval.**
If source content is missing, flag it — do not invent it.
