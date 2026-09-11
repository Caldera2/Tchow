alter table public.refunds add column if not exists request_fingerprint text;
alter table public.refunds add column if not exists provider_attempted_at timestamptz;
alter table public.refunds add column if not exists next_reconciliation_at timestamptz;
alter table public.refunds add column if not exists reconciliation_attempts integer not null default 0 check (reconciliation_attempts >= 0);
alter table public.refunds add column if not exists requires_manual_review boolean not null default false;
create index if not exists refunds_reconciliation_idx on public.refunds(status, next_reconciliation_at, requires_manual_review);

create or replace function public.request_order_refund(p_order_id uuid, p_amount_kobo integer, p_reason text, p_idempotency_key text, p_actor_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_order public.orders; v_tx public.verified_transactions; v_refund public.refunds; v_total integer; v_fingerprint text;
begin
  if p_actor_id is null or p_order_id is null or p_amount_kobo <= 0 or length(trim(coalesce(p_reason,''))) < 2 or length(trim(p_reason)) > 2000 or nullif(trim(p_idempotency_key),'') is null then raise exception using errcode='P0001', message='refund_reason_or_amount_invalid'; end if;
  select * into v_order from public.orders where id = p_order_id for update;
  select t.* into v_tx from public.verified_transactions t join public.payment_attempts a on a.id = t.payment_attempt_id where a.order_id = p_order_id order by t.verified_at desc limit 1 for update;
  if v_order.id is null or v_tx.id is null or v_tx.currency <> 'NGN' then raise exception using errcode='P0001', message='verified_payment_required'; end if;
  v_fingerprint := md5(p_order_id::text || ':refund:' || p_amount_kobo::text || ':' || v_tx.currency || ':provider');
  select * into v_refund from public.refunds where idempotency_key = p_idempotency_key for update;
  if v_refund.id is not null then
    if v_refund.request_fingerprint is distinct from v_fingerprint then raise exception using errcode='P0001', message='refund_idempotency_key_reused'; end if;
    return jsonb_build_object('duplicate', true, 'refundId', v_refund.id, 'status', v_refund.status, 'requiresManualReview', v_refund.requires_manual_review);
  end if;
  select coalesce(sum(amount_kobo) filter (where status in ('requested','pending','successful')),0) into v_total from public.refunds where verified_transaction_id = v_tx.id;
  if v_total + p_amount_kobo > v_tx.amount_kobo then raise exception using errcode='P0001', message='refund_exceeds_payment'; end if;
  insert into public.refunds(verified_transaction_id, provider_reference, amount_kobo, currency, reason, requested_by, idempotency_key, request_fingerprint, status)
    values (v_tx.id, 'local-'||gen_random_uuid()::text, p_amount_kobo, 'NGN', trim(p_reason), p_actor_id, p_idempotency_key, v_fingerprint, 'requested') returning * into v_refund;
  insert into public.audit_events(actor_id, action, entity_type, entity_id, metadata) values (p_actor_id, 'refund_requested', 'refund', v_refund.id, jsonb_build_object('orderId', p_order_id, 'amountKobo', p_amount_kobo, 'reason', p_reason));
  return jsonb_build_object('refundId', v_refund.id, 'transactionId', v_tx.id, 'transactionReference', v_tx.provider_reference, 'status', v_refund.status, 'amountKobo', v_refund.amount_kobo, 'requiresManualReview', false);
end; $$;

create or replace function public.mark_refund_provider_unknown(p_refund_id uuid, p_provider_status text, p_failure_reason text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.refunds;
begin
  select * into r from public.refunds where id = p_refund_id for update;
  if r.id is null then raise exception using errcode='P0001', message='refund_not_found'; end if;
  update public.refunds set status='pending', provider_status=left(p_provider_status,200), failure_reason=left(p_failure_reason,2000), provider_attempted_at=coalesce(provider_attempted_at,now()), next_reconciliation_at=now()+interval '5 minutes', updated_at=now() where id=r.id and status in ('requested','pending') returning * into r;
  return jsonb_build_object('refundId',r.id,'status',r.status,'requiresManualReview',r.requires_manual_review);
end; $$;

revoke all on function public.request_order_refund(uuid,integer,text,text,uuid), public.mark_refund_provider_unknown(uuid,text,text) from public, anon, authenticated;
grant execute on function public.request_order_refund(uuid,integer,text,text,uuid), public.mark_refund_provider_unknown(uuid,text,text) to service_role;
