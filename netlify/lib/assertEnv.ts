// netlify/lib/assertEnv.ts
export function assertEnv<T extends string>(keys: readonly T[]): Record<T, string> {
  const missing = keys.filter(key => {
    const value = process.env[key];
    return typeof value !== 'string' || value.length === 0;
  });

  if (missing.length > 0) {
    throw new Error(`Missing env vars: ${missing.join(', ')}`);
  }

  return Object.fromEntries(keys.map(key => [key, process.env[key] as string])) as Record<T, string>;
}
