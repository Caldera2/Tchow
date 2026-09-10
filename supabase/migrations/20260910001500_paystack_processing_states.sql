alter table public.webhook_receipts add column if not exists processing_status text not null default 'received' check (processing_status in ('received','processing','processed','failed'));
alter table public.webhook_receipts add column if not exists processing_attempts integer not null default 0 check (processing_attempts >= 0);
alter table public.webhook_receipts add column if not exists processing_error text;
alter table public.webhook_receipts add column if not exists processing_started_at timestamptz;
create index if not exists webhook_receipt_retry_idx on public.webhook_receipts(provider, processing_status, created_at);

create or replace function public.claim_paystack_webhook(p_provider text, p_event_id text)
returns jsonb language sql security definer set search_path = public as $$
  update public.webhook_receipts
  set processing_status = 'processing', processing_attempts = processing_attempts + 1,
      processing_started_at = now(), processing_error = null
  where provider = p_provider and event_id = p_event_id and processing_status in ('received','failed')
  returning jsonb_build_object('id', id);
$$;
revoke all on function public.claim_paystack_webhook(text,text) from public, anon, authenticated;
grant execute on function public.claim_paystack_webhook(text,text) to service_role;

create or replace function public.apply_paystack_payment(
  p_reference text, p_status text, p_amount_kobo integer, p_currency text,
  p_payload jsonb, p_event_id text default null, p_provider_transaction_id bigint default null
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare a public.payment_attempts; o public.orders; vtx public.verified_transactions; vstatus text;
begin
  select * into a from public.payment_attempts where provider = 'paystack' and provider_reference = p_reference for update;
  if a.id is null then
    insert into public.payment_exceptions(provider, provider_reference, reason, payload) values ('paystack', p_reference, 'unknown_reference', p_payload) on conflict do nothing;
    return jsonb_build_object('accepted', false, 'outcome', 'exception', 'reason', 'unknown_reference');
  end if;
  select * into o from public.orders where id = a.order_id for update;
  if p_amount_kobo <> a.amount_kobo or upper(p_currency) <> upper(a.currency) then
    insert into public.payment_exceptions(provider, provider_reference, order_id, reason, payload) values ('paystack', p_reference, a.order_id, 'amount_or_currency_mismatch', p_payload) on conflict do nothing;
    update public.payment_attempts set failure_code = 'amount_or_currency_mismatch', updated_at = now() where id = a.id;
    return jsonb_build_object('accepted', false, 'outcome', 'exception', 'reason', 'amount_or_currency_mismatch');
  end if;
  if p_status = 'success' then
    select * into vtx from public.verified_transactions where provider_reference = p_reference;
    if vtx.id is not null then return jsonb_build_object('accepted', true, 'outcome', 'duplicate', 'duplicate', true, 'orderId', o.id, 'paymentStatus', o.payment_status); end if;
    if o.payment_status = 'paid' then
      insert into public.payment_exceptions(provider, provider_reference, order_id, reason, payload) values ('paystack', p_reference, o.id, 'second_successful_payment', p_payload) on conflict do nothing;
      update public.payment_attempts set status = 'successful', provider_transaction_id = p_provider_transaction_id, last_verified_at = now(), failure_code = 'second_successful_payment', updated_at = now() where id = a.id;
      return jsonb_build_object('accepted', false, 'outcome', 'exception', 'reason', 'second_successful_payment', 'orderId', o.id, 'paymentStatus', o.payment_status);
    end if;
    if o.status = 'cancelled' or (o.delivery_date is not null and o.delivery_date < (now() at time zone 'Africa/Lagos')::date) then
      insert into public.payment_exceptions(provider, provider_reference, order_id, reason, payload) values ('paystack', p_reference, o.id, 'late_payment_after_order_expiry', p_payload) on conflict do nothing;
      update public.payment_attempts set status = 'successful', provider_transaction_id = p_provider_transaction_id, last_verified_at = now(), failure_code = 'late_payment_after_order_expiry', updated_at = now() where id = a.id;
      return jsonb_build_object('accepted', false, 'outcome', 'exception', 'reason', 'late_payment_after_order_expiry', 'orderId', o.id, 'paymentStatus', o.payment_status);
    end if;
    insert into public.verified_transactions(payment_attempt_id, provider, provider_reference, amount_kobo, currency, verified_at, raw_payload) values (a.id, 'paystack', p_reference, p_amount_kobo, upper(p_currency), now(), p_payload);
    update public.payment_attempts set status = 'successful', provider_transaction_id = p_provider_transaction_id, last_verified_at = now(), updated_at = now() where id = a.id;
    update public.orders set payment_status = 'paid', updated_at = now() where id = o.id and payment_status <> 'paid';
    return jsonb_build_object('accepted', true, 'outcome', 'paid', 'duplicate', false, 'orderId', o.id, 'paymentStatus', 'paid');
  elsif p_status in ('pending', 'ongoing', 'processing', 'queued') then
    update public.payment_attempts set status = 'redirected', updated_at = now() where id = a.id and status not in ('successful');
    return jsonb_build_object('accepted', true, 'outcome', 'pending', 'orderId', o.id, 'paymentStatus', o.payment_status);
  elsif p_status in ('abandoned', 'failed', 'reversed') then
    vstatus := case when p_status = 'abandoned' then 'abandoned' else 'failed' end;
    update public.payment_attempts set status = vstatus::payment_attempt_status, failure_code = p_status, updated_at = now() where id = a.id and status <> 'successful';
    return jsonb_build_object('accepted', true, 'outcome', case when p_status = 'abandoned' then 'abandoned' else 'failed' end, 'orderId', o.id, 'paymentStatus', o.payment_status);
  end if;
  insert into public.payment_exceptions(provider, provider_reference, order_id, reason, payload) values ('paystack', p_reference, o.id, 'unknown_provider_status', p_payload) on conflict do nothing;
  return jsonb_build_object('accepted', false, 'outcome', 'exception', 'reason', 'unknown_provider_status', 'orderId', o.id);
end; $$;
revoke all on function public.apply_paystack_payment(text,text,integer,text,jsonb,text,bigint) from public, anon, authenticated;
grant execute on function public.apply_paystack_payment(text,text,integer,text,jsonb,text,bigint) to service_role;

create or replace function public.apply_paystack_payment(p_reference text, p_status text, p_amount_kobo integer, p_currency text, p_payload jsonb, p_event_id text default null)
returns jsonb language sql security definer set search_path = public as $$
  select public.apply_paystack_payment(p_reference, p_status, p_amount_kobo, p_currency, p_payload, p_event_id, null::bigint);
$$;
revoke all on function public.apply_paystack_payment(text,text,integer,text,jsonb,text) from public, anon, authenticated;
grant execute on function public.apply_paystack_payment(text,text,integer,text,jsonb,text) to service_role;
