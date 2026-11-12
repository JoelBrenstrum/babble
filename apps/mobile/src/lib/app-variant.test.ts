import { appVariant, variantIdentity } from '../../app.config';
import { authRedirect } from './app-variant';

describe('appVariant', () => {
  it.each([
    ['production', 'production'],
    ['development', 'development'],
    [undefined, 'development'],
    ['preview', 'development'],
  ])('%s → %s', (value, expected) => expect(appVariant(value)).toBe(expected));
});

describe('variantIdentity', () => {
  it('gives the dev build its own id and scheme so both install side by side', () => {
    const dev = variantIdentity('development');
    const prod = variantIdentity('production');
    expect(prod).toEqual({ name: 'babble', bundleIdentifier: 'com.brenstrum.babble', scheme: 'babble' });
    expect(dev.bundleIdentifier).toBe('com.brenstrum.babble.dev');
    expect(dev.scheme).toBe('babble-dev');
    expect(dev.name).not.toBe(prod.name);
  });
});

describe('authRedirect', () => {
  it.each([
    ['babble', 'babble://auth/callback'],
    ['babble-dev', 'babble-dev://auth/callback'],
    [['babble-dev', 'other'], 'babble-dev://auth/callback'],
    [undefined, 'babble://auth/callback'],
  ])('%j → %s', (scheme, expected) => expect(authRedirect(scheme)).toBe(expected));
});
