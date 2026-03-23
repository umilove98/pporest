-- reviews.restroom_id를 uuid → text로 변경
-- 공공화장실 ID가 "pd-XXX" 형식이므로 text 타입이어야 함

alter table reviews
  alter column restroom_id type text using restroom_id::text;

-- safety_checks도 동일하게 확인/변경
alter table safety_checks
  alter column restroom_id type text using restroom_id::text;
