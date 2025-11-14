import { createClient } from '@supabase/supabase-js';
import { assertEnv } from './assertEnv';

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = assertEnv();

export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

export const supabaseAdmin = supabase;
