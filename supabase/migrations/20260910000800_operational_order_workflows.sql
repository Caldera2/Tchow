alter type public.order_status add value if not exists 'dispatched';
alter table public.order_status_history add column if not exists reason text;
alter table public.order_status_history add column if not exists idempotency_key text unique;
alter table public.refunds add column if not exists status text not null default 'requested' check (status in ('requested','pending','successful','failed'));
alter table public.refunds add column if not exists requested_by uuid references public.profiles(id) on delete set null;
alter table public.refunds add column if not exists provider_refund_reference text unique;
alter table public.refunds add column if not exists updated_at timestamptz not null default now();
create index if not exists orders_operations_page_idx on public.orders(status, payment_status, created_at desc, id);
create index if not exists order_history_order_idx on public.order_status_history(order_id, created_at desc);
create unique index if not exists refunds_one_active_per_tx_idx on public.refunds(verified_transaction_id) where status in ('requested','pending');

create or replace function public.transition_order(p_order_id uuid, p_to_status public.order_status, p_reason text, p_idempotency_key text, p_actor_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare o public.orders; v_allowed boolean := false; v_history public.order_status_history;
begin
  if p_reason is null or length(trim(p_reason)) < 2 then raise exception using errcode='P0001', message='transition_reason_required'; end if;
  select * into o from public.orders where id = p_order_id for update;
  if o.id is null then raise exception using errcode='P0001', message='order_not_found'; end if;
  if exists (select 1 from public.order_status_history where idempotency_key = p_idempotency_key) then return jsonb_build_object('duplicate', true, 'status', o.status); end if;
  v_allowed := (o.status, p_to_status) in (('received_for_review','confirmed'),('confirmed','preparing'),('preparing','ready_for_dispatch'),('ready_for_dispatch','dispatched'),('dispatched','completed'),('received_for_review','cancelled'),('confirmed','cancelled'));
  if not v_allowed then raise exception using errcode='P0001', message='invalid_transition'; end if;
  if p_to_status = 'preparing' and o.payment_status <> 'paid' then raise exception using errcode='P0001', message='payment_required'; end if;
  update public.orders set status = p_to_status, updated_at = now() where id = o.id;
  insert into public.order_status_history(order_id, from_status, to_status, changed_by, note, reason, idempotency_key) values (o.id, o.status, p_to_status, p_actor_id, p_reason, p_reason, p_idempotency_key) returning * into v_history;
  insert into public.notification_outbox(channel, event_type, recipient, payload, idempotency_key) values ('email', 'order_status_changed', o.customer_email, jsonb_build_object('orderId',o.id,'status',p_to_status), 'order-status:'||p_idempotency_key) on conflict do nothing;
  return jsonb_build_object('duplicate', false, 'status', p_to_status, 'historyId', v_history.id);
end; $$;
revoke all on function public.transition_order(uuid, public.order_status, text, text, uuid) from public, anon, authenticated;

create or replace function public.request_order_refund(p_order_id uuid, p_amount_kobo integer, p_reason text, p_idempotency_key text, p_actor_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare o public.orders; t public.verified_transactions; total_refunded integer;
begin
  if p_amount_kobo <= 0 or p_reason is null or length(trim(p_reason)) < 2 then raise exception using errcode='P0001', message='refund_reason_or_amount_invalid'; end if;
  select * into o from public.orders where id = p_order_id for update;
  select * into t from public.verified_transactions where payment_attempt_id in (select id from public.payment_attempts where order_id = p_order_id) order by verified_at desc limit 1;
  if o.id is null or t.id is null then raise exception using errcode='P0001', message='verified_payment_required'; end if;
  select coalesce(sum(amount_kobo),0) into total_refunded from public.refunds where verified_transaction_id = t.id and status in ('requested','pending','successful');
  if total_refunded + p_amount_kobo > t.amount_kobo then raise exception using errcode='P0001', message='refund_exceeds_payment'; end if;
  insert into public.refunds(verified_transaction_id, provider_reference, amount_kobo, currency, reason, requested_by) values (t.id, 'pending-'||p_idempotency_key, p_amount_kobo, t.currency, p_reason, p_actor_id) on conflict (provider_reference) do nothing;
  return jsonb_build_object('status','requested','transactionId',t.id);
end; $$;
revoke all on function public.request_order_refund(uuid, integer, text, text, uuid) from public, anon, authenticated;
