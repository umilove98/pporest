-- review_stats 뷰: security_invoker 해제하여 anon에서도 조회 가능하도록
-- 별점 집계 결과는 공개 데이터이므로 RLS 불필요
alter view review_stats set (security_invoker = false);
