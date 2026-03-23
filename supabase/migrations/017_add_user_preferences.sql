-- 사용자 취향 설문 (화장실 선호도)
-- 각 항목의 중요도를 순서(priority)로 저장

create table if not exists user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  -- 각 항목: null = 미설정, 1~6 = 우선순위 (1이 가장 중요)
  cleanliness    smallint,  -- 청결도 중요
  gender_separated smallint, -- 남녀분리 필수
  bidet          smallint,  -- 비데 필수
  stall_count    smallint,  -- 칸 수 많음 (대기시간 짧음)
  accessibility  smallint,  -- 장애인 접근성
  safety         smallint,  -- 안전 (비상벨/CCTV)
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

-- RLS
alter table user_preferences enable row level security;

-- 본인만 조회
create policy "users can read own preferences"
  on user_preferences for select
  using (auth.uid() = user_id);

-- 본인만 삽입
create policy "users can insert own preferences"
  on user_preferences for insert
  with check (auth.uid() = user_id);

-- 본인만 수정
create policy "users can update own preferences"
  on user_preferences for update
  using (auth.uid() = user_id);

-- GRANT
grant select, insert, update on user_preferences to authenticated;
