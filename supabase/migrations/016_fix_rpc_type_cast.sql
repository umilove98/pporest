-- RPC 함수에서 reviews.restroom_id join 시 명시적 text 캐스팅
-- PostgreSQL이 uuid = text 비교로 해석하는 문제 방지

create or replace function get_public_restrooms_with_stats(
  sw_lat double precision,
  sw_lng double precision,
  ne_lat double precision,
  ne_lng double precision,
  max_count int default 30
)
returns table (
  id text,
  name text,
  address text,
  lat double precision,
  lng double precision,
  disabled boolean,
  diaper boolean,
  hours text,
  male_toilet smallint,
  male_urinal smallint,
  female_toilet smallint,
  emergency_bell boolean,
  cctv boolean,
  data_date text,
  avg_rating numeric,
  review_count bigint
)
language sql stable
as $$
  select
    p.id, p.name, p.address, p.lat, p.lng,
    p.disabled, p.diaper, p.hours,
    p.male_toilet, p.male_urinal, p.female_toilet,
    p.emergency_bell, p.cctv, p.data_date,
    coalesce(round(avg(r.rating)::numeric, 1), 0) as avg_rating,
    count(r.id) as review_count
  from public_restrooms p
  left join reviews r on r.restroom_id = p.id::text
  where p.lat between sw_lat and ne_lat
    and p.lng between sw_lng and ne_lng
  group by p.id
  limit max_count;
$$;

create or replace function search_public_restrooms_with_stats(
  search_query text default '',
  filter_disabled boolean default false,
  filter_diaper boolean default false,
  filter_24h boolean default false,
  max_count int default 30
)
returns table (
  id text,
  name text,
  address text,
  lat double precision,
  lng double precision,
  disabled boolean,
  diaper boolean,
  hours text,
  male_toilet smallint,
  male_urinal smallint,
  female_toilet smallint,
  emergency_bell boolean,
  cctv boolean,
  data_date text,
  avg_rating numeric,
  review_count bigint
)
language sql stable
as $$
  select
    p.id, p.name, p.address, p.lat, p.lng,
    p.disabled, p.diaper, p.hours,
    p.male_toilet, p.male_urinal, p.female_toilet,
    p.emergency_bell, p.cctv, p.data_date,
    coalesce(round(avg(r.rating)::numeric, 1), 0) as avg_rating,
    count(r.id) as review_count
  from public_restrooms p
  left join reviews r on r.restroom_id = p.id::text
  where (search_query = '' or p.name ilike '%' || search_query || '%' or p.address ilike '%' || search_query || '%')
    and (not filter_disabled or p.disabled = true)
    and (not filter_diaper or p.diaper = true)
    and (not filter_24h or p.hours ilike '%24시간%')
  group by p.id
  limit max_count;
$$;

grant execute on function get_public_restrooms_with_stats to anon, authenticated;
grant execute on function search_public_restrooms_with_stats to anon, authenticated;
