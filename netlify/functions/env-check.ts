import type { Handler } from '@netlify/functions';
import { assertEnv, requiredEnvKeys } from '../lib/assertEnv';

const json = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export const handler: Handler = async () => {
  try {
    const env = assertEnv();
    return json(200, {
      ok: true,
      visible: Object.fromEntries(requiredEnvKeys.map(key => [key, Boolean(env[key])])),
    });
  } catch (error: any) {
    const visibility = Object.fromEntries(
      requiredEnvKeys.map(key => [key, Boolean(process.env[key])]),
    );

    return json(500, {
      ok: false,
      error: error?.message ?? 'Unknown error',
      visible: visibility,
    });
  }
};
