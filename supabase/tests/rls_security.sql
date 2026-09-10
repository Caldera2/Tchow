-- Run with Supabase's local test database after creating two auth users and fixtures:
-- Customer A: 00000000-0000-0000-0000-0000000000a1
-- Customer B: 00000000-0000-0000-0000-0000000000b1
-- Staff users must be provisioned through staff_members, never user metadata.

begin;
select plan(15);

set local role anon;
select throws_ok($$insert into public.orders (order_number, idempotency_key, customer_name, customer_email, customer_phone, delivery_address_snapshot, subtotal_kobo, delivery_fee_kobo, total_kobo) values ('BAD', 'BAD', 'Anon', 'anon@example.com', '000', '{}', 1, 0, 1)$$, '42501', 'anonymous cannot insert orders directly');
select is((select count(*) from public.products where status = 'draft'), 0::bigint, 'anonymous cannot read draft products');
select is((select count(*) from public.operational_settings), 0::bigint, 'anonymous cannot read operational settings');
select is((select count(*) from public.staff_notes), 0::bigint, 'anonymous cannot read staff notes');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);
select ok((select exists (select 1 from public.orders where user_id = '00000000-0000-0000-0000-0000000000a1')), 'customer A can read a seeded own order');
select is((select count(*) from public.orders where user_id = '00000000-0000-0000-0000-0000000000b1'), 0::bigint, 'customer A cannot read customer B orders');
select is((select count(*) from public.customer_addresses where user_id <> '00000000-0000-0000-0000-0000000000a1'), 0::bigint, 'customer A cannot read customer B addresses');
select throws_ok($$insert into public.staff_members (user_id, role) values ('00000000-0000-0000-0000-0000000000a1', 'owner')$$, '42501', 'customer cannot grant self staff role');
select throws_ok($$update public.orders set total_kobo = 1 where user_id = '00000000-0000-0000-0000-0000000000a1'$$, '42501', 'customer cannot change server-controlled order totals');
select throws_ok($$update public.profiles set id = '00000000-0000-0000-0000-0000000000b1' where id = '00000000-0000-0000-0000-0000000000a1'$$, '42501', 'customer cannot change profile ownership');
select is((select count(*) from public.partnership_applications), 0::bigint, 'customer cannot read partnership applications');

-- This fixture must be an active operations staff member with manage_orders/manage_catering only.
set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c1', true);
set_config('request.jwt.claim.aal', 'aal2', true);
select ok((select exists (select 1 from public.orders)), 'authorized operations staff can read orders');
select is((select count(*) from public.verified_transactions), 0::bigint, 'operations staff cannot read financial records');
select is((select count(*) from public.partnership_applications), 0::bigint, 'operations staff cannot read partnership applications without permission');
select is((select count(*) from public.operational_settings), 0::bigint, 'operations staff cannot read private operational settings');

select * from finish();
rollback;
