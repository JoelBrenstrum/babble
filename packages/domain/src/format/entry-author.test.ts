import { describe, expect, it } from 'vitest';
import { entryAuthorText, entryEndedText } from './entry-author';

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

  it('names the device it was logged on', () => {
    expect(entryAuthorText({ ...base, author: 'Joel', device: 'Chair' })).toBe(
      'Logged by Joel on Chair · 6 Oct, 3:12 am',
    );
    expect(entryAuthorText({ ...base, imported: true, device: 'Chair' })).toBe('Imported · 6 Oct, 3:12 am');
  });

  it('marks edits made later', () => {
    expect(entryAuthorText({ ...base, author: 'John', updatedAt: '2026-10-05T15:00:00Z' })).toBe(
      'Logged by John · 6 Oct, 3:12 am · edited',
    );
  });

  it('says who started a timer', () => {
    expect(entryAuthorText({ ...base, author: 'Jane', timer: true })).toBe('Started by Jane · 6 Oct, 3:12 am');
  });

  it('handles imports and members who have left', () => {
    expect(entryAuthorText({ ...base, imported: true })).toBe('Imported · 6 Oct, 3:12 am');
    expect(entryAuthorText({ ...base })).toBe('Logged by a former member · 6 Oct, 3:12 am');
  });
});

describe('entryEndedText', () => {
  const ended = { timeZone: 'Pacific/Auckland' };

  it('names who pressed stop, where, and when', () => {
    expect(entryEndedText({ ...ended, endedBy: 'John', endRecordedAt: '2026-10-05T15:32:00Z' })).toBe(
      'Ended by John · 6 Oct, 4:32 am',
    );
    expect(entryEndedText({ ...ended, endedBy: 'Jane', device: 'Chair', endRecordedAt: '2026-10-06T11:05:00Z' })).toBe(
      'Ended by Jane on Chair · 7 Oct, 12:05 am',
    );
  });

  it('has nothing for entries that were never stopped, and handles members who left', () => {
    expect(entryEndedText({ ...ended, endRecordedAt: null })).toBeNull();
    expect(entryEndedText({ ...ended, endRecordedAt: '2026-10-05T15:32:00Z' })).toBe(
      'Ended by a former member · 6 Oct, 4:32 am',
    );
  });
});
