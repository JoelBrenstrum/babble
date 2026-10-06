import { describe, expect, it } from 'vitest';
import { ConfigError, parsePublicConfig, parseServerConfig } from './config';

const base = {
  PUBLIC_URL: 'https://babble.fly.dev/',
  SUPABASE_URL: 'https://abc.supabase.co',
  SUPABASE_ANON_KEY: 'anon',
};

describe('parsePublicConfig', () => {
  it('applies defaults', () => {
    expect(parsePublicConfig(base)).toEqual({
      publicUrl: 'https://babble.fly.dev',
      supabaseUrl: 'https://abc.supabase.co',
      supabaseAnonKey: 'anon',
      billingEnabled: false,
      googleAuthEnabled: false,
    });
  });

  it('parses explicit values', () => {
    const config = parsePublicConfig({ ...base, BILLING_ENABLED: 'true', GOOGLE_AUTH_ENABLED: '1' });
    expect(config).toMatchObject({ billingEnabled: true, googleAuthEnabled: true });
  });

  it.each([
    [{ ...base, SUPABASE_URL: undefined }, 'SUPABASE_URL is required'],
    [{ ...base, SUPABASE_ANON_KEY: '  ' }, 'SUPABASE_ANON_KEY is required'],
    [{ ...base, PUBLIC_URL: 'not a url' }, 'PUBLIC_URL must be a valid URL'],
    [{ ...base, BILLING_ENABLED: 'maybe' }, 'BILLING_ENABLED must be true or false'],
  ])('rejects invalid config %#', (env, message) => {
    expect(() => parsePublicConfig(env)).toThrow(ConfigError);
    expect(() => parsePublicConfig(env)).toThrow(message);
  });
});

describe('parseServerConfig', () => {
  it('requires the service role key', () => {
    expect(() => parseServerConfig(base)).toThrow('SUPABASE_SERVICE_ROLE_KEY is required');
    expect(parseServerConfig({ ...base, SUPABASE_SERVICE_ROLE_KEY: 'secret' }).supabaseServiceRoleKey).toBe('secret');
  });
});
