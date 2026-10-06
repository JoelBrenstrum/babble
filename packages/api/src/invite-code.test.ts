import { describe, expect, it } from 'vitest';
import { isValidInviteCode, normalizeInviteCode } from './invite-code';

describe('normalizeInviteCode', () => {
  it.each([
    ['K7Q-4MD', 'K7Q-4MD'],
    ['k7q4md', 'K7Q-4MD'],
    [' k7q 4md ', 'K7Q-4MD'],
    ['K7Q', 'K7Q'],
  ])('%j → %j', (input, expected) => expect(normalizeInviteCode(input)).toBe(expected));
});

describe('isValidInviteCode', () => {
  it.each([
    ['K7Q-4MD', true],
    ['k7q4md', true],
    ['K7Q-4M', false],
    ['K7Q-4M0', false],
    ['I1O-ABC', false],
  ])('%j → %s', (input, expected) => expect(isValidInviteCode(input)).toBe(expected));
});
