import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authorizeStaff, authorizationResponse } from '../_shared/authorize-staff.ts';
const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization,content-type,apikey,x-client-info' };
const out = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...headers, 'Content-Type': 'application/json' } });
const tables: Record<string, { table: string; permission: string; statuses: string[] }> = {
  contact: { table: 'contact_enquiries', permission: 'manage_contact', statuses: ['new', 'reviewing', 'resolved', 'spam'] },
  catering: { table: 'catering_enquiries', permission: 'manage_catering', statuses: ['new', 'reviewing', 'contacted', 'quoted', 'confirmed', 'closed'] },
  partnership: { table: 'partnership_applications', permission: 'manage_partnerships', statuses: ['new', 'under_review', 'contacted', 'meeting_scheduled', 'documentation_pending', 'closed'] },
};
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (req.method !== 'POST') return out({ error: { code: 'method_not_allowed' } }, 405);
  const url = Deno.env.get('SUPABASE_URL'); const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'); if (!url || !key) return out({ error: { code: 'server_not_configured' } }, 503);
  const admin = createClient(url, key, { auth: { persistSession: false } });
  let body: any; try { body = await req.json(); } catch { return out({ error: { code: 'invalid_json' } }, 400); }
  const meta = tables[body.kind]; if (!meta || !body.id || !meta.statuses.includes(body.status)) return out({ error: { code: 'invalid_request' } }, 422);
  const authorization = await authorizeStaff(req, admin, meta.permission as any); if ('error' in authorization) return authorizationResponse(authorization, out); const actor = authorization.user;
  const { data: current, error: readError } = await admin.from(meta.table).select('id,status').eq('id', body.id).maybeSingle(); if (readError) return out({ error: { code: 'read_failed' } }, 500); if (!current) return out({ error: { code: 'not_found' } }, 404);
  const { data: record, error } = await admin.from(meta.table).update({ status: body.status, internal_notes: String(body.internalNotes || '').slice(0, 10000) || null }).eq('id', body.id).select('*').single(); if (error) return out({ error: { code: 'update_failed' } }, 500);
  const audit = await admin.from('audit_events').insert({ actor_id: actor.id, action: current.status === body.status ? 'enquiry_note_updated' : 'enquiry_status_changed', entity_type: meta.table, entity_id: body.id, metadata: { from: current.status, to: body.status } }); if (audit.error) return out({ error: { code: 'audit_failed' } }, 500);
  return out({ record });
});
