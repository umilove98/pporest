-- 006_drop_unused_restrooms.sql
-- 사용하지 않는 레거시 테이블/뷰 삭제
-- restrooms → public_restrooms + user_restrooms로 대체됨
-- restroom_stats → review_stats로 대체됨

-- reviews.restroom_id가 restrooms를 FK 참조 중이므로 먼저 제거
alter table if exists reviews drop constraint if exists reviews_restroom_id_fkey;

drop view if exists restroom_stats;
drop table if exists restrooms;
