const read = (key) => import.meta.env[key] || '';

export const clientEnv = Object.freeze({
  supabaseUrl: read('VITE_SUPABASE_URL'),
  supabasePublishableKey: read('VITE_SUPABASE_PUBLISHABLE_KEY'),
  whatsappNumber: read('VITE_WHATSAPP_NUMBER'),
});

export const validateClientEnv = () => {
  const missing = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY'].filter((key) => !read(key));
  return { valid: missing.length === 0, missing };
};
