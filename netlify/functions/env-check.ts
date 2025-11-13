// Health check function to verify environment variables presence
// Returns which keys are present (masked) without exposing actual secrets

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

  // Required server environment keys
  const requiredServerKeys = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY', 
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'PRICE_FOUNDING_MEMBER',
    'SITE_BASE_URL'
  ];

  // Required client environment keys
  const requiredClientKeys = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'VITE_STRIPE_PUBLISHABLE_KEY'
  ];

  // Check which keys are present (masked)
  const serverEnvStatus = {};
  const clientEnvStatus = {};
  const missingKeys = [];

  for (const key of requiredServerKeys) {
    const value = process.env[key];
    const isPresent = !!(value && value.trim().length > 0);
    serverEnvStatus[key] = isPresent ? 'present' : 'missing';
    if (!isPresent) {
      missingKeys.push(key);
    }
  }

  for (const key of requiredClientKeys) {
    const value = process.env[key];
    const isPresent = !!(value && value.trim().length > 0);
    clientEnvStatus[key] = isPresent ? 'present' : 'missing';
    if (!isPresent) {
      missingKeys.push(key);
    }
  }

  // Deployment context information
  const deployContext = {
    context: process.env.CONTEXT || 'unknown',
    deployUrl: process.env.DEPLOY_URL || null,
    deployPrimeUrl: process.env.DEPLOY_PRIME_URL || null,
    url: process.env.URL || null,
    siteUrl: process.env.SITE_URL || null,
    branch: process.env.BRANCH || null
  };

  const response = {
    ok: missingKeys.length === 0,
    timestamp: new Date().toISOString(),
    deployContext,
    serverEnv: serverEnvStatus,
    clientEnv: clientEnvStatus,
    missing: missingKeys,
    totalChecked: requiredServerKeys.length + requiredClientKeys.length,
    totalMissing: missingKeys.length
  };

  console.log('[env-check] Environment check completed:', {
    context: deployContext.context,
    missing: missingKeys,
    deployUrl: deployContext.deployUrl
  });

  return jsonResponse(200, response);
};