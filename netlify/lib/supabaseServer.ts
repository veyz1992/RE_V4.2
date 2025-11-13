import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_ANON = process.env.VITE_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const serverClient = createClient(SUPABASE_URL, SUPABASE_ANON, { auth: { persistSession: false } });
export const serviceRoleClient = createClient(SUPABASE_URL, SUPABASE_SERVICE, { auth: { persistSession: false } });