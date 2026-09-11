import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authorizeStaff, authorizationResponse } from '../_shared/authorize-staff.ts';

const h = {
  'Access-Control-Allow-Origin': Deno.env.get('PUBLIC_APP_URL') || 'http://localhost:5173',
  'Access-Control-Allow-Headers': 'authorization,apikey,content-type,x-client-info,idempotency-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
};
const out = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...h, 'Content-Type': 'application/json' } });

const localDayBounds = () => {
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos' }).format(new Date());
  const start = new Date(`${date}T00:00:00+01:00`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
  if (req.method !== 'POST') return out({ error: { code: 'method_not_allowed' } }, 405);
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return out({ error: { code: 'server_not_configured' } }, 503);

  const db = createClient(url, key, { auth: { persistSession: false } });
  const authorization = await authorizeStaff(req, db, 'view_audit');
  if ('error' in authorization) return authorizationResponse(authorization, out);
  const permissions = new Set(((authorization.member as { staff_permissions?: Array<{ permission: string }> }).staff_permissions || []).map((item) => item.permission));
  const owner = authorization.member.role === 'owner';
  const can = (permission: string) => owner || permissions.has(permission);
  const { start, end } = localDayBounds();
  const startIso = start.toISOString();
  const endIso = end.toISOString();
  const errors: string[] = [];

  const count = async (query: any) => {
    const result = await query;
    if (result.error) errors.push(result.error.message || 'count query failed');
    return result.count || 0;
  };
  const rows = async <T>(query: any) => {
    const result = await query;
    if (result.error) errors.push(result.error.message || 'row query failed');
    return result.data || [];
  };

  const ordersToday = can('manage_orders')
    ? await count(db.from('orders').select('id', { count: 'exact', head: true }).gte('created_at', startIso).lt('created_at', endIso))
    : null;
  const pendingOrders = can('manage_orders')
    ? await count(db.from('orders').select('id', { count: 'exact', head: true }).in('status', ['received_for_review', 'confirmed', 'preparing']))
    : null;
  const paid = can('manage_financial')
    ? await rows<{ amount_kobo: number }>(db.from('verified_transactions').select('amount_kobo').gte('verified_at', startIso).lt('verified_at', endIso))
    : null;
  const refunds = can('manage_financial')
    ? await rows<{ amount_kobo: number }>(db.from('refunds').select('amount_kobo').eq('status', 'successful').gte('created_at', startIso).lt('created_at', endIso))
    : null;
  const recentOrders = can('manage_orders')
    ? await rows(db.from('orders').select('id,order_number,customer_name,total_kobo,status,payment_status,created_at').order('created_at', { ascending: false }).limit(10))
    : null;
  const catering = can('manage_catering')
    ? await count(db.from('catering_enquiries').select('id', { count: 'exact', head: true }).in('status', ['new', 'reviewing', 'contacted']))
    : null;
  const partnerships = can('manage_partnerships')
    ? await count(db.from('partnership_applications').select('id', { count: 'exact', head: true }).in('status', ['new', 'under_review', 'contacted']))
    : null;
  const activity = await rows(db.from('audit_events').select('action,entity_type,entity_id,created_at').order('created_at', { ascending: false }).limit(20));

  if (errors.length) return out({ error: { code: 'overview_query_failed', message: 'One or more overview queries failed.' } }, 500);
  return out({
    period: { start: startIso, end: endIso, timezone: 'Africa/Lagos' },
    metrics: {
      ordersToday,
      pendingOrders,
      paidSalesKobo: paid ? paid.reduce((total: number, row: { amount_kobo: number }) => total + Number(row.amount_kobo || 0), 0) : null,
      refundsKobo: refunds ? refunds.reduce((total: number, row: { amount_kobo: number }) => total + Number(row.amount_kobo || 0), 0) : null,
      cateringEnquiries: catering,
      partnershipApplications: partnerships,
    },
    recentOrders,
    activity,
  });
});
