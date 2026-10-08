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
  const ended = { startedAt: '2026-10-05T14:12:00Z', timeZone: 'Pacific/Auckland' };

  it('names who pressed stop and when', () => {
    expect(entryEndedText({ ...ended, endedBy: 'John', endRecordedAt: '2026-10-05T15:32:00Z' })).toBe(
      'Ended by John at 4:32 am',
    );
  });

  it('adds the date when it ended on another day', () => {
    expect(entryEndedText({ ...ended, endedBy: 'Jane', endRecordedAt: '2026-10-06T11:05:00Z' })).toBe(
      'Ended by Jane on 7 Oct at 12:05 am',
    );
  });

  it('has nothing for entries that were never stopped, and handles members who left', () => {
    expect(entryEndedText({ ...ended, endRecordedAt: null })).toBeNull();
    expect(entryEndedText({ ...ended, endRecordedAt: '2026-10-05T15:32:00Z' })).toBe(
      'Ended by a former member at 4:32 am',
    );
  });
});
