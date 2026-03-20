-- PPORest Database Schema
-- Supabase에서 SQL Editor를 통해 실행하세요.
--
-- 공공 화장실 데이터는 정적 JSON으로 서빙 (public/data/public-restrooms.json)
-- DB에는 유저 활동 데이터만 저장합니다.

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

-- 승인된 화장실 또는 본인 등록 화장실 조회 가능
create policy "user_restrooms_select" on user_restrooms
  for select using (status = 'approved' or submitted_by = auth.uid());

-- 로그인한 사용자만 화장실 등록 가능
create policy "user_restrooms_insert" on user_restrooms
  for insert with check (auth.uid() = submitted_by and status = 'pending');

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
