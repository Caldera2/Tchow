-- Delivery validation metadata used by both quoting and order creation.
-- Existing schedules remain valid and default to active for the upgrade path.
alter table public.delivery_schedules
  add column if not exists is_active boolean not null default true;

create index if not exists delivery_schedule_lookup_idx
  on public.delivery_schedules(zone_id, weekday, is_active);

create index if not exists product_delivery_schedule_lookup_idx
  on public.product_delivery_schedules(product_id, weekday, starts_on, ends_on)
  where is_active;

create index if not exists delivery_closure_overlap_idx
  on public.delivery_closures(zone_id, starts_at, ends_at);

comment on table public.delivery_schedules is 'Operating windows interpreted in the delivery zone timezone, normally Africa/Lagos.';
comment on table public.delivery_closures is 'Overlapping closures are all applicable; validation must reject when any record overlaps the requested date.';
