import { beforeEach, describe, expect, it, vi } from 'vitest';

const getPublicConfig = vi.fn();
vi.mock('./config', () => ({ getPublicConfig: () => getPublicConfig() }));

const config = {
  publicUrl: 'http://localhost:3210',
  supabaseUrl: 'http://127.0.0.1:54321',
  supabaseAnonKey: 'anon',
  billingEnabled: false,
  googleAuthEnabled: false,
};

describe('loadBabble', () => {
  beforeEach(() => {
    vi.resetModules();
    getPublicConfig.mockReset();
  });

  it('loads the config once and reuses it', async () => {
    getPublicConfig.mockResolvedValue(config);
    const { loadBabble } = await import('./babble');
    const first = await loadBabble();
    expect(await loadBabble()).toBe(first);
    expect(getPublicConfig).toHaveBeenCalledTimes(1);
  });

  it('retries after a failed load instead of caching the failure', async () => {
    getPublicConfig.mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValueOnce(config);
    const { loadBabble } = await import('./babble');
    await expect(loadBabble()).rejects.toThrow('Failed to fetch');
    await expect(loadBabble()).resolves.toMatchObject({ config });
    expect(getPublicConfig).toHaveBeenCalledTimes(2);
  });
});
