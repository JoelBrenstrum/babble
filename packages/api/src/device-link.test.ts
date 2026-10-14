import { describe, expect, it } from 'vitest';
import {
  browserDeviceName,
  deviceLabel,
  deviceLinkUrl,
  formatDeviceLinkCode,
  isValidDeviceLinkCode,
  newDeviceLinkCode,
  newDeviceLinkSecret,
  normalizeDeviceLinkCode,
} from './device-link';

describe('newDeviceLinkCode', () => {
  it('makes eight characters from the unambiguous alphabet', () => {
    for (let index = 0; index < 50; index++) expect(isValidDeviceLinkCode(newDeviceLinkCode())).toBe(true);
  });

  it('maps every byte into the alphabet', () => {
    expect(newDeviceLinkCode((length) => new Uint8Array(length).fill(255))).toBe('ZZZZZZZZ');
    expect(newDeviceLinkCode((length) => new Uint8Array(length))).toBe('22222222');
  });
});

describe('newDeviceLinkSecret', () => {
  it('is 64 hex characters', () => expect(newDeviceLinkSecret()).toMatch(/^[0-9a-f]{64}$/));
});

describe('device link codes', () => {
  it.each([
    ['kx7m-42pq', 'KX7M42PQ'],
    [' KX7M 42PQ ', 'KX7M42PQ'],
  ])('normalises %j', (input, expected) => expect(normalizeDeviceLinkCode(input)).toBe(expected));

  it('rejects codes with ambiguous or missing characters', () => {
    expect(isValidDeviceLinkCode('KX7M42P0')).toBe(false);
    expect(isValidDeviceLinkCode('KX7M42I2')).toBe(false);
    expect(isValidDeviceLinkCode('KX7M42')).toBe(false);
  });

  it('formats in two halves', () => {
    expect(formatDeviceLinkCode('kx7m42pq')).toBe('KX7M-42PQ');
    expect(formatDeviceLinkCode('KX7')).toBe('KX7');
  });

  it('links to the approval page', () => {
    expect(deviceLinkUrl('https://babble.example', 'kx7m-42pq')).toBe('https://babble.example/link/KX7M42PQ');
  });
});

describe('deviceLabel', () => {
  it.each([
    [
      'Mozilla/5.0 (X11; Linux aarch64) AppleWebKit/537.36 (KHTML, like Gecko) Chromium/126.0.0.0 Chrome/126.0.0.0 Safari/537.36',
      'Chromium on Linux',
    ],
    [
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
      'Safari on iPhone',
    ],
    [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.0.0',
      'Edge on Mac',
    ],
    ['Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0', 'Firefox on Windows'],
    [
      'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36',
      'Chrome on Android',
    ],
    ['curl/8.0', 'A web browser'],
    [null, 'A web browser'],
  ])('%s → %s', (agent, expected) => expect(deviceLabel(agent)).toBe(expected));
});

describe('browserDeviceName', () => {
  it('names the device first so it reads well after "on"', () => {
    expect(
      browserDeviceName(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/129.0 Safari/537.36',
      ),
    ).toBe('Mac (Chrome)');
    expect(browserDeviceName('Mozilla/5.0 (X11; Linux aarch64) Chromium/126.0 Chrome/126.0 Safari/537.36')).toBe(
      'Linux (Chromium)',
    );
    expect(browserDeviceName('curl/8.0')).toBe('Web browser');
  });
});
