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
│   │   ├── auth-provider.tsx   # AuthContext (session + nickname + avatarUrl)
│   │   └── login-form.tsx      # Email/password login + signup (닉네임 직접입력/자동생성)
│   ├── layout/
│   │   ├── mobile-shell.tsx    # Mobile container (max-w-md centered)
│   │   └── bottom-nav.tsx      # Bottom tab navigation
│   └── restroom/
│       ├── restroom-card.tsx   # Restroom list item
│       ├── review-form.tsx     # Review submission (auth + API)
│       ├── review-card.tsx     # Single review display
│       ├── star-rating.tsx     # Interactive star rating
│       ├── photo-grid.tsx      # Photo gallery (실제 사진 또는 빈 안내)
│       ├── map-view.tsx        # Kakao Maps with markers + user location
│       └── map-placeholder.tsx # Fallback when no map API key
├── lib/
│   ├── types.ts                # Restroom, Review, EditRequest interfaces
│   ├── api.ts                  # Supabase data access + admin + safety + 프로필
│   ├── auth.ts                 # signUp, signIn, signOut, getUser
│   ├── nickname.ts             # 랜덤 닉네임 생성 (형용사 + 명사 조합)
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

### 사용자 식별 & 닉네임 규칙
- **내부 식별**: `user_id` (Supabase Auth UUID) — Storage 경로, DB FK, RLS 등 시스템 전체에서 사용
- **화면 표시**: `nickname` (user_profiles 테이블) — 리뷰, 활동 내역 등 사용자에게 보이는 모든 곳에서 사용
- **프로필 사진**: `avatar_url` (user_profiles 테이블) — avatars 버킷에 저장
- **절대 금지**: 이메일, UUID 등 개인정보를 화면에 노출하지 말 것 (프로필 본인 화면 제외)
- **리뷰 등 사용자 활동 조회 시**: DB에 저장된 user_name이 아닌 user_profiles의 실시간 nickname/avatar_url을 매핑하여 표시 (`enrichReviewsWithProfiles` 패턴 참고)
- **닉네임 자동생성**: 형용사 + 명사 조합, DB에서 동일 base 검색 후 +1 넘버링으로 중복 방지
- **AuthContext**: `useAuth()` 훅으로 `user`, `nickname`, `avatarUrl`, `refreshProfile` 접근

### State Management
- React `useState`/`useEffect` hooks for local state
- `AuthContext` for authentication state + profile (via `useAuth()` hook)
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
- **스키마 변경 시 `supabase/migrations/` 폴더에 새 SQL 파일 추가** (예: `009_xxx.sql`)
- 번호는 기존 마이그레이션 다음 순번으로 매김
- 운영 DB에는 해당 마이그레이션 파일만 실행
- **DB 컬럼 데이터 타입 반드시 확인** — 코드에서 insert/update/where 할 때 해당 컬럼의 실제 DB 타입(uuid vs text, int vs bigint 등)과 입력 값의 형식이 일치하는지 반드시 검증할 것. 특히 여러 테이블에서 공유하는 ID 컬럼(예: `restroom_id`)은 참조하는 모든 테이블의 타입이 동일한지 확인
- **에러 메시지에 DB 내부 정보 노출 금지** — Supabase 에러 메시지(테이블명, 컬럼 타입, SQL 에러코드 등)를 사용자 화면에 그대로 표시하지 말 것. console.error로만 기록하고, 사용자에게는 한국어로 된 일반적인 안내 메시지를 표시
- **테이블/뷰 생성 시 반드시 GRANT 포함** — Supabase 마이그레이션으로 만든 테이블은 자동 GRANT가 안 됨
  - 조회용 테이블/뷰: `grant select on <table> to anon, authenticated;`
  - 로그인 유저 쓰기: `grant insert on <table> to authenticated;`
  - 수정/삭제 필요 시: `grant update, delete on <table> to authenticated;`
  - GRANT 누락 시 클라이언트에서 403 Forbidden 발생

### 현재 마이그레이션 목록
| 파일 | 내용 |
|------|------|
| `001_initial.sql` | user_restrooms, reviews, review_stats, RLS |
| `002_add_gender_stalls_photos_editrequests.sql` | 성별 구분, 칸 수, 사진, edit_requests |
| `003_add_safety_checks.sql` | safety_checks, safety_stats |
| `004_add_admin_policies.sql` | admin_users, is_admin(), 관리자 RLS |
| `005_add_public_restrooms_table.sql` | public_restrooms 테이블 + 인덱스 + GRANT |
| `006_drop_unused_restrooms.sql` | 레거시 restrooms/restroom_stats 삭제 |
| `007_grant_admin_users_select.sql` | admin_users SELECT GRANT |
| `008_grant_all_tables.sql` | 전체 테이블 GRANT 일괄 추가 |
| `009_fix_admin_users_rls.sql` | admin_users RLS 수정 |
| `010_create_storage_bucket.sql` | restroom-photos 버킷 + RLS |
| `011_add_user_profiles.sql` | user_profiles 테이블 (닉네임, 시퀀스, RLS, GRANT) |
| `012_add_avatar_url.sql` | user_profiles에 avatar_url 컬럼 + update 정책 |
| `013_create_avatars_bucket.sql` | avatars 버킷 (프로필 사진 전용) + RLS |
| `014_fix_review_stats_view.sql` | review_stats 뷰 security_invoker 설정 |
| `015_rpc_restrooms_with_stats.sql` | RPC: 화장실 + 리뷰통계 한방 조회 |
| `016_fix_rpc_type_cast.sql` | RPC 타입 캐스팅 수정 |
| `017_add_user_preferences.sql` | user_preferences 테이블 (취향 설정) |
| `018_add_review_sentiment.sql` | reviews에 sentiment 컬럼 추가 |
| `019_add_review_user_snapshot.sql` | reviews에 user_avg_rating, user_top_preferences 추가 |
| `020_rpc_get_restroom_detail.sql` | RPC: 상세 페이지 한방 조회 |
| `021_fix_reviews_restroom_id_type.sql` | reviews/safety_checks restroom_id uuid→text 변환 |

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
- **유저 프로필**: `user_profiles` 테이블에 닉네임/아바타 저장. 가입 시 생성, 이후 조회/수정만 수행
- **Storage 버킷**: `restroom-photos` (화장실 사진), `avatars` (프로필 사진) — 용도별 분리
- **사용자 노출 규칙**: 화면에 사용자 정보 표시 시 반드시 `user_profiles`의 nickname/avatar_url 사용. user_id/email 직접 노출 금지
- **PWA**: manifest.json + service worker로 홈 화면 설치 지원
- **지도**: Kakao Maps SDK, 내 위치 파란 점 마커, idle 디바운스 300ms
