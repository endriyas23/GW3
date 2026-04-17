import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseUrl !== 'https://your-project.supabase.co' && supabaseAnonKey && supabaseAnonKey !== 'your-anon-key');

if (!isSupabaseConfigured) {
  console.warn('Supabase credentials missing or using placeholders. Please check your environment variables.');
}

// Use a dummy URL if missing to prevent crash on initialization
const dummyUrl = 'https://placeholder-project.supabase.co';
export const supabase = createClient(supabaseUrl || dummyUrl, supabaseAnonKey || 'dummy-key');
