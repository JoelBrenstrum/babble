import { describe, expect, it } from 'vitest';
import { entryAuthorText } from './entry-author';

const base = {
  createdAt: '2026-10-05T14:12:00Z',
  updatedAt: '2026-10-05T14:12:00Z',
  timeZone: 'Pacific/Auckland',
  imported: false,
};

describe('entryAuthorText', () => {
  it('names who logged it and when', () => {
    expect(entryAuthorText({ ...base, author: 'Jane' })).toBe('Logged by Jane · 6 Oct, 3:12 am');
  });

  it('marks edits made later', () => {
    expect(entryAuthorText({ ...base, author: 'John', updatedAt: '2026-10-05T15:00:00Z' })).toBe(
      'Logged by John · 6 Oct, 3:12 am · edited',
    );
  });

  it('handles imports and members who have left', () => {
    expect(entryAuthorText({ ...base, imported: true })).toBe('Imported · 6 Oct, 3:12 am');
    expect(entryAuthorText({ ...base })).toBe('Logged by a former member · 6 Oct, 3:12 am');
  });
});
