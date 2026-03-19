# CLAUDE.md — PPORest

## Project Overview

PPORest is a mobile-optimized Korean-language web application for discovering, reviewing, and rating public restrooms nearby. Built with Next.js 14 (App Router) and TypeScript. Uses Supabase for backend (database, auth) with mock data fallback when Supabase is not configured.

## Tech Stack

- **Framework**: Next.js 14 with App Router (React 18)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS 3 with CSS variables for theming
- **UI Components**: shadcn/ui (slate theme, Tailwind CSS variant)
- **Icons**: lucide-react
- **Backend**: Supabase (PostgreSQL, Auth, RLS)
- **Map**: Kakao Maps SDK (JavaScript)
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
│   ├── layout.tsx              # Root layout (AuthProvider + MobileShell)
│   ├── page.tsx                # Home — map + nearby restrooms (geolocation)
│   ├── globals.css             # Global styles + Tailwind + CSS variables
│   ├── search/page.tsx         # Search with debounced API + filters
│   ├── profile/page.tsx        # Login form or user profile + my reviews
│   └── restroom/[id]/
│       ├── page.tsx            # Restroom detail (API + mock fallback)
│       └── review/page.tsx     # Write review (auth required)
├── components/
│   ├── ui/                     # shadcn/ui primitives (button, card, input, etc.)
│   ├── auth/
│   │   ├── auth-provider.tsx   # AuthContext (Supabase session)
│   │   └── login-form.tsx      # Email/password login + signup
│   ├── layout/
│   │   ├── mobile-shell.tsx    # Mobile container (max-w-md centered)
│   │   └── bottom-nav.tsx      # Bottom tab navigation
│   └── restroom/
│       ├── restroom-card.tsx   # Restroom list item
│       ├── review-form.tsx     # Review submission (auth + API)
│       ├── review-card.tsx     # Single review display
│       ├── star-rating.tsx     # Interactive star rating
│       ├── photo-grid.tsx      # Photo gallery placeholder
│       ├── map-view.tsx        # Kakao Maps with markers
│       └── map-placeholder.tsx # Fallback when no map API key
├── lib/
│   ├── types.ts                # Restroom, Review interfaces (snake_case fields)
│   ├── api.ts                  # Supabase data access (CRUD)
│   ├── auth.ts                 # signUp, signIn, signOut, getUser
│   ├── mock-data.ts            # Mock data fallback (7 restrooms, 12 reviews)
│   ├── seed.ts                 # DB seed script (npx tsx src/lib/seed.ts)
│   ├── supabase.ts             # Supabase client (lazy init for build safety)
│   └── utils.ts                # cn(), getDistanceMeters(), formatDistance()
└── supabase/
    └── schema.sql              # DB tables, views, indexes, RLS policies
```

## Key Conventions

### File & Naming
- **Component files**: kebab-case (`restroom-card.tsx`, `star-rating.tsx`)
- **Component names**: PascalCase (`RestroomCard`, `StarRating`)
- **DB fields / interfaces**: snake_case (`review_count`, `is_open`, `restroom_id`)
- **Interfaces**: No `I` prefix — use descriptive names (`Restroom`, `Review`)
- **Path alias**: `@/*` maps to `./src/*`

### Component Patterns
- Use `"use client"` directive for components with interactivity/state
- shadcn/ui components use `class-variance-authority` for variants
- Use `cn()` from `@/lib/utils` for conditional className merging
- Prefer named exports over default exports
- API calls use try/catch with mock data fallback

### Styling
- Tailwind CSS utility classes exclusively — no CSS modules or styled-components
- Theme colors via CSS variables (HSL) defined in `globals.css`
- Dark mode supported via class-based toggling
- Mobile-first design: main container is max-width 448px, centered

### State Management
- React `useState`/`useEffect` hooks for local state
- `AuthContext` for authentication state (via `useAuth()` hook)
- No global state library

## Environment Variables

Required in `.env.local` (see `.env.local.example`):
```
NEXT_PUBLIC_SUPABASE_URL=<supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase-anon-key>
NEXT_PUBLIC_KAKAO_MAP_API_KEY=<kakao-map-javascript-key>
```

## Database Setup

Run `supabase/schema.sql` in Supabase SQL Editor to create:
- `restrooms` table + `reviews` table (with FK to `auth.users`)
- `restroom_stats` view (joins restrooms with avg rating / review count)
- RLS policies (public read, auth-gated write)

## Routes

| Path | Description |
|------|-------------|
| `/` | Home — map + nearby restrooms (sorted by distance if geolocation available) |
| `/search` | Search with name/address query + tag filters |
| `/profile` | Login/signup form or user profile with review history |
| `/restroom/[id]` | Restroom detail with reviews |
| `/restroom/[id]/review` | Write a review (login required) |

## Current Status

- Supabase schema, API layer, and auth fully wired
- All pages fall back to mock data when Supabase is not connected
- Kakao Map integration (falls back to placeholder without API key)
- No tests, no CI/CD pipeline
- Photo upload not yet implemented (placeholder only)
