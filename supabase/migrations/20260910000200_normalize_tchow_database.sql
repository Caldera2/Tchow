create extension if not exists pgcrypto;

-- Clean installs begin with this normalized schema. Existing schemas must use
-- a reviewed forward upgrade; no customer, order, payment, or enquiry records
-- are dropped here.

create type public.staff_role as enum ('owner', 'manager', 'operator', 'fulfilment', 'finance', 'support');
create type public.product_status as enum ('draft', 'published', 'archived');
create type public.order_status as enum ('draft', 'received_for_review', 'confirmed', 'preparing', 'ready_for_dispatch', 'dispatched', 'completed', 'cancelled');
create type public.payment_status as enum ('pending', 'processing', 'paid', 'failed', 'refunded', 'partially_refunded');
create type public.payment_attempt_status as enum ('created', 'redirected', 'abandoned', 'successful', 'failed');
create type public.catering_status as enum ('new', 'reviewing', 'contacted', 'quoted', 'confirmed', 'closed');
create type public.partnership_status as enum ('new', 'under_review', 'contacted', 'meeting_scheduled', 'documentation_pending', 'closed');
create type public.notification_status as enum ('pending', 'processing', 'sent', 'failed', 'cancelled');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text,
  phone text,
  preferred_communication text,
  dietary_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  label text not null default 'Default',
  recipient_name text not null,
  phone text not null,
  address_line text not null,
  area text not null,
  city text not null,
  state text not null,
  delivery_instructions text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.staff_members (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  role public.staff_role not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.staff_permissions (
  id uuid primary key default gen_random_uuid(),
  staff_user_id uuid not null references public.staff_members(user_id) on delete cascade,
  permission text not null check (permission in ('manage_menu', 'manage_orders', 'manage_delivery', 'manage_catering', 'manage_partnerships', 'manage_settings', 'manage_payments', 'view_audit')),
  created_at timestamptz not null default now(),
  unique (staff_user_id, permission)
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  legacy_key text unique,
  name text not null unique,
  slug text not null unique,
  description text,
  sort_order integer not null default 0 check (sort_order >= 0),
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  legacy_key text not null unique,
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  description text not null default '',
  status public.product_status not null default 'draft',
  price_kobo integer not null check (price_kobo >= 0),
  currency char(3) not null default 'NGN' check (currency = 'NGN'),
  preparation_minutes integer not null default 0 check (preparation_minutes >= 0),
  tags text[] not null default '{}',
  ingredients text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null,
  alt_text text not null,
  sort_order integer not null default 0 check (sort_order >= 0),
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  unique (product_id, storage_path)
);

create table public.box_sizes (
  id uuid primary key default gen_random_uuid(),
  legacy_key text not null unique,
  name text not null unique,
  description text not null default '',
  serving_note text,
  base_price_kobo integer not null check (base_price_kobo >= 0),
  currency char(3) not null default 'NGN' check (currency = 'NGN'),
  status public.product_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.box_components (
  id uuid primary key default gen_random_uuid(),
  box_size_id uuid not null references public.box_sizes(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  component_type text not null check (component_type in ('snack', 'drink', 'dessert')),
  min_quantity integer not null default 0 check (min_quantity >= 0),
  max_quantity integer not null default 1 check (max_quantity > 0 and max_quantity >= min_quantity),
  required boolean not null default false,
  created_at timestamptz not null default now(),
  unique (box_size_id, product_id, component_type)
);

create table public.box_pricing_rules (
  id uuid primary key default gen_random_uuid(),
  box_size_id uuid not null references public.box_sizes(id) on delete cascade,
  component_type text not null check (component_type in ('snack', 'drink', 'dessert')),
  included_quantity integer not null default 0 check (included_quantity >= 0),
  extra_unit_price_kobo integer not null default 0 check (extra_unit_price_kobo >= 0),
  currency char(3) not null default 'NGN' check (currency = 'NGN'),
  unique (box_size_id, component_type)
);

create table public.saved_box_configurations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  box_size_id uuid not null references public.box_sizes(id) on delete restrict,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.saved_box_items (
  id uuid primary key default gen_random_uuid(),
  configuration_id uuid not null references public.saved_box_configurations(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name_snapshot text not null,
  component_type text not null check (component_type in ('snack', 'drink', 'dessert')),
  quantity integer not null check (quantity > 0),
  unique (configuration_id, product_id, component_type)
);

create table public.delivery_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  areas text[] not null default '{}',
  fee_kobo integer not null check (fee_kobo >= 0),
  currency char(3) not null default 'NGN' check (currency = 'NGN'),
  estimated_minutes integer not null check (estimated_minutes > 0),
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.delivery_schedules (
  id uuid primary key default gen_random_uuid(),
  zone_id uuid not null references public.delivery_zones(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  opens_at time not null,
  closes_at time not null,
  check (closes_at > opens_at),
  unique (zone_id, weekday)
);

create table public.delivery_closures (
  id uuid primary key default gen_random_uuid(),
  zone_id uuid references public.delivery_zones(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text not null,
  check (ends_at > starts_at)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  user_id uuid references public.profiles(id) on delete set null,
  idempotency_key text not null unique,
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  delivery_zone_id uuid references public.delivery_zones(id) on delete set null,
  delivery_address_snapshot jsonb not null,
  currency char(3) not null default 'NGN' check (currency = 'NGN'),
  subtotal_kobo integer not null check (subtotal_kobo >= 0),
  delivery_fee_kobo integer not null check (delivery_fee_kobo >= 0),
  discount_kobo integer not null default 0 check (discount_kobo >= 0),
  total_kobo integer not null check (total_kobo = subtotal_kobo + delivery_fee_kobo - discount_kobo and total_kobo >= 0),
  status public.order_status not null default 'received_for_review',
  payment_status public.payment_status not null default 'pending',
  delivery_instructions text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name_snapshot text not null,
  unit_price_kobo integer not null check (unit_price_kobo >= 0),
  quantity integer not null check (quantity > 0 and quantity <= 50),
  line_total_kobo integer not null check (line_total_kobo = unit_price_kobo * quantity),
  components_snapshot jsonb,
  notes text
);

create table public.checkout_snapshots (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  payload jsonb not null,
  captured_at timestamptz not null default now()
);

create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  from_status public.order_status,
  to_status public.order_status not null,
  changed_by uuid references public.profiles(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

create table public.payment_attempts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  provider text not null check (provider in ('paystack', 'bank_transfer')),
  provider_reference text unique,
  amount_kobo integer not null check (amount_kobo > 0),
  currency char(3) not null default 'NGN' check (currency = 'NGN'),
  status public.payment_attempt_status not null default 'created',
  checkout_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.verified_transactions (
  id uuid primary key default gen_random_uuid(),
  payment_attempt_id uuid not null unique references public.payment_attempts(id) on delete restrict,
  provider text not null,
  provider_reference text not null unique,
  amount_kobo integer not null check (amount_kobo > 0),
  currency char(3) not null check (currency = 'NGN'),
  verified_at timestamptz not null,
  raw_payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  verified_transaction_id uuid not null references public.verified_transactions(id) on delete restrict,
  provider_reference text not null unique,
  amount_kobo integer not null check (amount_kobo > 0),
  currency char(3) not null default 'NGN' check (currency = 'NGN'),
  reason text,
  created_at timestamptz not null default now()
);

create table public.contact_enquiries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  full_name text not null,
  email text not null,
  phone text,
  subject text not null,
  message text not null,
  status text not null default 'new' check (status in ('new', 'reviewing', 'resolved', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.catering_enquiries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.staff_notes (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.staff_members(user_id) on delete restrict,
  entity_type text not null check (entity_type in ('order', 'contact_enquiry', 'catering_enquiry', 'partnership_application', 'customer')),
  entity_id uuid not null,
  body text not null,
  created_at timestamptz not null default now()
);

create table public.public_business_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table public.operational_settings (
  key text primary key,
  value jsonb not null,
  updated_by uuid references public.staff_members(user_id) on delete set null,
  updated_at timestamptz not null default now()
);

create table public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  channel text not null check (channel in ('email', 'whatsapp', 'internal')),
  event_type text not null,
  recipient text not null,
  payload jsonb not null,
  idempotency_key text not null unique,
  status public.notification_status not null default 'pending',
  attempts integer not null default 0 check (attempts >= 0),
  available_at timestamptz not null default now(),
  sent_at timestamptz,
  last_error text,
  created_at timestamptz not null default now()
);

create table public.webhook_receipts (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text not null,
  event_type text not null,
  payload jsonb not null,
  signature_valid boolean not null,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (provider, event_id)
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index customer_addresses_user_idx on public.customer_addresses(user_id, is_default desc, created_at desc);
create index staff_permissions_user_idx on public.staff_permissions(staff_user_id);
create index products_category_status_idx on public.products(category_id, status, created_at desc);
create index product_images_product_idx on public.product_images(product_id, sort_order);
create index box_components_box_type_idx on public.box_components(box_size_id, component_type);
create index saved_boxes_user_idx on public.saved_box_configurations(user_id, updated_at desc);
create index delivery_closures_window_idx on public.delivery_closures(starts_at, ends_at);
create index orders_user_created_idx on public.orders(user_id, created_at desc);
create index orders_status_created_idx on public.orders(status, created_at desc);
create index order_items_order_idx on public.order_items(order_id);
create index status_history_order_idx on public.order_status_history(order_id, created_at);
create index payment_attempts_order_idx on public.payment_attempts(order_id, created_at desc);
create index contact_status_created_idx on public.contact_enquiries(status, created_at desc);
create index catering_status_created_idx on public.catering_enquiries(status, created_at desc);
create index partnership_status_created_idx on public.partnership_applications(status, created_at desc);
create index staff_notes_entity_idx on public.staff_notes(entity_type, entity_id, created_at desc);
create index notification_queue_idx on public.notification_outbox(status, available_at);
create index audit_entity_idx on public.audit_events(entity_type, entity_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql security invoker set search_path = public
as $$ begin new.updated_at = now(); return new; end; $$;

do $$ declare table_name text; begin
  foreach table_name in array array['profiles','customer_addresses','staff_members','categories','products','box_sizes','saved_box_configurations','delivery_zones','orders','payment_attempts','contact_enquiries','catering_enquiries','partnership_applications'] loop
    execute format('create trigger %I_updated_at before update on public.%I for each row execute procedure public.set_updated_at()', table_name, table_name);
  end loop;
end $$;

create or replace function public.is_staff()
returns boolean language sql stable security invoker set search_path = public
as $$ select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and is_active); $$;

create or replace function public.is_admin()
returns boolean language sql stable security invoker set search_path = public
as $$ select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and is_active and role = 'manager'); $$;

create or replace function public.prevent_checkout_snapshot_mutation()
returns trigger language plpgsql security invoker set search_path = public
as $$ begin raise exception 'checkout snapshots are immutable'; end; $$;

create trigger checkout_snapshots_immutable before update or delete on public.checkout_snapshots for each row execute procedure public.prevent_checkout_snapshot_mutation();

alter table public.profiles enable row level security;
alter table public.customer_addresses enable row level security;
alter table public.staff_members enable row level security;
alter table public.staff_permissions enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.box_sizes enable row level security;
alter table public.box_components enable row level security;
alter table public.box_pricing_rules enable row level security;
alter table public.saved_box_configurations enable row level security;
alter table public.saved_box_items enable row level security;
alter table public.delivery_zones enable row level security;
alter table public.delivery_schedules enable row level security;
alter table public.delivery_closures enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.checkout_snapshots enable row level security;
alter table public.order_status_history enable row level security;
alter table public.payment_attempts enable row level security;
alter table public.verified_transactions enable row level security;
alter table public.refunds enable row level security;
alter table public.contact_enquiries enable row level security;
alter table public.catering_enquiries enable row level security;
alter table public.partnership_applications enable row level security;
alter table public.staff_notes enable row level security;
alter table public.public_business_settings enable row level security;
alter table public.operational_settings enable row level security;
alter table public.notification_outbox enable row level security;
alter table public.webhook_receipts enable row level security;
alter table public.audit_events enable row level security;

revoke all on all tables in schema public from anon, authenticated;
grant select on public.categories, public.products, public.product_images, public.box_sizes, public.box_components, public.box_pricing_rules, public.delivery_zones, public.delivery_schedules, public.public_business_settings to anon, authenticated;
grant select on public.staff_members, public.staff_permissions to authenticated;
grant select, update on public.profiles, public.customer_addresses, public.saved_box_configurations, public.saved_box_items to authenticated;
grant select on public.orders, public.order_items, public.checkout_snapshots, public.order_status_history to authenticated;
grant insert on public.contact_enquiries, public.catering_enquiries, public.partnership_applications to anon, authenticated;

create policy "Public reads published catalogue" on public.products for select to anon, authenticated using (status = 'published' or (select public.is_staff()));
create policy "Public reads public categories" on public.categories for select to anon, authenticated using (is_public or (select public.is_staff()));
create policy "Public reads active product images" on public.product_images for select to anon, authenticated using (exists (select 1 from public.products where products.id = product_images.product_id and (products.status = 'published' or (select public.is_staff()))));
create policy "Public reads active box configuration" on public.box_sizes for select to anon, authenticated using (status = 'published' or (select public.is_staff()));
create policy "Public reads allowed box components" on public.box_components for select to anon, authenticated using (exists (select 1 from public.box_sizes where box_sizes.id = box_components.box_size_id and (box_sizes.status = 'published' or (select public.is_staff()))));
create policy "Public reads box pricing" on public.box_pricing_rules for select to anon, authenticated using (exists (select 1 from public.box_sizes where box_sizes.id = box_pricing_rules.box_size_id and (box_sizes.status = 'published' or (select public.is_staff()))));
create policy "Public reads active delivery zones" on public.delivery_zones for select to anon, authenticated using (is_active or (select public.is_staff()));
create policy "Public reads delivery schedules" on public.delivery_schedules for select to anon, authenticated using (exists (select 1 from public.delivery_zones where delivery_zones.id = delivery_schedules.zone_id and (delivery_zones.is_active or (select public.is_staff()))));
create policy "Public reads business settings" on public.public_business_settings for select to anon, authenticated using (true);
create policy "Users own profiles" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "Users update own profiles" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "Staff can read own membership" on public.staff_members for select to authenticated using ((select auth.uid()) = user_id);
create policy "Staff can read own permissions" on public.staff_permissions for select to authenticated using ((select auth.uid()) = staff_user_id);
create policy "Users own addresses" on public.customer_addresses for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users own saved boxes" on public.saved_box_configurations for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users own saved box items" on public.saved_box_items for all to authenticated using (exists (select 1 from public.saved_box_configurations where id = saved_box_items.configuration_id and user_id = (select auth.uid()))) with check (exists (select 1 from public.saved_box_configurations where id = saved_box_items.configuration_id and user_id = (select auth.uid())));
create policy "Users own orders" on public.orders for select to authenticated using ((select auth.uid()) = user_id or (select public.is_staff()));
create policy "Users own order items" on public.order_items for select to authenticated using (exists (select 1 from public.orders where orders.id = order_items.order_id and (orders.user_id = (select auth.uid()) or (select public.is_staff()))));
create policy "Users own checkout snapshots" on public.checkout_snapshots for select to authenticated using (exists (select 1 from public.orders where orders.id = checkout_snapshots.order_id and (orders.user_id = (select auth.uid()) or (select public.is_staff()))));
create policy "Users own status history" on public.order_status_history for select to authenticated using (exists (select 1 from public.orders where orders.id = order_status_history.order_id and (orders.user_id = (select auth.uid()) or (select public.is_staff()))));
create policy "Public contact submission" on public.contact_enquiries for insert to anon, authenticated with check (length(trim(message)) > 0);
create policy "Public catering submission" on public.catering_enquiries for insert to anon, authenticated with check (guest_count > 0);
create policy "Public partnership submission" on public.partnership_applications for insert to anon, authenticated with check (consent_at is not null);
create policy "Staff reads enquiries" on public.contact_enquiries for select to authenticated using ((select public.is_staff()));
create policy "Staff reads catering" on public.catering_enquiries for select to authenticated using ((select public.is_staff()));
create policy "Staff reads partnerships" on public.partnership_applications for select to authenticated using ((select public.is_staff()));
create policy "Staff reads staff notes" on public.staff_notes for select to authenticated using ((select public.is_staff()));
create policy "Staff writes staff notes" on public.staff_notes for insert to authenticated with check ((select public.is_staff()) and author_id = (select auth.uid()));
create policy "Staff reads operations" on public.operational_settings for select to authenticated using ((select public.is_staff()));
create policy "Managers update operations" on public.operational_settings for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Staff reads audit events" on public.audit_events for select to authenticated using ((select public.is_staff()));

revoke all on public.notification_outbox, public.webhook_receipts, public.verified_transactions, public.refunds, public.payment_attempts from anon, authenticated;
