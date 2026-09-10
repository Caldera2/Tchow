create extension if not exists pgcrypto;

create type public.app_role as enum ('customer', 'admin');
create type public.order_status as enum ('draft', 'received_for_review', 'confirmed', 'preparing', 'ready_for_dispatch', 'completed', 'cancelled');
create type public.payment_status as enum ('pending', 'paid', 'failed', 'refunded');
create type public.catering_status as enum ('new', 'reviewing', 'contacted', 'quoted', 'confirmed', 'closed');
create type public.partnership_status as enum ('new', 'under_review', 'contacted', 'meeting_scheduled', 'documentation_pending', 'closed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  default_address text,
  preferred_communication text,
  dietary_notes text,
  role public.app_role not null default 'customer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id text primary key,
  name text not null,
  category text not null,
  description text not null default '',
  price_kobo integer not null check (price_kobo >= 0),
  image_path text,
  preparation_minutes integer not null default 0 check (preparation_minutes >= 0),
  tags text[] not null default '{}',
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  user_id uuid references auth.users(id) on delete set null,
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  delivery_address text not null,
  delivery_area text not null,
  delivery_city text not null,
  delivery_state text not null,
  delivery_instructions text,
  currency text not null default 'NGN' check (currency = 'NGN'),
  subtotal_kobo integer not null check (subtotal_kobo >= 0),
  delivery_fee_kobo integer not null default 0 check (delivery_fee_kobo >= 0),
  total_kobo integer not null check (total_kobo = subtotal_kobo + delivery_fee_kobo),
  status public.order_status not null default 'received_for_review',
  payment_status public.payment_status not null default 'pending',
  idempotency_key text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id text references public.products(id) on delete set null,
  product_name text not null,
  unit_price_kobo integer not null check (unit_price_kobo >= 0),
  quantity integer not null check (quantity > 0),
  line_total_kobo integer not null check (line_total_kobo = unit_price_kobo * quantity),
  notes text
);

create table public.catering_enquiries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  full_name text not null,
  organization text,
  email text not null,
  phone text not null,
  event_type text not null,
  event_date date not null,
  guest_count integer not null check (guest_count > 0),
  budget_range text,
  location text not null,
  additional_requirements text,
  status public.catering_status not null default 'new',
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.partnership_applications (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text not null,
  organization text,
  country text not null,
  pathway text not null,
  contribution_range text,
  strategic_resources text,
  timeline text,
  additional_notes text,
  consent_at timestamptz not null,
  status public.partnership_status not null default 'new',
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index orders_user_id_created_at_idx on public.orders(user_id, created_at desc);
create index order_items_order_id_idx on public.order_items(order_id);
create index catering_enquiries_status_created_at_idx on public.catering_enquiries(status, created_at desc);
create index partnership_applications_status_created_at_idx on public.partnership_applications(status, created_at desc);

create or replace function public.is_admin()
returns boolean language sql stable security invoker set search_path = public
as $$ select exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'); $$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$ begin insert into public.profiles (id, full_name) values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', '')); return new; end; $$;

revoke execute on function public.handle_new_user() from public;

create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.catering_enquiries enable row level security;
alter table public.partnership_applications enable row level security;

revoke all on public.profiles, public.products, public.orders, public.order_items, public.catering_enquiries, public.partnership_applications from anon;
revoke all on public.profiles, public.products, public.orders, public.order_items, public.catering_enquiries, public.partnership_applications from authenticated;
grant select on public.products to anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select on public.orders, public.order_items to authenticated;
grant insert on public.catering_enquiries, public.partnership_applications to anon, authenticated;
grant select, update on public.orders, public.order_items, public.catering_enquiries, public.partnership_applications to authenticated;

create policy "Available products are public" on public.products for select to anon, authenticated using (is_available = true or (select public.is_admin()));
create policy "Users view own profile" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "Users update own profile" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "Users view own orders" on public.orders for select to authenticated using ((select auth.uid()) = user_id or (select public.is_admin()));
create policy "Users view own order items" on public.order_items for select to authenticated using (exists (select 1 from public.orders where orders.id = order_items.order_id and (orders.user_id = (select auth.uid()) or (select public.is_admin()))));
create policy "Admins manage orders" on public.orders for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins manage order items" on public.order_items for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Anyone may submit catering enquiry" on public.catering_enquiries for insert to anon, authenticated with check (guest_count > 0);
create policy "Admins read catering enquiries" on public.catering_enquiries for select to authenticated using ((select public.is_admin()));
create policy "Admins update catering enquiries" on public.catering_enquiries for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Anyone may submit partnership application" on public.partnership_applications for insert to anon, authenticated with check (consent_at is not null);
create policy "Admins read partnership applications" on public.partnership_applications for select to authenticated using ((select public.is_admin()));
create policy "Admins update partnership applications" on public.partnership_applications for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
