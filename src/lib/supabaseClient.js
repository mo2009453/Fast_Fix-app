import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bcxeoisgixdlccgsquet.supabase.co';
const supabaseAnonKey = 'sb_publishable_bwQ6KqFkEzfCA3DCF9vrVg_gEinECLK';
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
