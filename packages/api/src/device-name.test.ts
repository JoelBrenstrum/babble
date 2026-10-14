import { describe, expect, it, vi } from 'vitest';
import { DEVICE_HEADER, deviceHeaderValue, fetchWithDeviceName } from './device-name';

describe('deviceHeaderValue', () => {
  it.each([
    ['Chair', 'Chair'],
    ['  Joel’s  iPhone ', "Joel's iPhone"],
    ['Café tablet', 'Cafe tablet'],
    ['👶 Nursery', 'Nursery'],
    ['   ', null],
    [null, null],
  ])('%j → %j', (input, expected) => expect(deviceHeaderValue(input)).toBe(expected));

  it('keeps names short', () => expect(deviceHeaderValue('x'.repeat(100))).toHaveLength(60));
});

describe('fetchWithDeviceName', () => {
  it('sends the current device name with each request', async () => {
    let name = 'Chair';
    const base = vi.fn(async () => new Response());
    const wrapped = fetchWithDeviceName(() => name, base);
    await wrapped('https://example.test', { headers: { apikey: 'key' } });
    name = 'Nursery';
    await wrapped('https://example.test');
    const sent = base.mock.calls.map((call) => new Headers((call as unknown as [string, RequestInit])[1].headers));
    expect(sent[0]!.get(DEVICE_HEADER)).toBe('Chair');
    expect(sent[0]!.get('apikey')).toBe('key');
    expect(sent[1]!.get(DEVICE_HEADER)).toBe('Nursery');
  });

  it('leaves requests alone without a name', async () => {
    const base = vi.fn(async () => new Response());
    const init = { headers: { apikey: 'key' } };
    await fetchWithDeviceName(() => null, base)('https://example.test', init);
    expect(base).toHaveBeenCalledWith('https://example.test', init);
  });
});
