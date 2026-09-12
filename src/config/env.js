// Public Supabase client configuration. VITE_ values override these defaults at build time.
const publicProjectDefaults = Object.freeze({
  VITE_SUPABASE_URL: 'https://xcfcngpjmkdylemgalbb.supabase.co',
  VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_8nmtasRYj0m6VISAXy8Qtw_KZQcQ5hG',
});

const read = (key) => import.meta.env[key] || publicProjectDefaults[key] || '';

export const clientEnv = Object.freeze({
  supabaseUrl: read('VITE_SUPABASE_URL'),
  supabasePublishableKey: read('VITE_SUPABASE_PUBLISHABLE_KEY'),
  whatsappNumber: read('VITE_WHATSAPP_NUMBER'),
});

export const validateClientEnv = () => {
  const missing = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY'].filter((key) => !read(key));
  const invalid = [];
  try { const url = new URL(clientEnv.supabaseUrl); if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) invalid.push('VITE_SUPABASE_URL'); } catch { invalid.push('VITE_SUPABASE_URL'); }
  if (!(clientEnv.supabasePublishableKey.startsWith('sb_publishable_') || clientEnv.supabasePublishableKey.startsWith('eyJ'))) invalid.push('VITE_SUPABASE_PUBLISHABLE_KEY');
  return { valid: missing.length === 0 && invalid.length === 0, missing, invalid };
};
