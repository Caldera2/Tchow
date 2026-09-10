alter table public.orders add column if not exists idempotency_operation text not null default 'create_order';
alter table public.orders add column if not exists request_fingerprint text;
alter table public.orders drop constraint if exists orders_idempotency_key_key;
create unique index if not exists orders_customer_operation_key_idx on public.orders(user_id, idempotency_operation, idempotency_key);
create index if not exists orders_fingerprint_idx on public.orders(user_id, request_fingerprint);

create or replace function public.create_order_transaction(
  p_user_id uuid,
  p_idempotency_key text,
  p_request_fingerprint text,
  p_customer jsonb,
  p_delivery jsonb,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.orders;
  v_area public.delivery_service_areas;
  v_zone public.delivery_zones;
  v_slot public.delivery_time_slots;
  v_schedule public.delivery_schedules;
  v_reservation public.delivery_slot_reservations;
  v_quote public.box_quotes;
  v_product public.products;
  v_item jsonb;
  v_product_id uuid;
  v_quote_id uuid;
  v_quantity integer;
  v_subtotal integer := 0;
  v_delivery_fee integer;
  v_order public.orders;
  v_order_number text;
  v_weekday integer;
  v_capacity_count integer;
begin
  if p_user_id is null or nullif(trim(p_idempotency_key), '') is null or nullif(trim(p_request_fingerprint), '') is null then
    raise exception using errcode = 'P0001', message = 'order_request_invalid';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':create_order:' || p_idempotency_key, 0));

  select * into v_existing from public.orders
  where user_id = p_user_id and idempotency_operation = 'create_order' and idempotency_key = p_idempotency_key
  for update;
  if v_existing.id is not null then
    if v_existing.request_fingerprint is distinct from p_request_fingerprint then
      raise exception using errcode = 'P0001', message = 'idempotency_key_reused';
    end if;
    return jsonb_build_object('order', jsonb_build_object('id', v_existing.id, 'order_number', v_existing.order_number, 'status', v_existing.status, 'payment_status', v_existing.payment_status, 'subtotal_kobo', v_existing.subtotal_kobo, 'delivery_fee_kobo', v_existing.delivery_fee_kobo, 'total_kobo', v_existing.total_kobo), 'duplicate', true);
  end if;

  select a.* into v_area from public.delivery_service_areas a where a.id = (p_delivery->>'serviceAreaId')::uuid and a.is_active;
  select z.* into v_zone from public.delivery_zones z where z.service_area_id = v_area.id and z.is_active
    and exists (select 1 from public.delivery_time_slots s where s.zone_id = z.id and s.id = (p_delivery->>'slotId')::uuid and s.is_active)
    for update;
  select s.* into v_slot from public.delivery_time_slots s where s.zone_id = v_zone.id and s.id = (p_delivery->>'slotId')::uuid and s.is_active for update;
  if v_area.id is null or v_zone.id is null or v_slot.id is null then raise exception using errcode = 'P0001', message = 'delivery_selection_invalid'; end if;
  if (p_delivery->>'deliveryDate')::date < (now() at time zone 'Africa/Lagos')::date then raise exception using errcode = 'P0001', message = 'delivery_date_in_past'; end if;
  v_weekday := extract(dow from (p_delivery->>'deliveryDate')::date);
  select ds.* into v_schedule from public.delivery_schedules ds where ds.zone_id = v_zone.id and ds.weekday = v_weekday and ds.is_active;
  if v_schedule.id is null or v_slot.starts_at < v_schedule.opens_at or v_slot.ends_at > v_schedule.closes_at then raise exception using errcode = 'P0001', message = 'delivery_schedule_invalid'; end if;
  if exists (select 1 from public.delivery_closures c where (c.zone_id = v_zone.id or c.zone_id is null) and c.starts_at < (((p_delivery->>'deliveryDate')::date + 1)::timestamp at time zone 'Africa/Lagos') and c.ends_at > ((p_delivery->>'deliveryDate')::date::timestamp at time zone 'Africa/Lagos')) then raise exception using errcode = 'P0001', message = 'delivery_closed'; end if;
  if (((p_delivery->>'deliveryDate')::date + v_slot.starts_at)::timestamp at time zone 'Africa/Lagos') < now() + make_interval(mins => v_zone.lead_time_minutes) or now() > (((p_delivery->>'deliveryDate')::date + v_slot.starts_at)::timestamp at time zone 'Africa/Lagos') - make_interval(mins => v_zone.order_cutoff_minutes) then raise exception using errcode = 'P0001', message = 'delivery_cutoff_passed'; end if;

  select count(*) into v_capacity_count from public.delivery_slot_reservations r where r.slot_id = v_slot.id and r.delivery_date = (p_delivery->>'deliveryDate')::date and ((r.status = 'reserved' and r.expires_at > now()) or r.status = 'consumed');
  if v_slot.capacity is not null and v_capacity_count >= v_slot.capacity then raise exception using errcode = 'P0001', message = 'slot_capacity_reached'; end if;
  insert into public.delivery_slot_reservations(slot_id, service_area_id, delivery_date, user_id, status, expires_at) values (v_slot.id, v_area.id, (p_delivery->>'deliveryDate')::date, p_user_id, 'reserved', now() + interval '30 minutes') returning * into v_reservation;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_quantity := (v_item->>'quantity')::integer;
    if v_quantity is null or v_quantity < 1 or v_quantity > 50 or ((v_item ? 'productId') and (v_item ? 'boxQuoteId')) then raise exception using errcode = 'P0001', message = 'order_item_invalid'; end if;
    if v_item ? 'productId' then
      v_product_id := (v_item->>'productId')::uuid;
      select * into v_product from public.products where id = v_product_id and status = 'published' and is_available for update;
      if v_product.id is null then raise exception using errcode = 'P0001', message = 'product_unavailable'; end if;
      if exists (select 1 from public.product_delivery_schedules r where r.product_id = v_product.id and r.is_active) and not exists (select 1 from public.product_delivery_schedules r where r.product_id = v_product.id and r.is_active and (r.weekday is null or r.weekday = v_weekday) and (r.starts_on is null or (p_delivery->>'deliveryDate')::date >= r.starts_on) and (r.ends_on is null or (p_delivery->>'deliveryDate')::date <= r.ends_on)) then raise exception using errcode = 'P0001', message = 'product_schedule_invalid'; end if;
      v_subtotal := v_subtotal + v_product.price_kobo * v_quantity;
    elsif v_item ? 'boxQuoteId' then
      v_quote_id := (v_item->>'boxQuoteId')::uuid;
      select * into v_quote from public.box_quotes where id = v_quote_id for update;
      if v_quote.id is null or v_quote.consumed_at is not null or v_quote.expires_at <= now() or (v_quote.user_id is not null and v_quote.user_id <> p_user_id) then raise exception using errcode = 'P0001', message = 'quote_invalid'; end if;
      if v_quote.currency <> 'NGN' or exists (select 1 from jsonb_array_elements(v_quote.components_snapshot) c where not exists (select 1 from public.products p where p.id = (c->>'product_id')::uuid and p.status = 'published' and p.is_available)) then raise exception using errcode = 'P0001', message = 'quote_component_unavailable'; end if;
      if exists (select 1 from jsonb_array_elements(v_quote.components_snapshot) c where exists (select 1 from public.product_delivery_schedules r where r.product_id = (c->>'product_id')::uuid and r.is_active) and not exists (select 1 from public.product_delivery_schedules r where r.product_id = (c->>'product_id')::uuid and r.is_active and (r.weekday is null or r.weekday = v_weekday) and (r.starts_on is null or (p_delivery->>'deliveryDate')::date >= r.starts_on) and (r.ends_on is null or (p_delivery->>'deliveryDate')::date <= r.ends_on))) then raise exception using errcode = 'P0001', message = 'quote_component_schedule_invalid'; end if;
      if not exists (select 1 from public.box_sizes b where b.id = v_quote.box_size_id and b.status = 'published' and b.configuration_version = v_quote.configuration_version) then raise exception using errcode = 'P0001', message = 'quote_stale'; end if;
      v_subtotal := v_subtotal + v_quote.total_kobo * v_quantity;
    else raise exception using errcode = 'P0001', message = 'order_item_invalid'; end if;
  end loop;
  v_delivery_fee := v_zone.fee_kobo;
  v_order_number := 'TC-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  insert into public.orders(order_number, user_id, idempotency_operation, idempotency_key, request_fingerprint, customer_name, customer_email, customer_phone, delivery_zone_id, delivery_service_area_id, delivery_slot_id, delivery_date, delivery_reservation_id, delivery_address_snapshot, currency, subtotal_kobo, delivery_fee_kobo, discount_kobo, total_kobo, delivery_instructions)
  values (v_order_number, p_user_id, 'create_order', p_idempotency_key, p_request_fingerprint, p_customer->>'name', p_customer->>'email', p_customer->>'phone', v_zone.id, v_area.id, v_slot.id, (p_delivery->>'deliveryDate')::date, v_reservation.id, jsonb_build_object('address',p_delivery->>'address','area',p_delivery->>'area','city',p_delivery->>'city','state',p_delivery->>'state','serviceAreaId',v_area.id,'slotId',v_slot.id,'deliveryDate',p_delivery->>'deliveryDate','instructions',p_delivery->>'instructions'), 'NGN', v_subtotal, v_delivery_fee, 0, v_subtotal + v_delivery_fee, p_delivery->>'instructions') returning * into v_order;
  update public.delivery_slot_reservations set status = 'consumed', order_id = v_order.id where id = v_reservation.id;
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_quantity := (v_item->>'quantity')::integer;
    if v_item ? 'productId' then
      select * into v_product from public.products where id = (v_item->>'productId')::uuid;
      insert into public.order_items(order_id, product_id, product_name_snapshot, unit_price_kobo, quantity, line_total_kobo, components_snapshot, notes) values (v_order.id, v_product.id, v_product.name, v_product.price_kobo, v_quantity, v_product.price_kobo * v_quantity, null, nullif(v_item->>'notes',''));
    else
      select * into v_quote from public.box_quotes where id = (v_item->>'boxQuoteId')::uuid;
      insert into public.order_items(order_id, box_quote_id, product_name_snapshot, unit_price_kobo, quantity, line_total_kobo, components_snapshot, notes) values (v_order.id, v_quote.id, (select name from public.box_sizes where id = v_quote.box_size_id) || ' (quoted)', v_quote.total_kobo, v_quantity, v_quote.total_kobo * v_quantity, v_quote.components_snapshot, nullif(v_item->>'notes',''));
      update public.box_quotes set consumed_at = now() where id = v_quote.id and consumed_at is null;
    end if;
  end loop;
  insert into public.checkout_snapshots(order_id, payload) values (v_order.id, jsonb_build_object('customer',p_customer,'delivery',p_delivery,'items',p_items,'subtotal_kobo',v_subtotal,'delivery_fee_kobo',v_delivery_fee,'total_kobo',v_order.total_kobo));
  insert into public.order_status_history(order_id, from_status, to_status, changed_by, note) values (v_order.id, null, 'received_for_review', p_user_id, 'Order received');
  insert into public.notification_outbox(channel, event_type, recipient, payload, idempotency_key) values ('email', 'order_received', v_order.customer_email, jsonb_build_object('orderId',v_order.id,'orderNumber',v_order.order_number), 'order-received:'||v_order.id) on conflict do nothing;
  return jsonb_build_object('order', jsonb_build_object('id',v_order.id,'order_number',v_order.order_number,'status',v_order.status,'payment_status',v_order.payment_status,'subtotal_kobo',v_order.subtotal_kobo,'delivery_fee_kobo',v_order.delivery_fee_kobo,'total_kobo',v_order.total_kobo), 'duplicate', false);
end;
$$;

revoke all on function public.create_order_transaction(uuid,text,text,jsonb,jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.create_order_transaction(uuid,text,text,jsonb,jsonb,jsonb) to service_role;
