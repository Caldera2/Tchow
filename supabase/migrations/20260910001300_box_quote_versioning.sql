-- Quote invalidation is tied to the published box rules, not to browser state.
create or replace function public.bump_box_configuration_version()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.box_sizes
  set configuration_version = configuration_version + 1,
      updated_at = now()
  where id = coalesce(new.box_size_id, old.box_size_id);
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists box_components_bump_configuration on public.box_components;
create trigger box_components_bump_configuration
after insert or update or delete on public.box_components
for each row execute function public.bump_box_configuration_version();

drop trigger if exists box_pricing_rules_bump_configuration on public.box_pricing_rules;
create trigger box_pricing_rules_bump_configuration
after insert or update or delete on public.box_pricing_rules
for each row execute function public.bump_box_configuration_version();

revoke all on function public.bump_box_configuration_version() from public, anon, authenticated;

create or replace function public.bump_box_size_version()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.base_price_kobo is distinct from old.base_price_kobo
     or new.status is distinct from old.status
     or new.snack_allowance is distinct from old.snack_allowance
     or new.drink_allowance is distinct from old.drink_allowance
     or new.dessert_allowance is distinct from old.dessert_allowance then
    new.configuration_version = old.configuration_version + 1;
  end if;
  return new;
end;
$$;

drop trigger if exists box_size_bump_configuration on public.box_sizes;
create trigger box_size_bump_configuration
before update on public.box_sizes
for each row execute function public.bump_box_size_version();

revoke all on function public.bump_box_size_version() from public, anon, authenticated;
