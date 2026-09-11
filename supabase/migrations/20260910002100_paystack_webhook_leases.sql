alter table public.webhook_receipts add column if not exists processing_lease_expires_at timestamptz;
alter table public.webhook_receipts add column if not exists next_attempt_at timestamptz;
alter table public.webhook_receipts add column if not exists max_processing_attempts integer not null default 8 check (max_processing_attempts between 1 and 20);
create index if not exists webhook_receipt_claim_idx on public.webhook_receipts(provider, processing_status, next_attempt_at, processing_lease_expires_at);

create or replace function public.claim_paystack_webhook(p_provider text, p_event_id text)
returns jsonb language sql security definer set search_path = public as $$
  update public.webhook_receipts
  set processing_status = 'processing',
      processing_attempts = processing_attempts + 1,
      processing_started_at = now(),
      processing_lease_expires_at = now() + interval '5 minutes',
      next_attempt_at = null,
      processing_error = null
  where provider = p_provider and event_id = p_event_id
    and processing_attempts < max_processing_attempts
    and (next_attempt_at is null or next_attempt_at <= now())
    and (
      processing_status in ('received','failed')
      or (processing_status = 'processing' and coalesce(processing_lease_expires_at, processing_started_at + interval '5 minutes') <= now())
    )
  returning jsonb_build_object('id', id, 'attempts', processing_attempts, 'maxAttempts', max_processing_attempts);
$$;

create or replace function public.fail_paystack_webhook(p_receipt_id uuid, p_error text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.webhook_receipts; v_delay integer;
begin
  select * into r from public.webhook_receipts where id = p_receipt_id for update;
  if r.id is null then raise exception using errcode = 'P0001', message = 'webhook_receipt_not_found'; end if;
  v_delay := least(3600, greatest(30, 2 ^ least(r.processing_attempts, 7) * 30));
  update public.webhook_receipts
  set processing_status = 'failed', processing_error = left(coalesce(p_error, 'webhook processing failed'), 2000),
      next_attempt_at = case when r.processing_attempts < r.max_processing_attempts then now() + make_interval(secs => v_delay) else null end,
      processing_lease_expires_at = null
  where id = r.id;
  return jsonb_build_object('retryable', r.processing_attempts < r.max_processing_attempts, 'attempts', r.processing_attempts, 'nextAttemptAt', case when r.processing_attempts < r.max_processing_attempts then now() + make_interval(secs => v_delay) else null end);
end; $$;

revoke all on function public.claim_paystack_webhook(text,text), public.fail_paystack_webhook(uuid,text) from public, anon, authenticated;
grant execute on function public.claim_paystack_webhook(text,text), public.fail_paystack_webhook(uuid,text) to service_role;
