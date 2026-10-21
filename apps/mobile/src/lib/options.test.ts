import { labelOptions } from './options';

describe('labelOptions', () => {
  it('keeps the given keys in order with their labels', () => {
    const labels = { a: 'Ay', b: 'Bee', c: 'See' };
    expect(labelOptions(labels, ['c', 'a'])).toEqual([
      { value: 'c', label: 'See' },
      { value: 'a', label: 'Ay' },
    ]);
  });
});
