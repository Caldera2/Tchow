import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization,content-type,apikey,x-client-info' };
const out = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...headers, 'Content-Type': 'application/json' } });
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (req.method !== 'POST') return out({ error: { code: 'method_not_allowed' } }, 405);
  const url = Deno.env.get('SUPABASE_URL'); const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'); if (!url || !key) return out({ error: { code: 'server_not_configured' } }, 503);
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, ''); const admin = createClient(url, key, { auth: { persistSession: false } }); const actor = token ? (await admin.auth.getUser(token)).data.user : null; if (!actor) return out({ error: { code: 'unauthorized' } }, 401);
  const { data: staff } = await admin.from('staff_members').select('user_id, is_active, staff_permissions!inner(permission)').eq('user_id', actor.id).eq('is_active', true).eq('staff_permissions.permission', 'manage_settings').maybeSingle(); if (!staff) return out({ error: { code: 'forbidden' } }, 403);
  let body: any; try { body = await req.json(); } catch { return out({ error: { code: 'invalid_json' } }, 400); }
  const publicResult = await admin.from('public_business_settings').select('key,value,is_published').order('key'); if (publicResult.error) return out({ error: { code: 'read_failed' } }, 500);
  const privateResult = await admin.from('operational_settings').select('key,value,updated_at').order('key'); if (privateResult.error) return out({ error: { code: 'read_failed' } }, 500);
  if (body.action === 'read') return out({ public: publicResult.data || [], operational: privateResult.data || [] });
  if (body.action !== 'update' || !body.settings || typeof body.settings !== 'object') return out({ error: { code: 'invalid_request' } }, 422);
  for (const [keyName, value] of Object.entries(body.settings)) { const table = String(keyName).startsWith('private.') ? 'operational_settings' : 'public_business_settings'; const keyValue = String(keyName).replace(/^private\./, ''); const result = await admin.from(table).upsert({ key: keyValue, value, ...(table === 'operational_settings' ? { updated_by: actor.id } : {}) }); if (result.error) return out({ error: { code: 'update_failed' } }, 500); }
  const audit = await admin.from('audit_events').insert({ actor_id: actor.id, action: 'business_settings_updated', entity_type: 'business_settings', metadata: { keys: Object.keys(body.settings) } }); if (audit.error) return out({ error: { code: 'audit_failed' } }, 500);
  return out({ saved: true });
});
