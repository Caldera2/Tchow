begin;
select plan(18);

-- Local-only fixtures. The transaction is rolled back after the checks.
set local role postgres;
insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
values
 ('00000000-0000-0000-0000-0000000000a1','authenticated','authenticated','a1@example.test','fixture',now(),'{}','{}'),
 ('00000000-0000-0000-0000-0000000000b1','authenticated','authenticated','b1@example.test','fixture',now(),'{}','{}'),
 ('00000000-0000-0000-0000-0000000000c1','authenticated','authenticated','c1@example.test','fixture',now(),'{}','{}'),
 ('00000000-0000-0000-0000-0000000000c2','authenticated','authenticated','c2@example.test','fixture',now(),'{}','{}'),
 ('00000000-0000-0000-0000-0000000000c3','authenticated','authenticated','c3@example.test','fixture',now(),'{}','{}'),
 ('00000000-0000-0000-0000-0000000000c4','authenticated','authenticated','c4@example.test','fixture',now(),'{}','{}');
insert into public.profiles (id,full_name,email,phone)
select id,split_part(email,'@',1),email,'08000000000' from auth.users
where id in ('00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-0000000000c2','00000000-0000-0000-0000-0000000000c3','00000000-0000-0000-0000-0000000000c4') on conflict (id) do nothing;
insert into public.staff_members (user_id,role,is_active) values
 ('00000000-0000-0000-0000-0000000000c1','operator',true),('00000000-0000-0000-0000-0000000000c2','operator',true),('00000000-0000-0000-0000-0000000000c3','operator',false),('00000000-0000-0000-0000-0000000000c4','operator',true);
insert into public.staff_permissions (staff_user_id,permission) values
 ('00000000-0000-0000-0000-0000000000c1','manage_orders'),('00000000-0000-0000-0000-0000000000c1','manage_catering'),('00000000-0000-0000-0000-0000000000c2','manage_orders'),('00000000-0000-0000-0000-0000000000c3','manage_menu'),('00000000-0000-0000-0000-0000000000c4','manage_menu'),('00000000-0000-0000-0000-0000000000c4','view_audit');
insert into public.categories (id,legacy_key,name,slug,is_public) values ('00000000-0000-0000-0000-0000000000d1','fixture-category','Fixture category','fixture-category',true);
insert into public.products (id,legacy_key,category_id,name,status,price_kobo,is_available) values ('00000000-0000-0000-0000-0000000000e1','fixture-published','00000000-0000-0000-0000-0000000000d1','Published fixture','published',100000,true),('00000000-0000-0000-0000-0000000000e2','fixture-draft','00000000-0000-0000-0000-0000000000d1','Draft fixture','draft',100000,true);
insert into public.product_images (product_id,storage_path,alt_text) values ('00000000-0000-0000-0000-0000000000e1','fixture/published.jpg','Published fixture');
insert into public.orders (order_number,user_id,idempotency_key,customer_name,customer_email,customer_phone,delivery_address_snapshot,subtotal_kobo,delivery_fee_kobo,total_kobo) values ('RLS-FIXTURE','00000000-0000-0000-0000-0000000000a1','rls-fixture','Customer A','a1@example.test','08000000000','{}',100000,0,100000);
insert into public.audit_events (actor_id,action,entity_type,entity_id) values ('00000000-0000-0000-0000-0000000000c4','fixture','customer','00000000-0000-0000-0000-0000000000a1');

set local role anon;
select is((select count(*) from public.products where status='draft'),0::bigint,'anonymous cannot read draft products');
select ok((select exists (select 1 from public.products p join public.categories c on c.id=p.category_id left join public.product_images i on i.product_id=p.id where p.status='published' and p.is_available and c.is_public and i.id is not null)),'anonymous can read published category/image joins');
select throws_ok($$select count(*) from public.operational_settings$$,'42501','anonymous is denied operational settings');
select throws_ok($$select count(*) from public.staff_notes$$,'42501','anonymous is denied staff notes');
select throws_ok($$insert into public.orders (order_number,idempotency_key,customer_name,customer_email,customer_phone,delivery_address_snapshot,subtotal_kobo,delivery_fee_kobo,total_kobo) values ('BAD','BAD','Anon','anon@example.test','000','{}',1,0,1)$$,'42501','anonymous cannot insert orders');

set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1',true);
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","aal":"aal1"}',true);
select ok((select exists (select 1 from public.orders where user_id='00000000-0000-0000-0000-0000000000a1')),'customer A reads own order');
select is((select count(*) from public.orders where user_id='00000000-0000-0000-0000-0000000000b1'),0::bigint,'customer A cannot read customer B orders');
select is((select count(*) from public.products where status='draft'),0::bigint,'customer cannot read draft products');
select throws_ok($$select count(*) from public.operational_settings$$,'42501','customer is denied operational settings');
select is((select count(*) from public.partnership_applications),0::bigint,'customer cannot read partnership applications');
select throws_ok($$insert into public.staff_members (user_id,role) values ('00000000-0000-0000-0000-0000000000a1','owner')$$,'42501','customer cannot grant staff role');

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000c1',true);
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated","aal":"aal2"}',true);
select ok((select exists (select 1 from public.orders)),'operations staff reads orders');
select is((select count(*) from public.partnership_applications),0::bigint,'operations staff cannot read partnerships');
select is((select count(*) from public.audit_events),0::bigint,'staff without audit permission sees no audit rows');

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000c3',true);
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000c3","role":"authenticated","aal":"aal2"}',true);
select is((select count(*) from public.products where status='draft'),0::bigint,'inactive staff cannot read draft products');

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000c2',true);
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated","aal":"aal2"}',true);
select is((select count(*) from public.products where status='draft'),0::bigint,'staff without menu permission cannot read draft products');

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000c4',true);
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000c4","role":"authenticated","aal":"aal2"}',true);
select ok((select exists (select 1 from public.products where status='draft')),'authorized menu staff reads draft products');
select ok((select exists (select 1 from public.audit_events)),'authorized aal2 staff reads audit events');

select * from finish();
rollback;
