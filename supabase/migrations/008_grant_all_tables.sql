-- 008_grant_all_tables.sql
-- 수동 생성 테이블 전체에 필요한 GRANT 추가
-- Supabase 대시보드에서 만든 테이블은 자동 GRANT되지만
-- 마이그레이션으로 만든 테이블은 수동 GRANT 필요

-- 조회 권한
grant select on admin_users to anon, authenticated;
grant select on edit_requests to anon, authenticated;
grant select on user_restrooms to anon, authenticated;
grant select on reviews to anon, authenticated;
grant select on safety_checks to anon, authenticated;
grant select on public_restrooms to anon, authenticated;

-- 뷰 조회 권한
grant select on review_stats to anon, authenticated;
grant select on safety_stats to anon, authenticated;

-- 쓰기 권한 (authenticated만)
grant insert on edit_requests to authenticated;
grant insert on user_restrooms to authenticated;
grant insert on reviews to authenticated;
grant insert, update, delete on reviews to authenticated;
grant insert on safety_checks to authenticated;

-- 관리자 쓰기 권한
grant update, delete on user_restrooms to authenticated;
grant update on edit_requests to authenticated;
