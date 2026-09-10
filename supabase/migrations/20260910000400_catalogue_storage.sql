alter table public.products add column if not exists dietary_information text;
alter table public.products add column if not exists is_available boolean not null default false;

drop policy if exists "Public reads published catalogue" on public.products;
create policy "Public reads available published catalogue" on public.products for select to anon, authenticated using (status = 'published' and is_available = true or (select public.is_staff()));
drop policy if exists "Published catalogue images are public" on storage.objects;
create policy "Published catalogue images are public" on storage.objects for select to anon, authenticated
using (bucket_id = 'catalogue-images' and exists (
  select 1 from public.product_images image
  join public.products product on product.id = image.product_id
  where image.storage_path = name and product.status = 'published' and product.is_available = true
));

create or replace function public.audit_product_change()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if old.price_kobo is distinct from new.price_kobo or old.status is distinct from new.status or old.is_available is distinct from new.is_available then
    insert into public.audit_events (actor_id, action, entity_type, entity_id, metadata)
    values ((select auth.uid()), 'product_changed', 'product', new.id, jsonb_build_object('old_price_kobo', old.price_kobo, 'new_price_kobo', new.price_kobo, 'old_status', old.status, 'new_status', new.status, 'old_is_available', old.is_available, 'new_is_available', new.is_available));
  end if;
  return new;
end;
$$;

revoke execute on function public.audit_product_change() from public, anon, authenticated;
create trigger products_audit_changes after update on public.products for each row execute procedure public.audit_product_change();

insert into storage.buckets (id, name, public)
values ('catalogue-images', 'catalogue-images', false), ('private-documents', 'private-documents', false)
on conflict (id) do update set public = excluded.public;

grant select on public.product_images to anon, authenticated;
grant insert, update, delete on public.product_images to authenticated;

create policy "Menu staff upload catalogue images" on storage.objects for insert to authenticated
with check (bucket_id = 'catalogue-images' and (select public.has_staff_permission('manage_menu')) and name ~ '^[0-9a-f-]{36}/[a-z0-9-]+\\.(jpg|jpeg|png|webp)$');
create policy "Menu staff replace catalogue images" on storage.objects for update to authenticated
using (bucket_id = 'catalogue-images' and (select public.has_staff_permission('manage_menu')))
with check (bucket_id = 'catalogue-images' and (select public.has_staff_permission('manage_menu')) and name ~ '^[0-9a-f-]{36}/[a-z0-9-]+\\.(jpg|jpeg|png|webp)$');
create policy "Menu staff delete unreferenced catalogue images" on storage.objects for delete to authenticated
using (bucket_id = 'catalogue-images' and (select public.has_staff_permission('manage_menu')) and not exists (select 1 from public.product_images where storage_path = name));

-- Private documents intentionally receive no browser policies.
