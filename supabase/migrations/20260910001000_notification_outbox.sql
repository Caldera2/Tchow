alter table public.notification_outbox add column if not exists claimed_at timestamptz;
alter table public.notification_outbox add column if not exists provider_message_id text;
alter table public.notification_outbox add column if not exists provider_status text check (provider_status is null or provider_status in ('queued','accepted','delivered','bounced','failed','unconfigured'));
alter table public.notification_outbox add column if not exists max_attempts integer not null default 8 check (max_attempts > 0);
alter table public.notification_outbox add column if not exists failed_at timestamptz;
create index if not exists notification_ready_idx on public.notification_outbox(status, available_at, created_at) where status in ('pending','processing');
create table if not exists public.notification_templates (
  key text primary key, subject text not null, body text not null, version integer not null default 1 check (version > 0), is_active boolean not null default true, updated_at timestamptz not null default now()
);
alter table public.notification_templates enable row level security;
revoke all on public.notification_templates from anon, authenticated;
create table if not exists public.notification_provider_receipts (
  id uuid primary key default gen_random_uuid(), provider text not null, provider_message_id text not null, status text not null, payload jsonb not null default '{}', created_at timestamptz not null default now(), unique(provider, provider_message_id)
);
alter table public.notification_provider_receipts enable row level security;
revoke all on public.notification_provider_receipts from anon, authenticated;

create or replace function public.claim_notification_jobs(p_limit integer default 20)
returns setof public.notification_outbox language plpgsql security definer set search_path=public as $$
begin
  return query with picked as (select id from public.notification_outbox where ((status='pending' and available_at <= now()) or (status='processing' and claimed_at < now()-interval '10 minutes')) order by created_at for update skip locked limit least(greatest(p_limit,1),100)) update public.notification_outbox n set status='processing', claimed_at=now(), attempts=attempts+1 where n.id in (select id from picked) returning n.*;
end; $$;
revoke all on function public.claim_notification_jobs(integer) from public, anon, authenticated;
insert into public.notification_templates(key,subject,body) values
 ('order_received','Tchow order received','Your Tchow order has been recorded for review.'),
 ('payment_verified','Tchow payment verified','Your payment has been verified against your order.'),
 ('order_status_changed','Tchow order update','Your order status has changed.'),
 ('cancellation_refund_update','Tchow cancellation and refund update','There is an update about your cancellation or refund.'),
 ('catering_receipt','Tchow catering enquiry received','Your catering enquiry has been recorded.'),
 ('contact_receipt','Tchow enquiry received','Your contact enquiry has been recorded.'),
 ('partnership_receipt','Tchow partnership interest received','Your partnership interest has been recorded for preliminary review.'),
 ('staff_alert','Tchow operations alert','A Tchow operational event requires review.')
on conflict (key) do nothing;
