-- 프로필 사진 전용 Storage 버킷
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- 누구나 조회 가능
create policy "avatars_select" on storage.objects
  for select using (bucket_id = 'avatars');

-- 로그인 유저만 업로드 가능 (본인 폴더만)
create policy "avatars_insert" on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- 본인 파일만 덮어쓰기(update) 가능
create policy "avatars_update" on storage.objects
  for update using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- 본인 파일만 삭제 가능
create policy "avatars_delete" on storage.objects
  for delete using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
