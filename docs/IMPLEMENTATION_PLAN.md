# PPORest 구현 계획서

> 이 문서는 PPORest의 기본 기능 구현 순서와 상세 계획을 정리합니다.
> 각 단계 완료 시 체크표시로 진행 상황을 추적합니다.

---

## 1단계: Supabase 연동 — DB 스키마 및 데이터 계층

**목표**: mock 데이터를 Supabase DB로 교체하고, 데이터 접근 계층을 구성한다.

### 1-1. Supabase 테이블 생성 SQL
- [ ] `restrooms` 테이블 (id, name, address, lat, lng, tags, is_open, created_at)
- [ ] `reviews` 테이블 (id, restroom_id FK, user_id FK, user_name, rating, comment, has_photo, created_at)
- [ ] `restrooms`에 평균 평점/리뷰 수를 위한 뷰 또는 트리거

### 1-2. TypeScript 타입 업데이트
- [ ] `src/lib/types.ts` — Supabase 스키마에 맞게 `Restroom`, `Review` 인터페이스 업데이트
  - `Restroom.distance`는 DB 컬럼이 아닌 클라이언트에서 계산
  - `Restroom.reviewCount`, `Restroom.rating`은 집계값으로 조회

### 1-3. 데이터 접근 함수 (`src/lib/api.ts` 신규)
- [ ] `getRestrooms()` — 전체 화장실 목록 + 평균 평점/리뷰 수
- [ ] `getRestroomById(id)` — 단일 화장실 상세
- [ ] `getReviewsByRestroomId(id)` — 특정 화장실의 리뷰 목록
- [ ] `searchRestrooms(query, filters)` — 검색/필터링
- [ ] `createReview(data)` — 리뷰 등록

### 1-4. 시드 데이터
- [ ] `src/lib/seed.ts` — mock-data.ts의 데이터를 Supabase에 삽입하는 스크립트
- [ ] `npm run seed` 스크립트 추가 (package.json)

### 파일 변경 목록
| 파일 | 작업 |
|------|------|
| `src/lib/types.ts` | 수정 — DB 스키마에 맞게 업데이트 |
| `src/lib/supabase.ts` | 수정 — 타입 제네릭 추가 |
| `src/lib/api.ts` | **신규** — 데이터 접근 함수 |
| `src/lib/seed.ts` | **신규** — 시드 데이터 스크립트 |
| `supabase/schema.sql` | **신규** — 테이블 생성 SQL |

---

## 2단계: 인증 (Authentication)

**목표**: Supabase Auth로 이메일/비밀번호 로그인을 구현한다.

### 2-1. 인증 인프라
- [ ] `src/lib/auth.ts` — signUp, signIn, signOut, getUser 함수
- [ ] `src/components/auth/auth-provider.tsx` — React Context로 인증 상태 관리
- [ ] `src/components/auth/login-form.tsx` — 로그인/회원가입 폼

### 2-2. 페이지 연동
- [ ] `src/app/profile/page.tsx` — 로그인 상태에 따라 프로필 또는 로그인 폼 표시
- [ ] `src/app/layout.tsx` — AuthProvider 래핑
- [ ] 리뷰 작성 시 로그인 확인

### 파일 변경 목록
| 파일 | 작업 |
|------|------|
| `src/lib/auth.ts` | **신규** |
| `src/components/auth/auth-provider.tsx` | **신규** |
| `src/components/auth/login-form.tsx` | **신규** |
| `src/app/profile/page.tsx` | 수정 |
| `src/app/layout.tsx` | 수정 |

---

## 3단계: 화장실 목록/상세 API 연결

**목표**: 모든 페이지에서 mock 데이터 대신 Supabase API를 사용한다.

### 3-1. 페이지 업데이트
- [ ] `src/app/page.tsx` — `getRestrooms()` 호출로 교체
- [ ] `src/app/search/page.tsx` — `searchRestrooms()` 호출로 교체
- [ ] `src/app/restroom/[id]/page.tsx` — `getRestroomById()` + `getReviewsByRestroomId()` 호출
- [ ] 로딩 상태 UI 추가 (skeleton 또는 spinner)
- [ ] 에러 상태 처리

### 파일 변경 목록
| 파일 | 작업 |
|------|------|
| `src/app/page.tsx` | 수정 |
| `src/app/search/page.tsx` | 수정 |
| `src/app/restroom/[id]/page.tsx` | 수정 |

---

## 4단계: 리뷰 작성 기능

**목표**: 리뷰 폼에서 실제 DB에 리뷰를 저장한다.

### 4-1. 기능 구현
- [ ] `ReviewForm` — `createReview()` API 호출 연동
- [ ] `src/app/restroom/[id]/review/page.tsx` — 인증 확인 후 리뷰 작성
- [ ] 리뷰 등록 후 상세 페이지로 리다이렉트 및 데이터 갱신
- [ ] 사진 업로드 — Supabase Storage 연동 (선택)

### 파일 변경 목록
| 파일 | 작업 |
|------|------|
| `src/components/restroom/review-form.tsx` | 수정 |
| `src/app/restroom/[id]/review/page.tsx` | 수정 |
| `src/lib/api.ts` | 수정 — 사진 업로드 함수 추가 |

---

## 5단계: 지도 연동

**목표**: 카카오맵 또는 네이버맵 API로 실제 지도를 표시한다.

### 5-1. 지도 구현
- [ ] 지도 API 키 설정 (환경변수)
- [ ] `src/components/restroom/map-view.tsx` — 실제 지도 컴포넌트
- [ ] 마커로 화장실 위치 표시
- [ ] 현재 위치 기반 주변 화장실 표시
- [ ] `map-placeholder.tsx` 교체

### 5-2. 위치 기반 기능
- [ ] 브라우저 Geolocation API로 현재 위치 가져오기
- [ ] 거리 계산 함수 구현 (Haversine formula)
- [ ] 홈/검색 페이지에서 거리순 정렬

### 파일 변경 목록
| 파일 | 작업 |
|------|------|
| `src/components/restroom/map-view.tsx` | **신규** |
| `src/components/restroom/map-placeholder.tsx` | 삭제 또는 수정 |
| `src/app/page.tsx` | 수정 |
| `.env.local.example` | 수정 — 지도 API 키 추가 |

---

## 6단계: 프로필 페이지

**목표**: 로그인한 사용자의 리뷰 목록과 기본 정보를 표시한다.

### 6-1. 기능 구현
- [ ] 내 리뷰 목록 조회 (`getReviewsByUserId()`)
- [ ] 리뷰/사진 수 통계
- [ ] 프로필 수정 기능
- [ ] 로그아웃

### 파일 변경 목록
| 파일 | 작업 |
|------|------|
| `src/app/profile/page.tsx` | 수정 |
| `src/lib/api.ts` | 수정 — `getReviewsByUserId()` 추가 |

---

## 진행 상태

| 단계 | 상태 |
|------|------|
| 1. Supabase 연동 | 🔲 미시작 |
| 2. 인증 | 🔲 미시작 |
| 3. API 연결 | 🔲 미시작 |
| 4. 리뷰 작성 | 🔲 미시작 |
| 5. 지도 연동 | 🔲 미시작 |
| 6. 프로필 | 🔲 미시작 |
