const REQUIRED_ENV_KEYS = [
  'STRIPE_SECRET_KEY',
  'PRICE_ID_FOUNDING_MEMBER',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
] as const;

type RequiredEnvKey = (typeof REQUIRED_ENV_KEYS)[number];
type RequiredEnvMap = Record<RequiredEnvKey, string>;

let cachedEnv: RequiredEnvMap | null = null;

const collectEnv = (): RequiredEnvMap => {
  const missing = REQUIRED_ENV_KEYS.filter(key => {
    const value = process.env[key];
    return typeof value !== 'string' || value.trim().length === 0;
  });

  if (missing.length > 0) {
    throw new Error(
      `[assertEnv] Missing required environment variables: ${missing.join(', ')}`,
    );
  }

  return REQUIRED_ENV_KEYS.reduce((acc, key) => {
    acc[key] = process.env[key] as string;
    return acc;
  }, {} as RequiredEnvMap);
};

export function assertEnv(): RequiredEnvMap {
  if (!cachedEnv) {
    cachedEnv = collectEnv();
  }

  return cachedEnv;
}

export const requiredEnv: RequiredEnvMap = new Proxy({} as RequiredEnvMap, {
  get: (_target, prop: string) => {
    const env = assertEnv();
    return env[prop as RequiredEnvKey];
  },
  ownKeys: () => REQUIRED_ENV_KEYS.slice(),
  getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }),
});

export const requiredEnvKeys = REQUIRED_ENV_KEYS.slice();
