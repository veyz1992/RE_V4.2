import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

console.log('[Supabase config]', {
  supabaseUrl: JSON.stringify(supabaseUrl),
  anonKeyLength: supabaseAnonKey ? supabaseAnonKey.length : 0,
});

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase env vars', {
    supabaseUrl,
    supabaseAnonKeyPresent: !!supabaseAnonKey,
  });
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
