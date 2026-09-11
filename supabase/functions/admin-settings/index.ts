import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authorizeStaff, authorizationResponse } from '../_shared/authorize-staff.ts';
const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization,content-type,apikey,x-client-info' };
const out = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...headers, 'Content-Type': 'application/json' } });
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (req.method !== 'POST') return out({ error: { code: 'method_not_allowed' } }, 405);
  const url = Deno.env.get('SUPABASE_URL'); const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'); if (!url || !key) return out({ error: { code: 'server_not_configured' } }, 503);
  const admin = createClient(url, key, { auth: { persistSession: false } }); const authorization = await authorizeStaff(req, admin, 'manage_settings'); if ('error' in authorization) return authorizationResponse(authorization, out); const actor = authorization.user;
  let body: any; try { body = await req.json(); } catch { return out({ error: { code: 'invalid_json' } }, 400); }
  const publicResult = await admin.from('public_business_settings').select('key,value,is_published').order('key'); if (publicResult.error) return out({ error: { code: 'read_failed' } }, 500);
  const privateResult = await admin.from('operational_settings').select('key,value,updated_at').order('key'); if (privateResult.error) return out({ error: { code: 'read_failed' } }, 500);
  if (body.action === 'read') return out({ public: publicResult.data || [], operational: privateResult.data || [] });
  if (!['update','publish','unpublish'].includes(body.action) || (body.action === 'update' && (!body.settings || typeof body.settings !== 'object'))) return out({ error: { code: 'invalid_request' } }, 422);
  const saved = await admin.rpc('save_business_settings', { p_settings: body.action === 'update' ? body.settings : {}, p_publish_keys: body.action === 'publish' ? (Array.isArray(body.keys) ? body.keys : []) : body.action === 'update' && Array.isArray(body.publishKeys) ? body.publishKeys : [], p_unpublish_keys: body.action === 'unpublish' ? (Array.isArray(body.keys) ? body.keys : []) : [], p_actor_id: actor.id });
  if (saved.error) return out({ error: { code: saved.error.message === 'unsupported_setting' || saved.error.message === 'setting_type_invalid' ? saved.error.message : 'update_failed' } }, 422);
  return out(saved.data);
});
