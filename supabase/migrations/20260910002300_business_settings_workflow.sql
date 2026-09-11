create or replace function public.save_business_settings(p_settings jsonb, p_publish_keys text[] default '{}', p_unpublish_keys text[] default '{}', p_actor_id uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare item record; key_name text; value jsonb; public_key text; updated_keys text[] := '{}'; published_keys text[] := '{}'; unpublished_keys text[] := '{}';
begin
  if p_actor_id is null or jsonb_typeof(coalesce(p_settings, '{}'::jsonb)) <> 'object' then raise exception using errcode='P0001', message='settings_request_invalid'; end if;
  for item in select * from jsonb_each(coalesce(p_settings, '{}'::jsonb)) loop
    key_name := item.key; value := item.value; public_key := regexp_replace(key_name, '^private\.', '');
    if key_name not in ('brand_name','tagline','contact_email','catering_email','partnership_email','phone','whatsapp','operating_hours','homepage_announcement','homepage_featured_product_ids','social_links','private.delivery_message','private.whatsapp_number','private.notification_preferences') then raise exception using errcode='P0001', message='unsupported_setting'; end if;
    if key_name in ('homepage_featured_product_ids') and jsonb_typeof(value) <> 'array' then raise exception using errcode='P0001', message='setting_type_invalid'; end if;
    if key_name in ('social_links','private.notification_preferences') and jsonb_typeof(value) <> 'object' then raise exception using errcode='P0001', message='setting_type_invalid'; end if;
    if key_name not like 'private.%' and jsonb_typeof(value) <> 'string' and key_name not in ('homepage_featured_product_ids','social_links') then raise exception using errcode='P0001', message='setting_type_invalid'; end if;
    if key_name in ('private.delivery_message','private.whatsapp_number') and jsonb_typeof(value) <> 'string' then raise exception using errcode='P0001', message='setting_type_invalid'; end if;
    if key_name like 'private.%' then
      insert into public.operational_settings(key,value,updated_by) values (public_key,value,p_actor_id) on conflict (key) do update set value=excluded.value, updated_by=excluded.updated_by, updated_at=now();
    else
      insert into public.public_business_settings(key,value) values (key_name,value) on conflict (key) do update set value=excluded.value, updated_at=now();
    end if;
    updated_keys := array_append(updated_keys, key_name);
  end loop;
  foreach key_name in array coalesce(p_publish_keys,'{}') loop
    if key_name not in ('brand_name','tagline','contact_email','catering_email','partnership_email','phone','whatsapp','operating_hours','homepage_announcement','homepage_featured_product_ids','social_links') then raise exception using errcode='P0001', message='unsupported_setting'; end if;
    update public.public_business_settings set is_published=true, updated_at=now() where key=key_name;
    if not found then raise exception using errcode='P0001', message='setting_not_found'; end if;
    published_keys := array_append(published_keys,key_name);
  end loop;
  foreach key_name in array coalesce(p_unpublish_keys,'{}') loop
    update public.public_business_settings set is_published=false, updated_at=now() where key=key_name;
    if not found then raise exception using errcode='P0001', message='setting_not_found'; end if;
    unpublished_keys := array_append(unpublished_keys,key_name);
  end loop;
  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values (p_actor_id,'business_settings_saved','business_settings',gen_random_uuid(),jsonb_build_object('updated',updated_keys,'published',published_keys,'unpublished',unpublished_keys));
  return jsonb_build_object('saved',true,'updated',updated_keys,'published',published_keys,'unpublished',unpublished_keys);
end; $$;
revoke all on function public.save_business_settings(jsonb,text[],text[],uuid) from public, anon, authenticated;
grant execute on function public.save_business_settings(jsonb,text[],text[],uuid) to service_role;
