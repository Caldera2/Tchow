alter table public.notification_provider_receipts add column if not exists provider_event_id text;
update public.notification_provider_receipts set provider_event_id = provider || ':' || provider_message_id || ':' || id::text where provider_event_id is null;
alter table public.notification_provider_receipts alter column provider_event_id set not null;
alter table public.notification_provider_receipts drop constraint if exists notification_provider_receipts_provider_message_id_key;
alter table public.notification_provider_receipts add constraint notification_provider_receipts_event_key unique (provider, provider_event_id);
create index if not exists notification_provider_receipts_message_idx on public.notification_provider_receipts(provider, provider_message_id);

create table if not exists public.notification_internal_events (
  id uuid primary key default gen_random_uuid(),
  outbox_id uuid not null references public.notification_outbox(id) on delete restrict,
  audience text not null,
  event_type text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  unique(outbox_id)
);
alter table public.notification_internal_events enable row level security;
revoke all on public.notification_internal_events from anon, authenticated;
revoke all on public.notification_provider_receipts from anon, authenticated;

create or replace function public.claim_notification_jobs(p_limit integer default 20)
returns setof public.notification_outbox language plpgsql security definer set search_path=public as $$
begin
  return query with picked as (
    select id from public.notification_outbox
    where (status='pending' and available_at <= now())
       or (status='processing' and (claimed_at is null or claimed_at < now()-interval '10 minutes'))
    order by created_at for update skip locked limit least(greatest(p_limit,1),100)
  )
  update public.notification_outbox n set status='processing', claimed_at=now(), attempts=attempts+1
  where n.id in (select id from picked) returning n.*;
end; $$;
revoke all on function public.claim_notification_jobs(integer) from public, anon, authenticated;
grant execute on function public.claim_notification_jobs(integer) to service_role;
