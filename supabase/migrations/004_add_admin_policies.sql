-- 004_add_admin_policies.sql
-- 관리자 테이블 + is_admin() 함수 + 관리자용 RLS 정책

-- 1. 관리자 테이블
create table if not exists admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

-- 2. 관리자 판별 함수
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

-- 3. user_restrooms: 관리자는 모든 pending 조회 + 승인(UPDATE) + 거절(DELETE) 가능

-- 기존 SELECT 정책 교체 (관리자는 전체 조회 가능)
drop policy if exists "user_restrooms_select" on user_restrooms;
create policy "user_restrooms_select" on user_restrooms
  for select using (
    status = 'approved'
    or submitted_by = auth.uid()
    or is_admin()
  );

-- 관리자만 상태 변경 가능
create policy "user_restrooms_update_admin" on user_restrooms
  for update using (is_admin());

-- 관리자만 삭제 가능 (거절 시)
create policy "user_restrooms_delete_admin" on user_restrooms
  for delete using (is_admin());

-- 4. edit_requests: 관리자는 모든 요청 조회 + 처리 가능

-- 기존 SELECT 정책 교체
drop policy if exists "edit_requests_select" on edit_requests;
create policy "edit_requests_select" on edit_requests
  for select using (
    submitted_by = auth.uid()
    or is_admin()
  );

-- 관리자만 상태 변경 가능
create policy "edit_requests_update_admin" on edit_requests
  for update using (is_admin());
