import { requireSupabase } from '../lib/supabase';
import { normalizeApiError } from './contracts';

export async function invokeFunction(name, body, options = {}) {
  const { data, error } = await requireSupabase().functions.invoke(name, { body, headers: options.idempotencyKey ? { 'idempotency-key': options.idempotencyKey } : undefined });
  if (error) throw normalizeApiError(error);
  return data;
}

export async function insertRecord(table, payload, select = '*') {
  const { data, error } = await requireSupabase().from(table).insert(payload).select(select).single();
  if (error) throw normalizeApiError(error);
  return data;
}

export async function listRecords(table, { page = 0, pageSize = 20, select = '*', order = 'created_at', ascending = false } = {}) {
  const { data, count, error } = await requireSupabase().from(table).select(select, { count: 'exact' }).order(order, { ascending }).range(page * pageSize, page * pageSize + pageSize - 1);
  if (error) throw normalizeApiError(error);
  return { data, count, page, pageSize };
}
