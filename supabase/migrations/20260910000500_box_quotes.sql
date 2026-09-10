alter table public.box_sizes add column if not exists snack_allowance integer not null default 0 check (snack_allowance >= 0);
alter table public.box_sizes add column if not exists drink_allowance integer not null default 0 check (drink_allowance >= 0);
alter table public.box_sizes add column if not exists dessert_allowance integer not null default 0 check (dessert_allowance >= 0);
alter table public.box_sizes add column if not exists configuration_version integer not null default 1 check (configuration_version > 0);

create table public.box_quotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  box_size_id uuid not null references public.box_sizes(id) on delete restrict,
  configuration_version integer not null check (configuration_version > 0),
  components_snapshot jsonb not null,
  base_price_kobo integer not null check (base_price_kobo >= 0),
  surcharge_kobo integer not null default 0 check (surcharge_kobo >= 0),
  total_kobo integer not null check (total_kobo = base_price_kobo + surcharge_kobo),
  currency char(3) not null default 'NGN' check (currency = 'NGN'),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.order_items add column if not exists box_quote_id uuid references public.box_quotes(id) on delete set null;
create index box_quotes_user_expiry_idx on public.box_quotes(user_id, expires_at desc);
create index order_items_box_quote_idx on public.order_items(box_quote_id);

alter table public.box_quotes enable row level security;
revoke all on public.box_quotes from anon, authenticated;
grant select on public.box_quotes to authenticated;
create policy "Customers read own box quotes" on public.box_quotes for select to authenticated using ((select auth.uid()) = user_id);

-- Quote creation, consumption, and saved configurations are performed by server functions.
