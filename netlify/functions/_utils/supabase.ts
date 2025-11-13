import { createClient } from '@supabase/supabase-js';
import { serverEnv } from './env.js';

// Server-side Supabase client using service role key
// Never use anon key on the server, auth.persistSession=false
export const supabaseServer = createClient(
  serverEnv.SUPABASE_URL,
  serverEnv.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
);

console.log('[supabase] Server client initialized with service role');