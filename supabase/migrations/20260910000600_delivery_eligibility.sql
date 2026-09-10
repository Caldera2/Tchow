create table if not exists public.delivery_countries (
  id uuid primary key default gen_random_uuid(), code text not null unique, name text not null unique, is_active boolean not null default false
);
create table if not exists public.delivery_states (
  id uuid primary key default gen_random_uuid(), country_id uuid not null references public.delivery_countries(id) on delete restrict, code text not null, name text not null, is_active boolean not null default false, unique (country_id, code)
);
create table if not exists public.delivery_cities (
  id uuid primary key default gen_random_uuid(), state_id uuid not null references public.delivery_states(id) on delete restrict, name text not null, is_active boolean not null default false, unique (state_id, name)
);
create table if not exists public.delivery_service_areas (
  id uuid primary key default gen_random_uuid(), city_id uuid not null references public.delivery_cities(id) on delete restrict, name text not null, slug text not null unique, is_active boolean not null default false, unique (city_id, name)
);
alter table public.delivery_zones add column if not exists service_area_id uuid references public.delivery_service_areas(id) on delete restrict;
alter table public.delivery_zones add column if not exists lead_time_minutes integer not null default 0 check (lead_time_minutes >= 0);
alter table public.delivery_zones add column if not exists order_cutoff_minutes integer not null default 0 check (order_cutoff_minutes >= 0);
alter table public.delivery_zones add column if not exists timezone text not null default 'Africa/Lagos';
create table if not exists public.delivery_time_slots (
  id uuid primary key default gen_random_uuid(), zone_id uuid not null references public.delivery_zones(id) on delete cascade, name text not null, starts_at time not null, ends_at time not null, capacity integer check (capacity is null or capacity > 0), is_active boolean not null default false, unique (zone_id, name), check (ends_at > starts_at)
);
create table if not exists public.product_delivery_schedules (
  id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id) on delete cascade, weekday smallint check (weekday between 0 and 6), starts_on date, ends_on date, is_active boolean not null default false, check (weekday is not null or (starts_on is not null and ends_on is not null and ends_on >= starts_on)), unique (product_id, weekday, starts_on)
);
create table if not exists public.delivery_slot_reservations (
  id uuid primary key default gen_random_uuid(), slot_id uuid not null references public.delivery_time_slots(id) on delete restrict, service_area_id uuid not null references public.delivery_service_areas(id) on delete restrict, delivery_date date not null, user_id uuid references public.profiles(id) on delete set null, order_id uuid references public.orders(id) on delete set null, status text not null default 'reserved' check (status in ('reserved','consumed','expired','cancelled')), expires_at timestamptz not null, created_at timestamptz not null default now()
);
create index if not exists delivery_area_active_idx on public.delivery_service_areas(is_active, city_id);
create index if not exists delivery_slot_lookup_idx on public.delivery_time_slots(zone_id, is_active);
create index if not exists delivery_reservation_expiry_idx on public.delivery_slot_reservations(slot_id, delivery_date, status, expires_at);
alter table public.orders add column if not exists delivery_service_area_id uuid references public.delivery_service_areas(id) on delete set null;
alter table public.orders add column if not exists delivery_slot_id uuid references public.delivery_time_slots(id) on delete set null;
alter table public.orders add column if not exists delivery_date date;
alter table public.orders add column if not exists delivery_reservation_id uuid references public.delivery_slot_reservations(id) on delete set null;
alter table public.orders add column if not exists delivery_fee_kobo integer not null default 0;

alter table public.delivery_countries enable row level security;
alter table public.delivery_states enable row level security;
alter table public.delivery_cities enable row level security;
alter table public.delivery_service_areas enable row level security;
alter table public.delivery_time_slots enable row level security;
alter table public.product_delivery_schedules enable row level security;
alter table public.delivery_slot_reservations enable row level security;
revoke all on public.delivery_countries, public.delivery_states, public.delivery_cities, public.delivery_service_areas, public.delivery_time_slots, public.product_delivery_schedules, public.delivery_slot_reservations from anon, authenticated;
grant select on public.delivery_countries, public.delivery_states, public.delivery_cities, public.delivery_service_areas, public.delivery_time_slots, public.product_delivery_schedules to anon, authenticated;
create policy "Public reads active countries" on public.delivery_countries for select using (is_active);
create policy "Public reads active states" on public.delivery_states for select using (is_active);
create policy "Public reads active cities" on public.delivery_cities for select using (is_active);
create policy "Public reads active service areas" on public.delivery_service_areas for select using (is_active);
create policy "Public reads active slots" on public.delivery_time_slots for select using (is_active);
create policy "Public reads active product schedules" on public.product_delivery_schedules for select using (is_active);
-- Slot reservations are created and consumed only by server-side operations.
create or replace function public.reserve_delivery_slot(p_slot_id uuid, p_service_area_id uuid, p_delivery_date date, p_user_id uuid, p_expires_at timestamptz)
returns public.delivery_slot_reservations
language plpgsql
security definer
set search_path = public
as $$
declare v_slot public.delivery_time_slots; v_count integer; v_reservation public.delivery_slot_reservations;
begin
  select * into v_slot from public.delivery_time_slots where id = p_slot_id and is_active for update;
  if v_slot.id is null then raise exception using errcode = 'P0001', message = 'slot_unavailable'; end if;
  select count(*) into v_count from public.delivery_slot_reservations where slot_id = p_slot_id and delivery_date = p_delivery_date and status = 'reserved' and expires_at > now();
  if v_slot.capacity is not null and v_count >= v_slot.capacity then raise exception using errcode = 'P0001', message = 'slot_capacity_reached'; end if;
  insert into public.delivery_slot_reservations(slot_id, service_area_id, delivery_date, user_id, expires_at) values (p_slot_id, p_service_area_id, p_delivery_date, p_user_id, p_expires_at) returning * into v_reservation;
  return v_reservation;
end;
$$;
revoke all on function public.reserve_delivery_slot(uuid, uuid, date, uuid, timestamptz) from public, anon, authenticated;
