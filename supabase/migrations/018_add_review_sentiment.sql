-- 리뷰 감성 분석 결과 저장 컬럼 추가
alter table reviews
  add column if not exists sentiment text
    check (sentiment in ('positive', 'negative', 'neutral'))
    default null;

-- 감성별 필터링을 위한 인덱스
create index if not exists idx_reviews_sentiment
  on reviews (restroom_id, sentiment);

-- GRANT (기존 권한에 포함되지만 명시적으로)
grant select, insert, update on reviews to authenticated;
grant select on reviews to anon;
