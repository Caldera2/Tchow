import { requireSupabase } from '../lib/supabase';
export async function loadAdminOverview() { const client=requireSupabase(); const {data,error}=await client.functions.invoke('admin-overview',{body:{}}); if(error)throw error; return data; }
