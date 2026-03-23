-- RPC: 상세 페이지용 화장실 정보 + 리뷰통계 + 오늘 안전확인 한방 조회
-- 공공/유저 테이블을 동시에 조회하고, review_stats + safety_checks를 조인
-- NOTE: restroom_id 컬럼이 uuid인 테이블이 있으므로 명시적 캐스팅 필요

drop function if exists get_restroom_detail(text, uuid);

create or replace function get_restroom_detail(
  p_restroom_id text,
  p_user_id uuid default null
)
returns json
language plpgsql
stable
security definer
as $$
declare
  v_result json;
begin
  select json_build_object(
    -- 공공 화장실 데이터
    'public', (
      select row_to_json(p.*)
      from public_restrooms p
      where p.id = p_restroom_id
    ),
    -- 유저 등록 화장실 데이터
    'user', (
      select row_to_json(u.*)
      from user_restrooms u
      where u.id::text = p_restroom_id
    ),
    -- 리뷰 통계 (restroom_id가 uuid일 수 있으므로 text로 캐스팅)
    'stats', (
      select json_build_object(
        'rating', coalesce(round(avg(r.rating)::numeric, 1), 0),
        'review_count', count(*)::int
      )
      from reviews r
      where r.restroom_id::text = p_restroom_id
    ),
    -- 오늘 안전 확인 수
    'safety_count', (
      select count(*)::int
      from safety_checks sc
      where sc.restroom_id::text = p_restroom_id
        and sc.checked_date = current_date
    ),
    -- 현재 유저가 오늘 이미 확인했는지
    'already_checked', (
      select exists(
        select 1
        from safety_checks sc
        where sc.restroom_id::text = p_restroom_id
          and sc.user_id = p_user_id
          and sc.checked_date = current_date
      )
    )
  ) into v_result;

  return v_result;
end;
$$;

-- GRANT: 비로그인/로그인 모두 호출 가능
grant execute on function get_restroom_detail(text, uuid) to anon, authenticated;
