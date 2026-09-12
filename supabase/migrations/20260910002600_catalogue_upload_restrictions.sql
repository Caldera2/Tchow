-- Route catalogue uploads through the edge function so magic-byte and
-- product ownership checks cannot be bypassed by direct browser storage writes.
drop policy if exists "Menu staff upload catalogue images" on storage.objects;
drop policy if exists "Menu staff replace catalogue images" on storage.objects;

do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'storage' and table_name = 'buckets' and column_name = 'file_size_limit') then
    update storage.buckets
    set file_size_limit = 5242880,
        allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']::text[]
    where id = 'catalogue-images';
  end if;
end
$$;
