export interface PublicConfig {
  publicUrl: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  billingEnabled: boolean;
  googleAuthEnabled: boolean;
}

export interface ServerConfig extends PublicConfig {
  supabaseServiceRoleKey: string;
}

export class ConfigError extends Error {}

type Env = Record<string, string | undefined>;

export function parsePublicConfig(env: Env): PublicConfig {
  return {
    publicUrl: requireUrl(env, 'PUBLIC_URL'),
    supabaseUrl: requireUrl(env, 'SUPABASE_URL'),
    supabaseAnonKey: requireString(env, 'SUPABASE_ANON_KEY'),
    billingEnabled: parseBoolean(env, 'BILLING_ENABLED', false),
    googleAuthEnabled: parseBoolean(env, 'GOOGLE_AUTH_ENABLED', false),
  };
}

export function parseServerConfig(env: Env): ServerConfig {
  return {
    ...parsePublicConfig(env),
    supabaseServiceRoleKey: requireString(env, 'SUPABASE_SERVICE_ROLE_KEY'),
  };
}

function requireString(env: Env, name: string): string {
  const value = env[name]?.trim();
  if (!value) throw new ConfigError(`${name} is required`);
  return value;
}

function requireUrl(env: Env, name: string): string {
  const value = requireString(env, name);
  try {
    return new URL(value).toString().replace(/\/$/, '');
  } catch {
    throw new ConfigError(`${name} must be a valid URL, got "${value}"`);
  }
}

function parseBoolean(env: Env, name: string, fallback: boolean): boolean {
  const value = env[name]?.trim().toLowerCase();
  if (value === undefined || value === '') return fallback;
  if (['true', '1', 'yes'].includes(value)) return true;
  if (['false', '0', 'no'].includes(value)) return false;
  throw new ConfigError(`${name} must be true or false, got "${env[name]}"`);
}
