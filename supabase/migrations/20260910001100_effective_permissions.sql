-- Remove permissive policies from the baseline. PostgreSQL combines permissive
-- policies with OR, so later restrictive policies cannot override these.
drop policy if exists "Staff reads enquiries" on public.contact_enquiries;
drop policy if exists "Staff reads catering" on public.catering_enquiries;
drop policy if exists "Staff reads partnerships" on public.partnership_applications;
drop policy if exists "Staff reads operations" on public.operational_settings;
drop policy if exists "Managers update operations" on public.operational_settings;
drop policy if exists "Staff reads staff notes" on public.staff_notes;
drop policy if exists "Staff writes staff notes" on public.staff_notes;
drop policy if exists "Staff reads own notes" on public.staff_notes;
drop policy if exists "Staff creates own notes" on public.staff_notes;
drop policy if exists "Staff reads audit events" on public.audit_events;
drop policy if exists "Users own orders" on public.orders;
drop policy if exists "Users own order items" on public.order_items;
drop policy if exists "Users own checkout snapshots" on public.checkout_snapshots;
drop policy if exists "Users own status history" on public.order_status_history;

-- Address and saved-box repositories require full CRUD, but ownership remains
-- enforced by the row policy and cannot be changed by the client.
grant select, insert, update, delete on public.customer_addresses, public.saved_box_configurations, public.saved_box_items to authenticated;
revoke insert, update, delete on public.contact_enquiries, public.catering_enquiries, public.partnership_applications from anon, authenticated;
revoke update on public.profiles from authenticated;
grant update (full_name, phone, preferred_communication, dietary_notes) on public.profiles to authenticated;

create policy "Customers own orders only" on public.orders for select to authenticated using ((select auth.uid()) = user_id);
create policy "Customers own order items only" on public.order_items for select to authenticated using (exists (select 1 from public.orders where orders.id = order_items.order_id and orders.user_id = (select auth.uid())));
create policy "Customers own checkout snapshots only" on public.checkout_snapshots for select to authenticated using (exists (select 1 from public.orders where orders.id = checkout_snapshots.order_id and orders.user_id = (select auth.uid())));
create policy "Customers own status history only" on public.order_status_history for select to authenticated using (exists (select 1 from public.orders where orders.id = order_status_history.order_id and orders.user_id = (select auth.uid())));

create policy "Staff notes follow record permission" on public.staff_notes for select to authenticated using (
  (entity_type = 'order' and (select public.has_staff_permission('manage_orders'))) or
  (entity_type = 'contact_enquiry' and (select public.has_staff_permission('manage_contact'))) or
  (entity_type = 'catering_enquiry' and (select public.has_staff_permission('manage_catering'))) or
  (entity_type = 'partnership_application' and (select public.has_staff_permission('manage_partnerships'))) or
  (entity_type = 'customer' and (select public.has_staff_permission('manage_orders')))
);
create policy "Staff create notes with record permission" on public.staff_notes for insert to authenticated with check (
  author_id = (select auth.uid()) and ((entity_type = 'order' and (select public.has_staff_permission('manage_orders'))) or (entity_type = 'contact_enquiry' and (select public.has_staff_permission('manage_contact'))) or (entity_type = 'catering_enquiry' and (select public.has_staff_permission('manage_catering'))) or (entity_type = 'partnership_application' and (select public.has_staff_permission('manage_partnerships'))) or (entity_type = 'customer' and (select public.has_staff_permission('manage_orders'))))
);
