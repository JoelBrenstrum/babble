import { sampleRunningSleep } from '@babble/api/fixtures';
import { describe, expect, it, vi } from 'vitest';
import { napPromptChoices } from './nap-prompt';

const actions = () => ({
  endNap: vi.fn().mockResolvedValue(undefined),
  startNap: vi.fn().mockResolvedValue(undefined),
});

describe('napPromptChoices', () => {
  it('offers to end the nap when a feed starts', async () => {
    const nap = sampleRunningSleep(new Date('2026-10-06T10:00:00Z'));
    const a = actions();
    const { title, choices } = napPromptChoices(
      { kind: 'end-nap', nap, feedStartedAt: '2026-10-06T09:30:00Z' },
      a,
      'UTC',
    );
    expect(title('Olivia')).toBe("End Olivia's nap?");
    expect(choices.map((choice) => choice.label)).toEqual([
      'End nap now',
      'End at feed start (9:30 am)',
      'Keep sleeping',
    ]);
    await choices[1]!.run!();
    expect(a.endNap).toHaveBeenCalledWith('2026-10-06T09:30:00Z');
    expect(choices[2]!.run).toBeUndefined();
  });

  it('skips "end at feed start" when the feed has only just started', () => {
    const nap = sampleRunningSleep(new Date());
    const { choices } = napPromptChoices(
      { kind: 'end-nap', nap, feedStartedAt: new Date().toISOString() },
      actions(),
      'UTC',
    );
    expect(choices.map((choice) => choice.label)).toEqual(['End nap now', 'Keep sleeping']);
  });

  it('asks whether the baby is asleep when a feed ends', async () => {
    const a = actions();
    const { title, choices } = napPromptChoices({ kind: 'start-nap', feedEndedAt: '2026-10-06T15:34:00Z' }, a, 'UTC');
    expect(title('Olivia')).toBe('Is Olivia asleep?');
    expect(choices.map((choice) => choice.label)).toEqual([
      'Start nap now',
      'Asleep since feed end (3:34 pm)',
      'Not now',
    ]);
    await choices[0]!.run!();
    expect(a.startNap).toHaveBeenCalledWith();
    await choices[1]!.run!();
    expect(a.startNap).toHaveBeenCalledWith('2026-10-06T15:34:00Z');
  });
});
