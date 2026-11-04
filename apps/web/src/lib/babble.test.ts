import { beforeEach, describe, expect, it, vi } from 'vitest';

const getPublicConfig = vi.fn();
vi.mock('./config', () => ({ getPublicConfig: () => getPublicConfig() }));

const config = {
  publicUrl: 'http://localhost:3210',
  supabaseUrl: 'http://127.0.0.1:54321',
  supabaseAnonKey: 'anon',
  billingEnabled: false,
  googleAuthEnabled: false,
  deviceSignInEnabled: false,
  operatorName: null,
  contactEmail: null,
};

describe('loadBabble', () => {
  beforeEach(() => {
    vi.resetModules();
    getPublicConfig.mockReset();
    window.localStorage.clear();
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

  it('starts from the saved config without waiting on the server, then saves the fresh one', async () => {
    window.localStorage.setItem('babble.publicConfig', JSON.stringify(config));
    const fresh = { ...config, billingEnabled: true };
    let respond: (value: typeof config) => void = () => undefined;
    getPublicConfig.mockReturnValue(new Promise((resolve) => (respond = resolve)));
    const { loadBabble } = await import('./babble');
    await expect(loadBabble()).resolves.toMatchObject({ config });
    respond(fresh);
    await vi.waitFor(() => expect(JSON.parse(window.localStorage.getItem('babble.publicConfig')!)).toEqual(fresh));
    expect(getPublicConfig).toHaveBeenCalledTimes(1);
  });

  it('saves the config it waited for', async () => {
    getPublicConfig.mockResolvedValue(config);
    const { loadBabble } = await import('./babble');
    await loadBabble();
    expect(JSON.parse(window.localStorage.getItem('babble.publicConfig')!)).toEqual(config);
  });
});

describe('parseSavedConfig', () => {
  it('ignores missing, corrupt or incomplete saved config', async () => {
    const { parseSavedConfig } = await import('./babble');
    expect(parseSavedConfig(null)).toBeNull();
    expect(parseSavedConfig('{nope')).toBeNull();
    expect(parseSavedConfig('null')).toBeNull();
    expect(parseSavedConfig(JSON.stringify({ supabaseUrl: 'x' }))).toBeNull();
    expect(parseSavedConfig(JSON.stringify(config))).toEqual(config);
  });
});
