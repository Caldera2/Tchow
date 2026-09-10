alter table public.refunds add column if not exists idempotency_key text;
alter table public.refunds add column if not exists provider_status text;
alter table public.refunds add column if not exists failure_reason text;
alter table public.refunds add column if not exists requested_at timestamptz not null default now();
alter table public.refunds add column if not exists processed_at timestamptz;
create unique index if not exists refunds_idempotency_idx on public.refunds(idempotency_key) where idempotency_key is not null;

create or replace function public.request_order_refund(p_order_id uuid, p_amount_kobo integer, p_reason text, p_idempotency_key text, p_actor_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_order public.orders; v_tx public.verified_transactions; v_refund public.refunds; v_total integer;
begin
  if p_actor_id is null or p_amount_kobo <= 0 or length(trim(coalesce(p_reason,''))) < 2 or length(trim(p_reason)) > 2000 then raise exception using errcode='P0001', message='refund_reason_or_amount_invalid'; end if;
  select * into v_refund from public.refunds where idempotency_key = p_idempotency_key for update;
  if v_refund.id is not null then return jsonb_build_object('duplicate', true, 'refundId', v_refund.id, 'status', v_refund.status); end if;
  select * into v_order from public.orders where id = p_order_id for update;
  select t.* into v_tx from public.verified_transactions t join public.payment_attempts a on a.id = t.payment_attempt_id where a.order_id = p_order_id order by t.verified_at desc limit 1 for update;
  if v_order.id is null or v_tx.id is null or v_tx.currency <> 'NGN' then raise exception using errcode='P0001', message='verified_payment_required'; end if;
  select coalesce(sum(amount_kobo) filter (where status in ('requested','pending','successful')),0) into v_total from public.refunds where verified_transaction_id = v_tx.id;
  if v_total + p_amount_kobo > v_tx.amount_kobo then raise exception using errcode='P0001', message='refund_exceeds_payment'; end if;
  insert into public.refunds(verified_transaction_id, provider_reference, amount_kobo, currency, reason, requested_by, idempotency_key, status)
    values (v_tx.id, 'local-'||gen_random_uuid()::text, p_amount_kobo, 'NGN', trim(p_reason), p_actor_id, p_idempotency_key, 'requested') returning * into v_refund;
  insert into public.audit_events(actor_id, action, entity_type, entity_id, metadata) values (p_actor_id, 'refund_requested', 'refund', v_refund.id, jsonb_build_object('orderId', p_order_id, 'amountKobo', p_amount_kobo, 'reason', p_reason));
  return jsonb_build_object('refundId', v_refund.id, 'transactionId', v_tx.id, 'transactionReference', v_tx.provider_reference, 'status', v_refund.status, 'amountKobo', v_refund.amount_kobo);
end; $$;

create or replace function public.apply_refund_provider_result(p_refund_id uuid, p_status text, p_provider_refund_reference text, p_provider_status text, p_failure_reason text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.refunds; total integer; begin
  select * into r from public.refunds where id = p_refund_id for update;
  if r.id is null then raise exception using errcode='P0001', message='refund_not_found'; end if;
  if p_status not in ('pending','successful','failed') then raise exception using errcode='P0001', message='invalid_refund_status'; end if;
  if r.status = 'successful' and p_status <> 'successful' then return jsonb_build_object('status', r.status, 'duplicate', true); end if;
  update public.refunds set status = p_status, provider_refund_reference = coalesce(p_provider_refund_reference, provider_refund_reference), provider_status = p_provider_status, failure_reason = p_failure_reason, processed_at = case when p_status = 'successful' then now() else processed_at end, updated_at = now() where id = r.id returning * into r;
  if p_status = 'successful' then select coalesce(sum(amount_kobo) filter (where status='successful'),0) into total from public.refunds where verified_transaction_id = r.verified_transaction_id; update public.orders set payment_status = case when total >= (select amount_kobo from public.verified_transactions where id=r.verified_transaction_id) then 'refunded'::payment_status else 'partially_refunded'::payment_status end where id = (select a.order_id from public.payment_attempts a join public.verified_transactions t on t.payment_attempt_id=a.id where t.id=r.verified_transaction_id); end if;
  insert into public.notification_outbox(channel,event_type,recipient,payload,idempotency_key) values ('email','cancellation_refund_update',(select o.customer_email from public.orders o join public.payment_attempts a on a.order_id=o.id join public.verified_transactions t on t.payment_attempt_id=a.id where t.id=r.verified_transaction_id),jsonb_build_object('refundId',r.id,'status',r.status,'amountKobo',r.amount_kobo),'refund-status:'||r.id||':'||r.status) on conflict (idempotency_key) do nothing;
  return jsonb_build_object('refundId',r.id,'status',r.status,'providerStatus',r.provider_status);
end; $$;
revoke all on function public.request_order_refund(uuid,integer,text,text,uuid) from public, anon, authenticated;
revoke all on function public.apply_refund_provider_result(uuid,text,text,text,text) from public, anon, authenticated;
