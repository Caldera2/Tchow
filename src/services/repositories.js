import { requireSupabase } from '../lib/supabase';

export const productsRepository = {
  async list({ page = 0, pageSize = 24, category } = {}) {
    let query = requireSupabase().from('products').select('*', { count: 'exact' }).eq('is_available', true).range(page * pageSize, page * pageSize + pageSize - 1);
    if (category) query = query.eq('category', category);
    const { data, count, error } = await query.order('name');
    if (error) throw error;
    return { data, count };
  },
};

export const profileRepository = {
  async get() { const { data, error } = await requireSupabase().from('profiles').select('*').single(); if (error) throw error; return data; },
  async update(values) { const allowed = (({ full_name, phone, preferred_communication, dietary_notes }) => ({ full_name, phone, preferred_communication, dietary_notes }))(values); const { data, error } = await requireSupabase().from('profiles').update(allowed).select().single(); if (error) throw error; return data; },
};

export const addressRepository = {
  async list() { const { data, error } = await requireSupabase().from('customer_addresses').select('*').order('is_default', { ascending: false }).order('created_at', { ascending: false }); if (error) throw error; return data; },
  async save(address) { const { data, error } = await requireSupabase().from('customer_addresses').upsert(address).select().single(); if (error) throw error; return data; },
  async remove(id) { const { error } = await requireSupabase().from('customer_addresses').delete().eq('id', id); if (error) throw error; },
};

export const orderRepository = {
  async list({ page = 0, pageSize = 20 } = {}) { const { data, count, error } = await requireSupabase().from('orders').select('*, order_items(*)', { count: 'exact' }).order('created_at', { ascending: false }).range(page * pageSize, page * pageSize + pageSize - 1); if (error) throw error; return { data, count }; },
};

export const enquiryRepository = {
  async submitCatering(payload) { const { data, error } = await requireSupabase().from('catering_enquiries').insert(payload).select('id, status, created_at').single(); if (error) throw error; return data; },
  async submitPartnership(payload) { const { data, error } = await requireSupabase().from('partnership_applications').insert(payload).select('id, status, created_at').single(); if (error) throw error; return data; },
};
