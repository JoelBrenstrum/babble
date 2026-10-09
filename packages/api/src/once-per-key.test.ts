import { describe, expect, it, vi } from 'vitest';
import { oncePerKey } from './once-per-key';

describe('oncePerKey', () => {
  it('shares one call per key', async () => {
    const create = vi.fn(async (key: string) => `invite for ${key}`);
    const once = oncePerKey(create);
    expect(await Promise.all([once('a'), once('a'), once('b')])).toEqual([
      'invite for a',
      'invite for a',
      'invite for b',
    ]);
    expect(create).toHaveBeenCalledTimes(2);
  });

  it('tries again after a failure', async () => {
    const create = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce('ok');
    const once = oncePerKey(create);
    await expect(once('a')).rejects.toThrow('offline');
    expect(await once('a')).toBe('ok');
  });
});
