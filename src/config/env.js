// The publishable client configuration is safe to expose in browser code and
// keeps the hosted Vite build usable when Vercel has not yet received its
// project environment variables. Explicit VITE_ values always take precedence.
const publicProjectDefaults = Object.freeze({
  VITE_SUPABASE_URL: 'https://nmxrxcmlsjqottedtqop.supabase.co',
  VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_h7HKaBnkpXlIAMpCP55Tqg_BqA6qCjZ',
});

const read = (key) => import.meta.env[key] || publicProjectDefaults[key] || '';

export const clientEnv = Object.freeze({
  supabaseUrl: read('VITE_SUPABASE_URL'),
  supabasePublishableKey: read('VITE_SUPABASE_PUBLISHABLE_KEY'),
  whatsappNumber: read('VITE_WHATSAPP_NUMBER'),
});

export const isValidSupabaseUrl = (value) => {
  try {
    const parsed = new URL(value);
    return ['http:', 'https:'].includes(parsed.protocol) && Boolean(parsed.hostname) && !parsed.username && !parsed.password;
  } catch {
    return false;
  }
};

export const isPublicSupabaseKey = (value) => value.startsWith('sb_publishable_') || value.startsWith('eyJ');

export const validateClientEnv = () => {
  const missing = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY'].filter((key) => !read(key));
  const invalid = [];
  if (!missing.includes('VITE_SUPABASE_URL') && !isValidSupabaseUrl(clientEnv.supabaseUrl)) invalid.push('VITE_SUPABASE_URL');
  if (!missing.includes('VITE_SUPABASE_PUBLISHABLE_KEY') && !isPublicSupabaseKey(clientEnv.supabasePublishableKey)) invalid.push('VITE_SUPABASE_PUBLISHABLE_KEY');
  return { valid: missing.length === 0 && invalid.length === 0, missing, invalid };
};
