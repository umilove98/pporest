-- 007_grant_admin_users_select.sql
-- admin_users 테이블에 SELECT 권한 부여
-- checkIsAdmin()이 클라이언트에서 직접 조회하므로 필요

grant select on admin_users to anon, authenticated;
