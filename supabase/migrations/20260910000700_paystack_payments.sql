alter table public.payment_attempts add column if not exists provider_transaction_id bigint;
alter table public.payment_attempts add column if not exists failure_code text;
alter table public.payment_attempts add column if not exists last_verified_at timestamptz;
create unique index if not exists payment_one_active_attempt_idx on public.payment_attempts(order_id) where status in ('created', 'redirected');
create table if not exists public.payment_exceptions (
  id uuid primary key default gen_random_uuid(), provider text not null, provider_reference text not null, order_id uuid references public.orders(id) on delete set null, reason text not null, payload jsonb not null default '{}', resolved_at timestamptz, created_at timestamptz not null default now(), unique (provider, provider_reference, reason)
);
alter table public.payment_exceptions enable row level security;
revoke all on public.payment_exceptions from anon, authenticated;

create or replace function public.apply_paystack_payment(p_reference text, p_status text, p_amount_kobo integer, p_currency text, p_payload jsonb, p_event_id text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare a public.payment_attempts; o public.orders; vtx uuid;
begin
  select * into a from public.payment_attempts where provider = 'paystack' and provider_reference = p_reference for update;
  if a.id is null then return jsonb_build_object('accepted', false, 'reason', 'unknown_reference'); end if;
  select * into o from public.orders where id = a.order_id for update;
  if p_amount_kobo <> a.amount_kobo or p_currency <> a.currency then
    insert into public.payment_exceptions(provider, provider_reference, order_id, reason, payload) values ('paystack', p_reference, a.order_id, 'amount_or_currency_mismatch', p_payload) on conflict do nothing;
    update public.payment_attempts set failure_code = 'amount_or_currency_mismatch', updated_at = now() where id = a.id;
    return jsonb_build_object('accepted', false, 'reason', 'amount_or_currency_mismatch');
  end if;
  if p_status = 'success' then
    if o.payment_status = 'paid' then return jsonb_build_object('accepted', true, 'duplicate', true); end if;
    if o.status = 'cancelled' or o.delivery_date is not null and o.delivery_date < current_date then
      insert into public.payment_exceptions(provider, provider_reference, order_id, reason, payload) values ('paystack', p_reference, o.id, 'late_payment_after_order_expiry', p_payload) on conflict do nothing;
      update public.payment_attempts set status = 'successful', updated_at = now() where id = a.id;
      return jsonb_build_object('accepted', false, 'exception', 'late_payment_after_order_expiry');
    end if;
    insert into public.verified_transactions(payment_attempt_id, provider, provider_reference, amount_kobo, currency, verified_at, raw_payload) values (a.id, 'paystack', p_reference, p_amount_kobo, p_currency, now(), p_payload) on conflict (provider_reference) do nothing returning id into vtx;
    update public.payment_attempts set status = 'successful', last_verified_at = now(), updated_at = now() where id = a.id;
    update public.orders set payment_status = 'paid', updated_at = now() where id = o.id and payment_status <> 'paid';
  elsif p_status in ('pending', 'ongoing', 'processing', 'queued') then
    update public.payment_attempts set status = 'redirected', updated_at = now() where id = a.id and status <> 'successful';
  elsif p_status in ('abandoned', 'failed', 'reversed') then
    update public.payment_attempts set status = case when p_status = 'abandoned' then 'abandoned'::payment_attempt_status else 'failed'::payment_attempt_status end, updated_at = now() where id = a.id and status <> 'successful';
  else return jsonb_build_object('accepted', false, 'reason', 'unknown_provider_status'); end if;
  return jsonb_build_object('accepted', true, 'duplicate', false);
end; $$;
revoke all on function public.apply_paystack_payment(text, text, integer, text, jsonb, text) from public, anon, authenticated;
