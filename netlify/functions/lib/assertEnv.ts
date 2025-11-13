export type EnvCheckResult = {
  ok: boolean;
  missing: string[];
  message?: string;
};

export function checkRequiredEnv(keys: string[]): EnvCheckResult {
  const missing = keys.filter((key) => {
    const value = process.env[key];
    return !value || value.trim().length === 0;
  });

  if (missing.length > 0) {
    const message = `Missing required environment variables: ${missing.join(', ')}`;
    console.error('[assertEnv] ' + message, {
      context: process.env.CONTEXT,
      deployUrl: process.env.DEPLOY_PRIME_URL,
    });
    return { ok: false, missing, message };
  }

  return { ok: true, missing: [] };
}
