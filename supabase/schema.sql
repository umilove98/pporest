-- PPORest Database Schema
-- Supabase에서 SQL Editor를 통해 실행하세요.

-- 1. 화장실 테이블
create table if not exists restrooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  lat double precision not null,
  lng double precision not null,
  tags text[] default '{}',
  is_open boolean default true,
  created_at timestamptz default now()
);

-- 2. 리뷰 테이블
create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  restroom_id uuid not null references restrooms(id) on delete cascade,
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
create index if not exists idx_restrooms_location on restrooms(lat, lng);

-- 4. 화장실 평균 평점/리뷰 수 뷰
create or replace view restroom_stats as
select
  r.id,
  r.name,
  r.address,
  r.lat,
  r.lng,
  r.tags,
  r.is_open,
  r.created_at,
  coalesce(round(avg(rv.rating)::numeric, 1), 0) as rating,
  count(rv.id)::int as review_count
from restrooms r
left join reviews rv on rv.restroom_id = r.id
group by r.id;

-- 5. RLS (Row Level Security) 정책
alter table restrooms enable row level security;
alter table reviews enable row level security;

-- 누구나 화장실 목록 조회 가능
create policy "restrooms_select" on restrooms
  for select using (true);

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
