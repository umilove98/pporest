-- 003_add_safety_checks.sql
-- 안전 확인 (오늘도 안전해요!) 기능

create table if not exists safety_checks (
  id uuid primary key default gen_random_uuid(),
  restroom_id text not null,
  user_id uuid not null references auth.users(id),
  checked_date date not null default current_date,
  created_at timestamptz default now(),
  unique(restroom_id, user_id, checked_date)
);

create index if not exists idx_safety_checks_restroom_date on safety_checks(restroom_id, checked_date);

create or replace view safety_stats as
select
  restroom_id,
  checked_date,
  count(*)::int as check_count
from safety_checks
group by restroom_id, checked_date;

alter table safety_checks enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'safety_checks_select') then
    create policy "safety_checks_select" on safety_checks for select using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'safety_checks_insert') then
    create policy "safety_checks_insert" on safety_checks for insert with check (auth.uid() = user_id);
  end if;
end $$;
