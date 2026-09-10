import { requireSupabase } from '../lib/supabase';
import { invokeFunction } from './api';

export async function getPublicSettings() {
  const { data, error } = await requireSupabase().from('public_business_settings').select('key,value').eq('is_published', true);
  if (error) throw error;
  return Object.fromEntries((data || []).map((item) => [item.key, item.value]));
}

export async function getAdminSettings() {
  return invokeFunction('admin-settings', { action: 'read' });
}

export async function updateAdminSettings(settings) {
  return invokeFunction('admin-settings', { action: 'update', settings });
}
