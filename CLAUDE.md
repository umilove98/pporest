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
│   ├── layout.tsx              # Root layout (AuthProvider + MobileShell + SW)
│   ├── page.tsx                # Home — map + nearby restrooms (lazy bounds load)
│   ├── globals.css             # Global styles + Tailwind + CSS variables
│   ├── admin/page.tsx          # Admin — approve/reject registrations & edits
│   ├── search/page.tsx         # Search with debounced API + filters
│   ├── profile/page.tsx        # Login form or user profile + my reviews
│   └── restroom/
│       ├── new/page.tsx        # Register restroom (7-step wizard)
│       └── [id]/
│           ├── page.tsx        # Restroom detail + safety check + edit request
│           └── review/page.tsx # Write review (auth required)
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
│       ├── map-view.tsx        # Kakao Maps with markers + user location
│       └── map-placeholder.tsx # Fallback when no map API key
├── lib/
│   ├── types.ts                # Restroom, Review, EditRequest interfaces
│   ├── api.ts                  # Supabase data access + admin + safety
│   ├── auth.ts                 # signUp, signIn, signOut, getUser
│   ├── mock-data.ts            # Mock data fallback (legacy)
│   ├── supabase.ts             # Supabase client (lazy init for build safety)
│   └── utils.ts                # cn(), getDistanceMeters(), formatDistance()
├── public/
│   ├── data/public-restrooms.json  # 공공 화장실 정적 데이터 (6,966건)
│   ├── manifest.json           # PWA manifest
│   ├── sw.js                   # Service worker
│   └── icons/                  # App icons (192, 512)
├── scripts/
│   └── convert-csv.ts          # 공공데이터 CSV → JSON 변환
└── supabase/
    ├── schema.sql              # Full DB schema
    └── migrations/             # Incremental migrations (001~003)
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
- DB 의존 기능(관리자, 리뷰, 안전확인 등)은 Supabase 직접 호출. localStorage fallback 사용 금지 — DB 연결 실패 시 에러를 표시할 것
- 공공 화장실 데이터는 정적 JSON (`public/data/public-restrooms.json`)에서 로드, 홈 페이지 조회에만 mock fallback 허용

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

- **schema.sql은 참고용 전체 스키마** — 직접 수정하지 말 것
- **스키마 변경 시 `supabase/migrations/` 폴더에 새 SQL 파일 추가** (예: `007_xxx.sql`)
- 번호는 기존 마이그레이션 다음 순번으로 매김
- 운영 DB에는 해당 마이그레이션 파일만 실행

### 현재 마이그레이션 목록
| 파일 | 내용 |
|------|------|
| `001_initial.sql` | user_restrooms, reviews, review_stats, RLS |
| `002_add_gender_stalls_photos_editrequests.sql` | 성별 구분, 칸 수, 사진, edit_requests |
| `003_add_safety_checks.sql` | safety_checks, safety_stats |
| `004_add_admin_policies.sql` | admin_users, is_admin(), 관리자 RLS |
| `005_add_public_restrooms_table.sql` | public_restrooms 테이블 + 인덱스 + GRANT |
| `006_drop_unused_restrooms.sql` | 레거시 restrooms/restroom_stats 삭제 |

## Routes

| Path | Description |
|------|-------------|
| `/` | Home — map + nearby restrooms (lazy bounds-based load) |
| `/search` | Search with name/address query + tag filters |
| `/profile` | Login/signup form or user profile + review history |
| `/admin` | Admin — pending registrations & edit requests |
| `/restroom/new` | Register restroom (7-step wizard, auth required) |
| `/restroom/[id]` | Restroom detail + safety check + edit request |
| `/restroom/[id]/review` | Write a review (auth required) |

## Architecture Notes

- **공공 화장실 데이터**: Supabase `public_restrooms` 테이블 — bounds/검색 쿼리로 DB 직접 조회, 시드는 `scripts/seed-public-restrooms.ts`
- **유저 등록 화장실/리뷰/안전확인**: Supabase DB 직접 사용. localStorage fallback 절대 금지
- **PWA**: manifest.json + service worker로 홈 화면 설치 지원
- **지도**: Kakao Maps SDK, 내 위치 파란 점 마커, idle 디바운스 300ms
