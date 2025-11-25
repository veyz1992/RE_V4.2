import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { assertEnv } from './assertEnv';

let supabase: SupabaseClient | null = null;
let supabaseAdmin: SupabaseClient | null = null;

const getEnv = () => {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = assertEnv();
  return { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY };
};

export const getSupabaseClient = (): SupabaseClient => {
  if (!supabase) {
    const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = getEnv();
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  return supabase;
};

export const getSupabaseAdminClient = (): SupabaseClient => {
  if (!supabaseAdmin) {
    const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = getEnv();
    supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  return supabaseAdmin;
};
