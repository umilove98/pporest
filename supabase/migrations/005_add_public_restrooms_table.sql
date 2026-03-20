-- 005_add_public_restrooms_table.sql
-- 공공 화장실 데이터를 DB로 마이그레이션

create table if not exists public_restrooms (
  id text primary key,               -- "pd-1" 형태
  name text not null,
  address text not null,
  lat double precision not null,
  lng double precision not null,
  disabled boolean default false,     -- 장애인 화장실
  diaper boolean default false,       -- 기저귀 교환대
  hours text,                         -- 개방시간
  male_toilet smallint default 0,
  male_urinal smallint default 0,
  female_toilet smallint default 0,
  emergency_bell boolean default false,
  cctv boolean default false,
  data_date text                      -- 데이터 기준일자
);

-- 위치 기반 조회용 인덱스
create index if not exists idx_public_restrooms_lat_lng on public_restrooms(lat, lng);

-- 텍스트 검색용 trigram 인덱스 (pg_trgm 확장 필요)
create extension if not exists pg_trgm;
create index if not exists idx_public_restrooms_name_trgm on public_restrooms using gin (name gin_trgm_ops);
create index if not exists idx_public_restrooms_address_trgm on public_restrooms using gin (address gin_trgm_ops);

-- 필터용 인덱스
create index if not exists idx_public_restrooms_disabled on public_restrooms(disabled) where disabled = true;
create index if not exists idx_public_restrooms_diaper on public_restrooms(diaper) where diaper = true;

-- RLS: 누구나 조회 가능, 수정 불가
alter table public_restrooms enable row level security;

create policy "public_restrooms_select" on public_restrooms
  for select using (true);

-- anon/authenticated 역할에 SELECT 권한 부여
grant select on public_restrooms to anon, authenticated;
