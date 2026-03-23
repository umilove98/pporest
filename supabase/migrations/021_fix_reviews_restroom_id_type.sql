-- reviews.restroom_id, safety_checks.restroom_id를 uuid → text로 변경
-- 공공화장실 ID가 "pd-XXX" 형식이므로 text 타입이어야 함
-- 뷰가 컬럼을 참조하므로 drop → alter → recreate 순서로 진행

-- 1. 의존 뷰 제거
drop view if exists review_stats;
drop view if exists safety_stats;

-- 2. 컬럼 타입 변경
alter table reviews
  alter column restroom_id type text using restroom_id::text;

alter table safety_checks
  alter column restroom_id type text using restroom_id::text;

-- 3. 뷰 재생성
create or replace view review_stats as
select
  restroom_id,
  coalesce(round(avg(rating)::numeric, 1), 0) as rating,
  count(*)::int as review_count
from reviews
group by restroom_id;

create or replace view safety_stats as
select
  restroom_id,
  checked_date,
  count(*)::int as check_count
from safety_checks
group by restroom_id, checked_date;

-- 4. 뷰 security_invoker 설정 복원 (009에서 설정한 것)
alter view review_stats set (security_invoker = false);
alter view safety_stats set (security_invoker = true);
