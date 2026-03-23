-- user_profiles에 프로필 사진 URL 컬럼 추가
alter table user_profiles add column if not exists avatar_url text;

-- 본인 프로필 업데이트 허용
create policy "user_profiles_update" on user_profiles
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant update on user_profiles to authenticated;
