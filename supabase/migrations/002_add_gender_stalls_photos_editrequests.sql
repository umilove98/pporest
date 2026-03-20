-- 002_add_gender_stalls_photos_editrequests.sql
-- 화장실 성별 구분, 칸 수, 사진, 수정 요청 기능 추가

-- user_restrooms에 새 컬럼 추가
alter table user_restrooms add column if not exists gender_type text not null default 'mixed'
  check (gender_type in ('mixed', 'separated', 'male_only', 'female_only'));
alter table user_restrooms add column if not exists male_stalls smallint;
alter table user_restrooms add column if not exists female_stalls smallint;
alter table user_restrooms add column if not exists photo_urls text[] default '{}';

-- 수정 요청 테이블
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

create index if not exists idx_edit_requests_restroom on edit_requests(restroom_id);
create index if not exists idx_edit_requests_status on edit_requests(status);

-- RLS
alter table edit_requests enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'edit_requests_select') then
    create policy "edit_requests_select" on edit_requests
      for select using (submitted_by = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where policyname = 'edit_requests_insert') then
    create policy "edit_requests_insert" on edit_requests
      for insert with check (auth.uid() = submitted_by and status = 'pending');
  end if;
end $$;
