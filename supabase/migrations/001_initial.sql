-- 001_initial.sql
-- 초기 마이그레이션: user_restrooms, reviews 테이블 생성
-- 이미 실행된 경우 스킵됩니다 (IF NOT EXISTS 사용)

-- 1. 유저 등록 화장실
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
  created_at timestamptz default now()
);

-- 2. 리뷰
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

-- 4. 리뷰 집계 뷰
create or replace view review_stats as
select
  restroom_id,
  coalesce(round(avg(rating)::numeric, 1), 0) as rating,
  count(*)::int as review_count
from reviews
group by restroom_id;

-- 5. RLS 정책
alter table user_restrooms enable row level security;
alter table reviews enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'user_restrooms_select') then
    create policy "user_restrooms_select" on user_restrooms
      for select using (status = 'approved' or submitted_by = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where policyname = 'user_restrooms_insert') then
    create policy "user_restrooms_insert" on user_restrooms
      for insert with check (auth.uid() = submitted_by and status = 'pending');
  end if;
  if not exists (select 1 from pg_policies where policyname = 'reviews_select') then
    create policy "reviews_select" on reviews for select using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'reviews_insert') then
    create policy "reviews_insert" on reviews for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'reviews_update') then
    create policy "reviews_update" on reviews for update using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'reviews_delete') then
    create policy "reviews_delete" on reviews for delete using (auth.uid() = user_id);
  end if;
end $$;
