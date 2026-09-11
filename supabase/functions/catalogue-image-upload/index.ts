import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authorizeStaff, authorizationResponse } from '../_shared/authorize-staff.ts';

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, idempotency-key', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
const extensions = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const validMagic = (type: string, bytes: Uint8Array) => type === 'image/jpeg' ? bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff : type === 'image/png' ? bytes.slice(0, 8).every((value, index) => value === [137, 80, 78, 71, 13, 10, 26, 10][index]) : type === 'image/webp' ? new TextDecoder().decode(bytes.slice(0, 4)) === 'RIFF' && new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP' : false;

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: { code: 'method_not_allowed', message: 'Use POST.' } }, 405);
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return json({ error: { code: 'not_configured', message: 'Image service is not configured.' } }, 503);
  const admin = createClient(url, key, { auth: { persistSession: false } });
  const authorization = await authorizeStaff(request, admin, 'manage_menu');
  if ('error' in authorization) return authorizationResponse(authorization, json);
  let form: FormData;
  try { form = await request.formData(); } catch { return json({ error: { code: 'invalid_multipart', message: 'Send a multipart image upload.' } }, 400); }
  const productId = String(form.get('product_id') || '');
  const altText = String(form.get('alt_text') || '').trim();
  const replaceImageId = String(form.get('replace_image_id') || '').trim();
  const file = form.get('file');
  if (!productId || !altText || !(file instanceof File)) return json({ error: { code: 'invalid_upload', message: 'Product, alt text, and image are required.' } }, 422);
  if (file.size < 1 || file.size > 5 * 1024 * 1024 || !extensions[file.type as keyof typeof extensions]) return json({ error: { code: 'invalid_file', message: 'Use a JPEG, PNG, or WebP image up to 5 MB.' } }, 422);
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!validMagic(file.type, bytes)) return json({ error: { code: 'invalid_file_type', message: 'The uploaded bytes do not match the declared image type.' } }, 422);
  const { data: product } = await admin.from('products').select('id,status').eq('id', productId).maybeSingle();
  if (!product || product.status === 'archived') return json({ error: { code: 'product_not_editable', message: 'That product cannot receive images.' } }, 409);
  const path = `${productId}/${crypto.randomUUID()}.${extensions[file.type as keyof typeof extensions]}`;
  const upload = await admin.storage.from('catalogue-images').upload(path, bytes, { contentType: file.type, cacheControl: '31536000', upsert: false });
  if (upload.error) return json({ error: { code: 'upload_failed', message: 'The image could not be stored.' } }, 500);
  let oldPath: string | null = null;
  if (replaceImageId) {
    const { data: oldImage } = await admin.from('product_images').select('id,storage_path').eq('id', replaceImageId).eq('product_id', productId).maybeSingle();
    if (!oldImage) { await admin.storage.from('catalogue-images').remove([path]); return json({ error: { code: 'image_not_found', message: 'The image to replace was not found.' } }, 404); }
    oldPath = oldImage.storage_path;
    const { error } = await admin.from('product_images').update({ storage_path: path, alt_text: altText }).eq('id', replaceImageId);
    if (error) { await admin.storage.from('catalogue-images').remove([path]); return json({ error: { code: 'image_record_failed', message: 'The image record could not be updated.' } }, 500); }
  } else {
    const { error } = await admin.from('product_images').insert({ product_id: productId, storage_path: path, alt_text: altText, sort_order: 0 });
    if (error) { await admin.storage.from('catalogue-images').remove([path]); return json({ error: { code: 'image_record_failed', message: 'The image record could not be created.' } }, 500); }
  }
  if (oldPath) { const { count } = await admin.from('product_images').select('id', { count: 'exact', head: true }).eq('storage_path', oldPath); if (!count) await admin.storage.from('catalogue-images').remove([oldPath]); }
  return json({ image: { product_id: productId, storage_path: path, alt_text: altText }, replaced: Boolean(replaceImageId) });
});
