import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bcxeoisgixdlccgsquet.supabase.co';
const supabaseAnonKey = 'sb_publishable_bwQ6KqFkEzfCA3DCF9vrVg_gEinECLK';
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// دالة آمنة لاستدعاء RPC
export const safeRpc = async (functionName, params = {}) => {
  if (supabase && typeof supabase.rpc === 'function') {
    try {
      return await supabase.rpc(functionName, params);
    } catch (error) {
      console.warn(`RPC call to "${functionName}" failed:`, error);
      return null;
    }
  }
  return null;
};