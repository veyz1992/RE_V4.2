import { createClient } from '@supabase/supabase-js';

export function createServerSupabase() {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!SUPABASE_URL || !SUPABASE_SERVICE) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  }
  
  return createClient(SUPABASE_URL, SUPABASE_SERVICE, { 
    auth: { persistSession: false } 
  });
}