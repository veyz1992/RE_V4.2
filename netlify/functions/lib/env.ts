export function getEnv(keys: string[]) {
  const missing: string[] = [];
  const out: Record<string,string> = {};
  for (const k of keys) { 
    const v = process.env[k]; 
    if (!v) missing.push(k); 
    else out[k] = v; 
  }
  return { ok: missing.length === 0, missing, values: out };
}