-- 유저 프로필 테이블 (순차 닉네임 자동 부여)
create sequence if not exists user_profiles_seq start 1;

create table if not exists user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null unique,
  created_at timestamptz not null default now()
);

-- RLS 활성화
alter table user_profiles enable row level security;

-- 누구나 닉네임 조회 가능 (리뷰 표시용)
create policy "user_profiles_select" on user_profiles
  for select using (true);

-- 본인 프로필만 insert 가능
create policy "user_profiles_insert" on user_profiles
  for insert with check (auth.uid() = user_id);

-- GRANT
grant select on user_profiles to anon, authenticated;
grant insert on user_profiles to authenticated;
grant usage, select on sequence user_profiles_seq to authenticated;

-- 시퀀스 nextval을 클라이언트에서 호출할 수 있는 RPC
create or replace function nextval_user_profiles_seq()
returns bigint
language sql
security definer
as $$
  select nextval('user_profiles_seq');
$$;

grant execute on function nextval_user_profiles_seq() to authenticated;
