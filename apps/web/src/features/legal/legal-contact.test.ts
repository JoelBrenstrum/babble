import { describe, expect, it } from 'vitest';
import { legalContact } from './legal-contact';

describe('legalContact', () => {
  it('uses the configured operator and email', () => {
    expect(legalContact({ operatorName: 'Jane Smith', contactEmail: 'jane@example.com' })).toEqual({
      operator: 'Jane Smith',
      email: 'jane@example.com',
    });
  });

  it('falls back when the server has not set them', () => {
    expect(legalContact({ operatorName: null, contactEmail: null })).toEqual({
      operator: 'the people who run this babble server',
      email: null,
    });
  });
});
