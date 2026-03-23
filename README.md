<p align="center">
  <img src="public/icons/icon-192.png" alt="PPORest" width="80" height="80" style="border-radius: 16px;" />
</p>

<h1 align="center">PPORest</h1>

<p align="center">
  내 주변 공중화장실을 빠르게 찾고, 리뷰를 남기고, 안전을 확인하세요.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-14-black?logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind" />
  <img src="https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?logo=supabase&logoColor=white" alt="Supabase" />
</p>

---

## 소개

**PPORest**는 전국 공공 화장실 데이터(6,900건+)와 사용자 등록 화장실을 통합하여 지도 기반으로 탐색할 수 있는 모바일 최적화 웹앱입니다. PWA를 지원하여 홈 화면에 설치할 수 있습니다.

## 주요 기능

| 기능 | 설명 |
|------|------|
| **지도 탐색** | Kakao Maps 기반 현재 위치 주변 화장실 탐색 |
| **검색 & 필터** | 이름/주소 검색, 장애인·기저귀·24시간 필터 |
| **리뷰 & 평점** | 별점(1~5) + 사진 리뷰 작성 |
| **안전 확인** | "오늘도 안전해요!" 일일 체크인 |
| **화장실 등록** | 7단계 위자드로 새 화장실 등록 (관리자 승인) |
| **수정 요청** | 공공 데이터 오류 수정 요청 |
| **프로필** | 자동생성 닉네임 + 아바타 프로필 관리 |
| **관리자** | 등록/수정 요청 승인·반려 |

## 기술 스택

- **Framework** — Next.js 14 (App Router) + React 18
- **Language** — TypeScript (strict mode)
- **Styling** — Tailwind CSS 3 + shadcn/ui
- **Backend** — Supabase (PostgreSQL, Auth, Storage, RLS)
- **Map** — Kakao Maps JavaScript SDK
- **PWA** — Service Worker + Web App Manifest

## 시작하기

### 사전 요구사항

- Node.js 18+
- npm
- [Supabase](https://supabase.com) 프로젝트
- [Kakao Developers](https://developers.kakao.com) JavaScript 앱 키

### 설치

```bash
git clone https://github.com/umilove98/pporest.git
cd pporest
npm install
```

### 환경 변수

`.env.local` 파일을 생성하세요:

```env
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
NEXT_PUBLIC_KAKAO_MAP_API_KEY=<your-kakao-map-javascript-key>
```

### 데이터베이스 설정

Supabase SQL Editor에서 마이그레이션 파일을 순서대로 실행하세요:

```
supabase/migrations/
├── 001_initial.sql                              # 기본 테이블 + RLS
├── 002_add_gender_stalls_photos_editrequests.sql # 시설 정보 확장
├── 003_add_safety_checks.sql                    # 안전 확인
├── 004_add_admin_policies.sql                   # 관리자 권한
├── 005_add_public_restrooms_table.sql           # 공공 화장실 테이블
├── ...
└── 016_fix_rpc_type_cast.sql                    # RPC 타입 캐스팅
```

### 실행

```bash
npm run dev       # 개발 서버 (http://localhost:3000)
npm run build     # 프로덕션 빌드
npm run start     # 프로덕션 서버
npm run lint      # ESLint 검사
```

## 프로젝트 구조

```
src/
├── app/                  # 페이지 (App Router)
│   ├── page.tsx          # 홈 — 지도 + 주변 화장실
│   ├── search/           # 검색 + 필터
│   ├── profile/          # 로그인/프로필
│   ├── admin/            # 관리자 패널
│   └── restroom/
│       ├── new/          # 화장실 등록 (7단계)
│       └── [id]/         # 상세 + 리뷰 작성
├── components/
│   ├── ui/               # shadcn/ui 기본 컴포넌트
│   ├── auth/             # 인증 (AuthProvider, LoginForm)
│   ├── layout/           # 레이아웃 (MobileShell, BottomNav)
│   └── restroom/         # 화장실 관련 (카드, 리뷰, 지도)
├── lib/
│   ├── api.ts            # Supabase 데이터 액세스
│   ├── auth.ts           # 인증 함수
│   ├── types.ts          # TypeScript 인터페이스
│   └── utils.ts          # 유틸리티 (거리 계산 등)
└── supabase/
    ├── schema.sql        # 전체 스키마 (참고용)
    └── migrations/       # 마이그레이션 파일
```

## 데이터 출처

공공 화장실 데이터는 [공공데이터포털](https://www.data.go.kr)의 **전국 공중화장실 표준데이터**를 활용합니다.

## 라이선스

MIT
