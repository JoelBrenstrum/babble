import { describe, expect, it } from 'vitest';
import { parseDecimalInput, sanitizeDecimalInput } from './decimal-input';

describe('sanitizeDecimalInput', () => {
  it.each([
    ['3.95', '3.95'],
    ['3,95', '3.95'],
    ['3.9kg', '3.9'],
    ['abc', ''],
    ['3.9.5', '3.95'],
    ['3.987', '3.98'],
    ['.5', '.5'],
    ['-2', '2'],
    ['', ''],
  ])('%j → %j', (input, expected) => expect(sanitizeDecimalInput(input)).toBe(expected));

  it('respects a custom number of decimals', () => {
    expect(sanitizeDecimalInput('51.25', 1)).toBe('51.2');
  });
});

describe('parseDecimalInput', () => {
  it.each([
    ['3.95', 3.95],
    ['.5', 0.5],
    ['', null],
    ['.', null],
  ])('%j → %j', (input, expected) => expect(parseDecimalInput(input)).toBe(expected));
});
