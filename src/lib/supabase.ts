import { createClient } from '@supabase/supabase-js';

// Read from env vars if available, otherwise allow runtime configuration
let supabaseUrl = import.meta.env.VITE_SUPABASE_URL || localStorage.getItem('supabase_url') || '';
let supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || localStorage.getItem('supabase_key') || '';

export let supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

export const configureSupabase = (url: string, key: string) => {
  localStorage.setItem('supabase_url', url);
  localStorage.setItem('supabase_key', key);
  supabaseUrl = url;
  supabaseAnonKey = key;
  supabase = createClient(url, key);
};

export const hasSupabaseConfig = () => !!(supabaseUrl && supabaseAnonKey);
