import { requireSupabase } from '../lib/supabase';
export async function submitEnquiry(kind, data) { const client=requireSupabase(); const { data:result,error }=await client.functions.invoke('submit-enquiry',{body:{kind,data,idempotencyKey:crypto.randomUUID()}}); if(error)throw error; return result; }
