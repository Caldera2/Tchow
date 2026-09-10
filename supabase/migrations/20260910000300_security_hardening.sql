alter table public.staff_permissions drop constraint if exists staff_permissions_permission_check;
alter table public.staff_permissions add constraint staff_permissions_permission_check check (permission in ('manage_menu', 'manage_orders', 'manage_delivery', 'manage_catering', 'manage_contact', 'manage_partnerships', 'manage_settings', 'manage_staff', 'manage_financial', 'view_audit'));

alter table public.public_business_settings add column if not exists is_published boolean not null default false;

drop policy if exists "Staff reads partnerships" on public.partnership_applications;
drop policy if exists "Staff reads staff notes" on public.staff_notes;
drop policy if exists "Staff creates own notes" on public.staff_notes;

create or replace function public.has_staff_permission(required_permission text)
returns boolean language sql stable security invoker set search_path = public
as $$
  select exists (
    select 1
    from public.staff_members member
    left join public.staff_permissions permission on permission.staff_user_id = member.user_id
    where member.user_id = (select auth.uid())
      and member.is_active
      and coalesce((select auth.jwt() ->> 'aal'), 'aal1') = 'aal2'
      and (member.role = 'owner' or permission.permission = required_permission)
  );
$$;

create or replace function public.is_owner()
returns boolean language sql stable security invoker set search_path = public
as $$ select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and is_active and role = 'owner'); $$;

-- This trigger is the one justified definer function: auth.users cannot insert into
-- public.profiles directly, while the function writes only the new user's own row.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$ begin insert into public.profiles (id, full_name, email) values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), new.email); return new; end; $$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

drop policy if exists "Public reads business settings" on public.public_business_settings;
create policy "Public reads approved business settings" on public.public_business_settings for select to anon, authenticated using (is_published = true);

grant select, insert, update, delete on public.categories, public.products, public.product_images, public.box_sizes, public.box_components, public.box_pricing_rules to authenticated;
grant select, insert, update, delete on public.delivery_zones, public.delivery_schedules, public.delivery_closures to authenticated;
grant select, update on public.contact_enquiries, public.catering_enquiries, public.partnership_applications to authenticated;
grant select on public.staff_notes, public.audit_events to authenticated;
grant insert on public.staff_notes to authenticated;
grant select, insert, update, delete on public.public_business_settings, public.operational_settings to authenticated;

create policy "Menu permission manages categories" on public.categories for all to authenticated using ((select public.has_staff_permission('manage_menu'))) with check ((select public.has_staff_permission('manage_menu')));
create policy "Menu permission manages products" on public.products for all to authenticated using ((select public.has_staff_permission('manage_menu'))) with check ((select public.has_staff_permission('manage_menu')));
create policy "Menu permission manages images" on public.product_images for all to authenticated using ((select public.has_staff_permission('manage_menu'))) with check ((select public.has_staff_permission('manage_menu')));
create policy "Menu permission manages box sizes" on public.box_sizes for all to authenticated using ((select public.has_staff_permission('manage_menu'))) with check ((select public.has_staff_permission('manage_menu')));
create policy "Menu permission manages box components" on public.box_components for all to authenticated using ((select public.has_staff_permission('manage_menu'))) with check ((select public.has_staff_permission('manage_menu')));
create policy "Menu permission manages box pricing" on public.box_pricing_rules for all to authenticated using ((select public.has_staff_permission('manage_menu'))) with check ((select public.has_staff_permission('manage_menu')));

create policy "Delivery permission manages zones" on public.delivery_zones for all to authenticated using ((select public.has_staff_permission('manage_delivery'))) with check ((select public.has_staff_permission('manage_delivery')));
create policy "Delivery permission manages schedules" on public.delivery_schedules for all to authenticated using ((select public.has_staff_permission('manage_delivery'))) with check ((select public.has_staff_permission('manage_delivery')));
create policy "Delivery permission manages closures" on public.delivery_closures for all to authenticated using ((select public.has_staff_permission('manage_delivery'))) with check ((select public.has_staff_permission('manage_delivery')));

create policy "Catering permission reads enquiries" on public.catering_enquiries for select to authenticated using ((select public.has_staff_permission('manage_catering')));
create policy "Catering permission updates enquiries" on public.catering_enquiries for update to authenticated using ((select public.has_staff_permission('manage_catering'))) with check ((select public.has_staff_permission('manage_catering')));
create policy "Contact permission reads enquiries" on public.contact_enquiries for select to authenticated using ((select public.has_staff_permission('manage_contact')));
create policy "Contact permission updates enquiries" on public.contact_enquiries for update to authenticated using ((select public.has_staff_permission('manage_contact'))) with check ((select public.has_staff_permission('manage_contact')));
create policy "Partnership permission reads applications" on public.partnership_applications for select to authenticated using ((select public.has_staff_permission('manage_partnerships')));
create policy "Partnership permission updates applications" on public.partnership_applications for update to authenticated using ((select public.has_staff_permission('manage_partnerships'))) with check ((select public.has_staff_permission('manage_partnerships')));

create policy "Staff reads own notes" on public.staff_notes for select to authenticated using ((select public.is_staff()));
create policy "Staff creates own notes" on public.staff_notes for insert to authenticated with check ((select public.is_staff()) and author_id = (select auth.uid()));
create policy "Staff reads audit records" on public.audit_events for select to authenticated using ((select public.is_staff()));

create policy "Settings permission manages public settings" on public.public_business_settings for all to authenticated using ((select public.has_staff_permission('manage_settings'))) with check ((select public.has_staff_permission('manage_settings')));
create policy "Settings permission manages operational settings" on public.operational_settings for all to authenticated using ((select public.has_staff_permission('manage_settings'))) with check ((select public.has_staff_permission('manage_settings')));

create policy "Operations read orders" on public.orders for select to authenticated using ((select public.has_staff_permission('manage_orders')));
create policy "Operations read order items" on public.order_items for select to authenticated using ((select public.has_staff_permission('manage_orders')));
create policy "Operations read checkout snapshots" on public.checkout_snapshots for select to authenticated using ((select public.has_staff_permission('manage_orders')));
create policy "Operations read status history" on public.order_status_history for select to authenticated using ((select public.has_staff_permission('manage_orders')));

-- Orders, payment records, staff assignment, audit writes, and workflow transitions remain service-only.
revoke insert, update, delete on public.orders, public.order_items, public.checkout_snapshots, public.order_status_history from anon, authenticated;
revoke all on public.payment_attempts, public.verified_transactions, public.refunds, public.notification_outbox, public.webhook_receipts from anon, authenticated;
revoke insert, update, delete on public.staff_members, public.staff_permissions, public.audit_events from anon, authenticated;

revoke execute on function public.has_staff_permission(text), public.is_staff(), public.is_admin(), public.is_owner() from anon;
grant execute on function public.has_staff_permission(text), public.is_staff(), public.is_admin(), public.is_owner() to authenticated;

-- Owner-only staff assignment and sensitive financial actions are exposed through
-- server functions, not direct table grants or client-side role checks.
