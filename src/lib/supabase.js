import { createClient } from '@supabase/supabase-js';
import { clientEnv, validateClientEnv } from '../config/env';

const { supabaseUrl: url, supabasePublishableKey: publishableKey } = clientEnv;
const clientConfig = validateClientEnv();

// Keep the client optional during local UI development, but never fake a backend response.
export const supabase = clientConfig.valid ? createClient(url, publishableKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }) : null;

export const requireSupabase = () => {
  if (!supabase) throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.');
  return supabase;
};
