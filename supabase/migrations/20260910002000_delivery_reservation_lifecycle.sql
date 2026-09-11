-- Keep order creation reservations temporary until payment is verified.
create or replace function public.keep_unpaid_reservation_temporary()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_payment public.payment_status;
begin
  if new.status = 'consumed' and new.order_id is not null then
    select payment_status into v_payment from public.orders where id = new.order_id;
    if v_payment is distinct from 'paid' and v_payment is distinct from 'partially_refunded' and v_payment is distinct from 'refunded' then
      new.status := 'reserved';
      new.expires_at := greatest(new.expires_at, now() + interval '30 minutes');
    end if;
  end if;
  return new;
end; $$;

drop trigger if exists delivery_reservation_payment_boundary on public.delivery_slot_reservations;
create trigger delivery_reservation_payment_boundary
before update of status, order_id on public.delivery_slot_reservations
for each row execute function public.keep_unpaid_reservation_temporary();

create or replace function public.expire_delivery_reservations(p_now timestamptz default now())
returns integer language plpgsql security definer set search_path = public as $$
declare v_count integer;
begin
  update public.delivery_slot_reservations r
  set status = 'expired'
  where r.status = 'reserved' and r.expires_at <= p_now
    and not exists (select 1 from public.orders o where o.id = r.order_id and o.payment_status in ('paid','partially_refunded','refunded'));
  get diagnostics v_count = row_count;
  return v_count;
end; $$;

create or replace function public.release_delivery_reservation(p_order_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_reservation public.delivery_slot_reservations;
begin
  select * into v_reservation from public.delivery_slot_reservations where order_id = p_order_id for update;
  if v_reservation.id is null then return false; end if;
  if v_reservation.status in ('reserved','consumed') then
    update public.delivery_slot_reservations set status = 'cancelled' where id = v_reservation.id;
    return true;
  end if;
  return false;
end; $$;

create or replace function public.release_cancelled_delivery_reservation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'cancelled' and old.status is distinct from new.status then
    perform public.release_delivery_reservation(new.id);
  end if;
  return new;
end; $$;

drop trigger if exists order_cancellation_releases_delivery on public.orders;
create trigger order_cancellation_releases_delivery
after update of status on public.orders
for each row execute function public.release_cancelled_delivery_reservation();

revoke all on function public.expire_delivery_reservations(timestamptz), public.release_delivery_reservation(uuid) from public, anon, authenticated;
grant execute on function public.expire_delivery_reservations(timestamptz), public.release_delivery_reservation(uuid) to service_role;

-- Capacity is consumed by the payment boundary, not by initial order creation.
create or replace function public.consume_paid_delivery_reservation(p_order_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.delivery_slot_reservations;
begin
  select * into r from public.delivery_slot_reservations where order_id = p_order_id for update;
  if r.id is null then return jsonb_build_object('ok', false, 'reason', 'reservation_missing'); end if;
  if r.status = 'consumed' then return jsonb_build_object('ok', true, 'duplicate', true); end if;
  if r.status <> 'reserved' or r.expires_at <= now() then return jsonb_build_object('ok', false, 'reason', 'reservation_expired'); end if;
  update public.delivery_slot_reservations set status = 'consumed' where id = r.id;
  return jsonb_build_object('ok', true, 'duplicate', false);
end; $$;
revoke all on function public.consume_paid_delivery_reservation(uuid) from public, anon, authenticated;
grant execute on function public.consume_paid_delivery_reservation(uuid) to service_role;

create or replace function public.prevent_payment_without_delivery_capacity()
returns trigger language plpgsql security definer set search_path = public as $$
declare r public.delivery_slot_reservations; v_reference text;
begin
  if new.payment_status = 'paid' and old.payment_status is distinct from new.payment_status then
    select * into r from public.delivery_slot_reservations where order_id = new.id for update;
    if r.id is null or r.status <> 'reserved' or r.expires_at <= now() then
      select pa.provider_reference into v_reference from public.payment_attempts pa where pa.order_id = new.id order by pa.created_at desc limit 1;
      insert into public.payment_exceptions(provider, provider_reference, order_id, reason, payload)
      values ('paystack', coalesce(v_reference, 'order-' || new.id::text), new.id, 'late_payment_after_reservation_expiry', jsonb_build_object('reservationId', r.id, 'reservationStatus', r.status));
      new.payment_status := 'pending';
    end if;
  end if;
  return new;
end; $$;

create or replace function public.consume_payment_delivery_capacity()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.payment_status = 'paid' and old.payment_status is distinct from new.payment_status then
    perform public.consume_paid_delivery_reservation(new.id);
  end if;
  return new;
end; $$;

drop trigger if exists prevent_payment_without_delivery_capacity on public.orders;
create trigger prevent_payment_without_delivery_capacity
before update of payment_status on public.orders
for each row execute function public.prevent_payment_without_delivery_capacity();
drop trigger if exists consume_payment_delivery_capacity on public.orders;
create trigger consume_payment_delivery_capacity
after update of payment_status on public.orders
for each row execute function public.consume_payment_delivery_capacity();
