// Health check function to verify environment variables presence
// Returns which keys are present (masked) without exposing actual secrets

import { getEnv } from './lib/env.js';

const jsonResponse = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
  },
  body: JSON.stringify(body),
});

export const handler = async (event: any) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return jsonResponse(200, { ok: true });
  }

  if (event.httpMethod !== 'GET') {
    return jsonResponse(405, { error: 'Method Not Allowed' });
  }

  // Required keys for dev3
  const requiredKeys = [
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "PRICE_ID_FOUNDING_MEMBER",
    "STRIPE_PRICE_FOUNDING_MEMBER"
  ];

  // Use getEnv helper
  const envCheck = getEnv(requiredKeys);

  // Deployment context information
  const deployContext = {
    context: process.env.CONTEXT || 'unknown',
    deployUrl: process.env.DEPLOY_URL || null,
    deployPrimeUrl: process.env.DEPLOY_PRIME_URL || null,
    url: process.env.URL || null,
    siteUrl: process.env.SITE_URL || null,
    branch: process.env.BRANCH || null
  };

  // Build status for each key
  const keyStatus = {};
  for (const key of requiredKeys) {
    const value = process.env[key];
    keyStatus[key] = !!(value && value.trim().length > 0) ? 'present' : 'missing';
  }

  const response = {
    ok: envCheck.ok,
    missing: envCheck.missing,
    timestamp: new Date().toISOString(),
    deployContext,
    keyStatus,
    totalChecked: requiredKeys.length,
    totalMissing: envCheck.missing.length
  };

  console.log('[env-check] Environment check completed:', {
    context: deployContext.context,
    missing: envCheck.missing,
    deployUrl: deployContext.deployUrl
  });

  return jsonResponse(200, response);
};