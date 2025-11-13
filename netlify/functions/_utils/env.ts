// Environment validation for serverless functions
// All functions must use process.env, never import.meta.env or VITE_

export interface ServerEnv {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  STRIPE_SECRET_KEY: string;
  PRICE_FOUNDING_MEMBER: string;
}

function validateEnv(): ServerEnv {
  const required = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY', 
    'STRIPE_SECRET_KEY',
    'PRICE_FOUNDING_MEMBER'
  ] as const;

  const missing: string[] = [];
  const env: Partial<ServerEnv> = {};

  for (const key of required) {
    const value = process.env[key];
    if (!value || value.trim().length === 0) {
      missing.push(key);
    } else {
      env[key] = value;
    }
  }

  if (missing.length > 0) {
    const message = `Missing required environment variables: ${missing.join(', ')}`;
    console.error('[env] ' + message);
    throw new Error(message);
  }

  return env as ServerEnv;
}

// Validate at import time
export const serverEnv = validateEnv();

console.log('[env] Server environment validated:', {
  hasSupabase: !!serverEnv.SUPABASE_URL,
  hasStripe: !!serverEnv.STRIPE_SECRET_KEY,
  hasPricing: !!serverEnv.PRICE_FOUNDING_MEMBER
});