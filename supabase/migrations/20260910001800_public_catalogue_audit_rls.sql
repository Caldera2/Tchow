-- Public policies must be evaluable without touching protected staff tables.
drop policy if exists "Public reads available published catalogue" on public.products;
drop policy if exists "Public reads published catalogue" on public.products;
drop policy if exists "Available products are public" on public.products;
drop policy if exists "Public reads public categories" on public.categories;
drop policy if exists "Public reads active product images" on public.product_images;
drop policy if exists "Public reads active box configuration" on public.box_sizes;
drop policy if exists "Public reads allowed box components" on public.box_components;
drop policy if exists "Public reads box pricing" on public.box_pricing_rules;

create policy "Public reads published products" on public.products
  for select to anon, authenticated
  using (status = 'published' and is_available = true);
create policy "Catalogue staff reads all products" on public.products
  for select to authenticated
  using ((select public.has_staff_permission('manage_menu')));

create policy "Public reads public categories" on public.categories
  for select to anon, authenticated using (is_public = true);
create policy "Catalogue staff reads all categories" on public.categories
  for select to authenticated using ((select public.has_staff_permission('manage_menu')));

create policy "Public reads active product images" on public.product_images
  for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_images.product_id and p.status = 'published' and p.is_available = true));
create policy "Catalogue staff reads all product images" on public.product_images
  for select to authenticated using ((select public.has_staff_permission('manage_menu')));

create policy "Public reads published box configuration" on public.box_sizes
  for select to anon, authenticated using (status = 'published');
create policy "Box staff reads all box sizes" on public.box_sizes
  for select to authenticated using ((select public.has_staff_permission('manage_menu')));

create policy "Public reads allowed box components" on public.box_components
  for select to anon, authenticated
  using (exists (select 1 from public.box_sizes b where b.id = box_components.box_size_id and b.status = 'published'));
create policy "Box staff reads all components" on public.box_components
  for select to authenticated using ((select public.has_staff_permission('manage_menu')));

create policy "Public reads published box pricing" on public.box_pricing_rules
  for select to anon, authenticated
  using (exists (select 1 from public.box_sizes b where b.id = box_pricing_rules.box_size_id and b.status = 'published'));
create policy "Box staff reads all pricing" on public.box_pricing_rules
  for select to authenticated using ((select public.has_staff_permission('manage_menu')));

drop policy if exists "Staff reads audit records" on public.audit_events;
drop policy if exists "Staff reads audit events" on public.audit_events;
create policy "Audit permission reads audit records" on public.audit_events
  for select to authenticated using ((select public.has_staff_permission('view_audit')));
