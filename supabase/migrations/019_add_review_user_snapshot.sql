-- 리뷰 작성 시점의 사용자 정보 스냅샷 저장
-- user_avg_rating: 작성 시점 해당 유저의 평균 리뷰 평점
-- user_top_preferences: 작성 시점 해당 유저의 상위 취향 목록 (JSON 배열)

alter table reviews
  add column if not exists user_avg_rating numeric(2,1) default null,
  add column if not exists user_top_preferences text[] default null;

grant select, insert, update on reviews to authenticated;
grant select on reviews to anon;
