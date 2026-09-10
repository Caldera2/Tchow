import { requireSupabase } from '../lib/supabase';
import { invokeFunction } from './api';

const idempotencyKey = () => globalThis.crypto?.randomUUID?.() || `enquiry-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export async function submitEnquiry(kind, data, key = idempotencyKey()) {
  return invokeFunction('submit-enquiry', { kind, data, idempotencyKey: key }, { idempotencyKey: key });
}

const tables = { contact: 'contact_enquiries', catering: 'catering_enquiries', partnership: 'partnership_applications' };
const columns = {
  contact: 'id,full_name,email,phone,subject,message,status,created_at,updated_at',
  catering: 'id,full_name,organization,email,phone,event_type,event_date,guest_count,location,budget_range,additional_requirements,status,created_at,updated_at',
  partnership: 'id,full_name,email,phone,organization,country,pathway,contribution_range,strategic_resources,timeline,additional_notes,status,consent_at,created_at,updated_at',
};

export async function listAdminEnquiries(kind, { page = 0, pageSize = 20, status, search } = {}) {
  const table = tables[kind];
  if (!table) throw new Error('Unknown enquiry type');
  let query = requireSupabase().from(table).select(columns[kind], { count: 'exact' }).order('created_at', { ascending: false }).range(page * pageSize, page * pageSize + pageSize - 1);
  if (status && status !== 'all') query = query.eq('status', status);
  if (search?.trim()) {
    const term = search.trim().replace(/[(),]/g, ' ');
    query = query.or(`full_name.ilike.%${term}%,email.ilike.%${term}%`);
  }
  const { data, count, error } = await query;
  if (error) throw error;
  return { data: data || [], count: count || 0, page, pageSize };
}

export async function updateAdminEnquiry(kind, id, changes) {
  return invokeFunction('update-enquiry', { kind, id, ...changes }, { idempotencyKey: `enquiry-update:${kind}:${id}:${changes.status || 'note'}:${Date.now()}` });
}
