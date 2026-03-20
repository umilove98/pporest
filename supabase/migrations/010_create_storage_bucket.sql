-- 010_create_storage_bucket.sql
-- 화장실 사진 업로드용 Storage 버킷

insert into storage.buckets (id, name, public)
values ('restroom-photos', 'restroom-photos', true)
on conflict (id) do nothing;

-- 누구나 조회 가능
create policy "restroom_photos_select" on storage.objects
  for select using (bucket_id = 'restroom-photos');

-- 로그인 유저만 업로드 가능
create policy "restroom_photos_insert" on storage.objects
  for insert with check (bucket_id = 'restroom-photos' and auth.role() = 'authenticated');

-- 본인 업로드 파일만 삭제 가능
create policy "restroom_photos_delete" on storage.objects
  for delete using (bucket_id = 'restroom-photos' and auth.uid()::text = (storage.foldername(name))[1]);
