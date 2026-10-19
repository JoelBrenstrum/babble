import { sampleRunningSleep } from '@babble/api/fixtures';
import type { BabyEvent } from '@babble/domain';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useFormFreshness } from './use-form-freshness';

const now = new Date('2026-10-19T02:00:00Z');
const base: BabyEvent = {
  ...sampleRunningSleep(now),
  endedAt: '2026-10-19T01:30:00Z',
  updatedAt: '2026-10-19T01:30:00Z',
};

describe('useFormFreshness', () => {
  it('ignores a refetch that only bumps updated_at', () => {
    const { result, rerender } = renderHook(({ event }) => useFormFreshness(event), { initialProps: { event: base } });
    rerender({ event: { ...base, updatedAt: '2026-10-19T01:31:00Z' } });
    expect(result.current.changedElsewhere).toBe(false);
  });

  it('flags a change to the entry that the form did not make', () => {
    const { result, rerender } = renderHook(({ event }) => useFormFreshness(event), { initialProps: { event: base } });
    rerender({ event: { ...base, notes: 'From the other phone', updatedAt: '2026-10-19T01:31:00Z' } });
    expect(result.current.changedElsewhere).toBe(true);
    act(() => result.current.reload());
    expect(result.current.changedElsewhere).toBe(false);
    expect(result.current.version).toBe(1);
  });

  it('adopts the next version after a save from this form', () => {
    const { result, rerender } = renderHook(({ event }) => useFormFreshness(event), { initialProps: { event: base } });
    act(() => result.current.markOwnSave());
    rerender({ event: { ...base, notes: 'Saved here', updatedAt: '2026-10-19T01:31:00Z' } });
    expect(result.current.changedElsewhere).toBe(false);
    rerender({ event: { ...base, notes: 'Changed elsewhere afterwards', updatedAt: '2026-10-19T01:32:00Z' } });
    expect(result.current.changedElsewhere).toBe(true);
  });
});
