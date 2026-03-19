# CLAUDE.md — PPORest

## Project Overview

PPORest is a mobile-optimized Korean-language web application for discovering, reviewing, and rating public restrooms nearby. Built with Next.js 14 (App Router) and TypeScript. Currently in prototype stage using mock data, with Supabase configured for future backend integration.

## Tech Stack

- **Framework**: Next.js 14 with App Router (React 18)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS 3 with CSS variables for theming
- **UI Components**: shadcn/ui (slate theme, Tailwind CSS variant)
- **Icons**: lucide-react
- **Backend**: Supabase (configured, not yet active — using mock data)
- **Package Manager**: npm

## Commands

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint (next/core-web-vitals + next/typescript)
```

There is no test framework configured yet.

## Project Structure

```
src/
├── app/                        # Next.js App Router pages
│   ├── layout.tsx              # Root layout with MobileShell wrapper
│   ├── page.tsx                # Home page (nearby restrooms)
│   ├── globals.css             # Global styles + Tailwind + CSS variables
│   ├── search/page.tsx         # Search with filters
│   ├── profile/page.tsx        # User profile (stub)
│   └── restroom/[id]/
│       ├── page.tsx            # Restroom detail view
│       └── review/page.tsx     # Write review form
├── components/
│   ├── ui/                     # shadcn/ui primitives (button, card, input, etc.)
│   ├── layout/
│   │   ├── mobile-shell.tsx    # Mobile container (max-w-md centered)
│   │   └── bottom-nav.tsx      # Bottom tab navigation
│   └── restroom/               # Feature components (restroom-card, review-form, etc.)
└── lib/
    ├── types.ts                # TypeScript interfaces (Restroom, Review)
    ├── mock-data.ts            # Mock data (7 restrooms, 12 reviews)
    ├── supabase.ts             # Supabase client init
    └── utils.ts                # cn() helper for className merging
```

## Key Conventions

### File & Naming
- **Component files**: kebab-case (`restroom-card.tsx`, `star-rating.tsx`)
- **Component names**: PascalCase (`RestroomCard`, `StarRating`)
- **Interfaces**: No `I` prefix — use descriptive names (`Restroom`, `Review`)
- **Path alias**: `@/*` maps to `./src/*`

### Component Patterns
- Use `"use client"` directive for components with interactivity/state
- Server Components by default (pages without `"use client"`)
- shadcn/ui components use `class-variance-authority` for variants
- Use `cn()` from `@/lib/utils` for conditional className merging
- Prefer named exports over default exports

### Styling
- Tailwind CSS utility classes exclusively — no CSS modules or styled-components
- Theme colors via CSS variables (HSL) defined in `globals.css`
- Dark mode supported via class-based toggling
- Mobile-first design: main container is max-width 448px, centered

### State Management
- React `useState`/`useEffect` hooks for local state
- No global state library

## Environment Variables

Required in `.env.local` (see `.env.local.example`):
```
NEXT_PUBLIC_SUPABASE_URL=<supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase-anon-key>
```

## Routes

| Path | Description |
|------|-------------|
| `/` | Home — nearby restrooms list |
| `/search` | Search with category/rating filters |
| `/profile` | User profile (stub) |
| `/restroom/[id]` | Restroom detail with reviews |
| `/restroom/[id]/review` | Write a review |

## Current Status

- Prototype with mock data — no live backend
- No tests, no CI/CD pipeline
- Authentication not yet implemented
- Map integration uses a placeholder component
