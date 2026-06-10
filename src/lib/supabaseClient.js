import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bcxeoisgixdlccgsquet.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjeGVvaXNnaXhkbGNjZ3NxdWV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5MzY3NzksImV4cCI6MjA5NjUxMjc3OX0.SADGItfMWy1cQJUuJS7B0gVnvvuU276o8_XCjGixWxM';
export const supabase = createClient(supabaseUrl, supabaseAnonKey);