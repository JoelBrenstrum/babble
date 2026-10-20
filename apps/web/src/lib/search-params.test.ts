import { describe, expect, it } from 'vitest';
import { parseBooleanParam, parseOptionParam } from './search-params';

describe('parseBooleanParam', () => {
  it.each([true, 'true', 1, '1'])('accepts %j', (value) => {
    expect(parseBooleanParam(value)).toBe(true);
  });

  it.each([false, 'false', 0, '0', '', 'yes', null, undefined, {}])('leaves %j unset', (value) => {
    expect(parseBooleanParam(value)).toBeUndefined();
  });
});

describe('parseOptionParam', () => {
  const views = ['day', '24h', '7d'] as const;

  it('returns a listed option', () => {
    expect(parseOptionParam('24h', views)).toBe('24h');
  });

  it.each(['week', '', 24, null, undefined, ['day']])('leaves %j unset', (value) => {
    expect(parseOptionParam(value, views)).toBeUndefined();
  });
});
