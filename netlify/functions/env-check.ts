import type { Handler } from '@netlify/functions';
import { assertEnv } from '../lib/assertEnv';

export const handler: Handler = async () => {
  try {
    const vars = assertEnv([
      'SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'STRIPE_SECRET_KEY',
      'PRICE_ID_FOUNDING_MEMBER'
    ] as const);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true, present: Object.keys(vars) })
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: error?.message ?? 'Unknown error' })
    };
  }
};
