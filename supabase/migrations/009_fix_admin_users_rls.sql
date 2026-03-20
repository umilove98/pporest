-- 009_fix_admin_users_rls.sql
-- admin_users RLS 활성화 (UNRESTRICTED 해제)
-- review_stats, safety_stats는 뷰이므로 security_invoker 설정으로 원본 테이블 RLS 적용

alter table admin_users enable row level security;

-- 관리자 여부 확인을 위해 누구나 조회 가능 (user_id만 노출, 민감 정보 없음)
create policy "admin_users_select" on admin_users
  for select using (true);

-- 뷰에 security_invoker 설정 (호출자 권한으로 원본 테이블 RLS 적용)
alter view review_stats set (security_invoker = true);
alter view safety_stats set (security_invoker = true);
