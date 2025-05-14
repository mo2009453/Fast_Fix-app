import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yrzdxresmbqrvpfxzwfv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyemR4cmVzbWJxcnZwZnh6d2Z2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY3MDE2NDMsImV4cCI6MjA2MjI3NzY0M30.-Yf_AEmy8XF0j-t7Xw34mL__3U5FpzJBjv2nWzegetk';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);