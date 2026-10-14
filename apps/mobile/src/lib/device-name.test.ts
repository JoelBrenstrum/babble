import { currentDeviceName, loadDeviceName, platformDeviceName, saveDeviceName } from './device-name';

describe('platformDeviceName', () => {
  it.each([
    [{ os: 'ios', constants: { interfaceIdiom: 'phone' } }, 'iPhone'],
    [{ os: 'ios', constants: { interfaceIdiom: 'pad' } }, 'iPad'],
    [{ os: 'android', constants: { Brand: 'google', Model: 'Pixel 7' } }, 'Google Pixel 7'],
    [{ os: 'android', constants: { Brand: 'samsung', Model: 'SM-S918B' } }, 'Samsung SM-S918B'],
    [{ os: 'android', constants: { Brand: 'OnePlus', Model: 'OnePlus 12' } }, 'OnePlus 12'],
    [{ os: 'android', constants: {} }, 'Android'],
  ])('%j → %s', (info, expected) => expect(platformDeviceName(info)).toBe(expected));
});

describe('saved device name', () => {
  it('is used once saved and survives a reload', async () => {
    await saveDeviceName('Nursery phone');
    expect(currentDeviceName()).toBe('Nursery phone');
    await saveDeviceName('');
    expect(await loadDeviceName()).toBe('');
    await saveDeviceName('Chair');
    expect(await loadDeviceName()).toBe('Chair');
  });
});
