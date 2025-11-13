// netlify/lib/supabaseServer.ts
import { createClient } from '@supabase/supabase-js';
import { assertEnv } from './assertEnv';

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = assertEnv([
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY'
] as const);

export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});
