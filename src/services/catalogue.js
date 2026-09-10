import { requireSupabase } from '../lib/supabase';
import { invokeFunction } from './api';

const escapeFilter = (value) => String(value || '').replace(/[%_,]/g, (match) => `\\${match}`);
const pageRange = (page, pageSize) => [page * pageSize, page * pageSize + pageSize - 1];
export async function catalogueImageUrl(path) { if (!path) return ''; const { data, error } = await requireSupabase().storage.from('catalogue-images').createSignedUrl(path, 3600); if (error) throw error; return data.signedUrl; }
export async function hydrateCatalogueImages(items = []) { return Promise.all(items.map(async (item) => ({ ...item, imageUrl: (item.product_images || []).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))[0] ? await catalogueImageUrl((item.product_images || []).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))[0].storage_path) : '' }))); }

export async function listPublishedProducts({ page = 0, pageSize = 12, categoryId, search = '', sort = 'newest' } = {}) {
  const client = requireSupabase();
  let query = client.from('products').select('id,legacy_key,name,description,price_kobo,currency,preparation_minutes,tags,dietary_information,category_id,categories(name,slug),product_images(id,storage_path,alt_text,sort_order,is_primary)', { count: 'exact' }).eq('status', 'published');
  if (categoryId) query = query.eq('category_id', categoryId);
  if (search.trim()) query = query.or(`name.ilike.%${escapeFilter(search.trim())}%,description.ilike.%${escapeFilter(search.trim())}%`);
  if (sort === 'price-low') query = query.order('price_kobo', { ascending: true });
  else if (sort === 'price-high') query = query.order('price_kobo', { ascending: false });
  else query = query.order('created_at', { ascending: false });
  const [from, to] = pageRange(page, pageSize);
  const { data, count, error } = await query.range(from, to);
  if (error) throw error;
  return { data: await hydrateCatalogueImages(data || []), count: count || 0, page, pageSize };
}

export async function getPublishedProduct(productId) {
  const { data, error } = await requireSupabase().from('products').select('id,legacy_key,name,description,price_kobo,currency,preparation_minutes,tags,dietary_information,category_id,categories(name,slug),product_images(id,storage_path,alt_text,sort_order,is_primary)').eq('id', productId).eq('status', 'published').maybeSingle();
  if (error) throw error;
  return data ? (await hydrateCatalogueImages([data]))[0] : null;
}

export async function listRelatedProducts(categoryId, productId, limit = 4) {
  const { data, error } = await requireSupabase().from('products').select('id,name,description,price_kobo,currency,preparation_minutes,tags,product_images(id,storage_path,alt_text,sort_order,is_primary)').eq('category_id', categoryId).eq('status', 'published').neq('id', productId).order('created_at', { ascending: false }).limit(limit);
  if (error) throw error;
  return hydrateCatalogueImages(data || []);
}

export async function listAdminProducts({ page = 0, pageSize = 24, search = '', status, categoryId } = {}) {
  let query = requireSupabase().from('products').select('*,categories(name,slug),product_images(*)', { count: 'exact' });
  if (status) query = query.eq('status', status);
  if (categoryId) query = query.eq('category_id', categoryId);
  if (search.trim()) query = query.or(`name.ilike.%${escapeFilter(search.trim())}%,legacy_key.ilike.%${escapeFilter(search.trim())}%`);
  const [from, to] = pageRange(page, pageSize);
  const { data, count, error } = await query.order('created_at', { ascending: false }).range(from, to);
  if (error) throw error;
  return { data: data || [], count: count || 0, page, pageSize };
}

export async function createProduct(payload) { const { data, error } = await requireSupabase().from('products').insert({ ...payload, status: 'draft', currency: 'NGN' }).select().single(); if (error) throw error; return data; }
export async function updateProduct(id, payload) { const { data, error } = await requireSupabase().from('products').update(payload).eq('id', id).select().single(); if (error) throw error; return data; }
export async function deleteProduct(id) { const { error } = await requireSupabase().from('products').delete().eq('id', id); if (error) throw error; }
export async function changeProductStatus(id, status) { return updateProduct(id, { status }); }
export async function setProductAvailability(id, available) { return updateProduct(id, { is_available: available }); }
export async function uploadProductImage({ productId, file, altText, replaceImageId }) { const form = new FormData(); form.append('product_id', productId); form.append('alt_text', altText); if (replaceImageId) form.append('replace_image_id', replaceImageId); form.append('file', file); return invokeFunction('catalogue-image-upload', form); }

export async function listPublishedBoxConfigurations() { const { data, error } = await requireSupabase().from('box_sizes').select('id,name,description,serving_note,base_price_kobo,currency,configuration_version,snack_allowance,drink_allowance,dessert_allowance,box_components(id,product_id,component_type,min_quantity,max_quantity,required,products(id,name,description,price_kobo,currency,product_images(storage_path,alt_text,sort_order))),box_pricing_rules(component_type,included_quantity,extra_unit_price_kobo)').eq('status', 'published').order('base_price_kobo'); if (error) throw error; return data || []; }
export async function quoteBox(configuration) { return invokeFunction('quote-box', configuration); }
