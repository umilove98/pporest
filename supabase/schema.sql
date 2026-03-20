-- PPORest Database Schema
-- Supabase에서 SQL Editor를 통해 실행하세요.
--
-- 공공 화장실 데이터는 정적 JSON으로 서빙 (public/data/public-restrooms.json)
-- DB에는 유저 활동 데이터만 저장합니다.

-- 0. 관리자 테이블
create table if not exists admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

-- 관리자 판별 함수
create or replace function is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from admin_users where user_id = auth.uid()
  );
$$;

-- 1. 유저 등록 화장실 (공공데이터에 없는 화장실)
create table if not exists user_restrooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  lat double precision not null,
  lng double precision not null,
  tags text[] default '{}',
  is_open boolean default true,
  status text not null default 'pending' check (status in ('approved', 'pending')),
  submitted_by uuid not null references auth.users(id),
  has_disabled_access boolean default false,
  has_diaper_table boolean default false,
  has_bidet boolean default false,
  is_free boolean default true,
  open_hours text,
  gender_type text not null default 'mixed' check (gender_type in ('mixed', 'separated', 'male_only', 'female_only')),
  male_stalls smallint,
  female_stalls smallint,
  photo_urls text[] default '{}',
  created_at timestamptz default now()
);

-- 6. 공공데이터 수정 요청
create table if not exists edit_requests (
  id uuid primary key default gen_random_uuid(),
  restroom_id text not null,
  submitted_by uuid not null references auth.users(id),
  field text not null,
  current_value text not null default '',
  suggested_value text not null,
  reason text default '',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz default now()
);

-- 7. 안전 확인 (오늘도 안전해요!)
create table if not exists safety_checks (
  id uuid primary key default gen_random_uuid(),
  restroom_id text not null,
  user_id uuid not null references auth.users(id),
  checked_date date not null default current_date,
  created_at timestamptz default now(),
  unique(restroom_id, user_id, checked_date)
);

create index if not exists idx_safety_checks_restroom_date on safety_checks(restroom_id, checked_date);

-- 안전 확인 집계 뷰
create or replace view safety_stats as
select
  restroom_id,
  checked_date,
  count(*)::int as check_count
from safety_checks
group by restroom_id, checked_date;

-- 2. 리뷰 (공공데이터/유저등록 화장실 모두 대상)
--    restroom_id: 공공데이터는 "pd-1" 형태, 유저등록은 uuid
create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  restroom_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  user_name text not null,
  rating smallint not null check (rating >= 1 and rating <= 5),
  comment text default '',
  has_photo boolean default false,
  photo_url text,
  created_at timestamptz default now()
);

-- 3. 인덱스
create index if not exists idx_reviews_restroom_id on reviews(restroom_id);
create index if not exists idx_reviews_user_id on reviews(user_id);
create index if not exists idx_user_restrooms_location on user_restrooms(lat, lng);
create index if not exists idx_user_restrooms_status on user_restrooms(status);
create index if not exists idx_edit_requests_restroom on edit_requests(restroom_id);
create index if not exists idx_edit_requests_status on edit_requests(status);

-- 4. 리뷰 집계 뷰 (restroom_id별 평균 평점/리뷰 수)
create or replace view review_stats as
select
  restroom_id,
  coalesce(round(avg(rating)::numeric, 1), 0) as rating,
  count(*)::int as review_count
from reviews
group by restroom_id;

-- 5. RLS (Row Level Security) 정책
alter table user_restrooms enable row level security;
alter table reviews enable row level security;
alter table safety_checks enable row level security;
alter table edit_requests enable row level security;

-- user_restrooms: 승인된 화장실 + 본인 등록 + 관리자 전체 조회
create policy "user_restrooms_select" on user_restrooms
  for select using (status = 'approved' or submitted_by = auth.uid() or is_admin());

-- 로그인한 사용자만 화장실 등록 가능
create policy "user_restrooms_insert" on user_restrooms
  for insert with check (auth.uid() = submitted_by and status = 'pending');

-- 관리자만 상태 변경 가능 (승인)
create policy "user_restrooms_update_admin" on user_restrooms
  for update using (is_admin());

-- 관리자만 삭제 가능 (거절)
create policy "user_restrooms_delete_admin" on user_restrooms
  for delete using (is_admin());

-- 누구나 리뷰 조회 가능
create policy "reviews_select" on reviews
  for select using (true);

-- 로그인한 사용자만 리뷰 작성 가능
create policy "reviews_insert" on reviews
  for insert with check (auth.uid() = user_id);

-- 본인 리뷰만 수정/삭제 가능
create policy "reviews_update" on reviews
  for update using (auth.uid() = user_id);

create policy "reviews_delete" on reviews
  for delete using (auth.uid() = user_id);

-- edit_requests: 본인 요청 + 관리자 전체 조회
create policy "edit_requests_select" on edit_requests
  for select using (submitted_by = auth.uid() or is_admin());

-- 로그인한 사용자만 수정 요청 가능
create policy "edit_requests_insert" on edit_requests
  for insert with check (auth.uid() = submitted_by and status = 'pending');

-- 관리자만 수정 요청 처리 가능
create policy "edit_requests_update_admin" on edit_requests
  for update using (is_admin());

-- 누구나 안전 확인 횟수 조회 가능
create policy "safety_checks_select" on safety_checks
  for select using (true);

-- 로그인한 사용자만 안전 확인 가능
create policy "safety_checks_insert" on safety_checks
  for insert with check (auth.uid() = user_id);
