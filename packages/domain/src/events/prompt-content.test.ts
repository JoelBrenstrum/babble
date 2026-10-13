import { describe, expect, it } from 'vitest';
import { napPromptContent } from './prompt-content';
import { makeEvent } from './test-events';

const NOW = new Date('2026-10-06T12:00:00Z');
const feed = makeEvent('breast_feed', {
  id: 'feed',
  startedAt: '2026-10-06T10:00:00Z',
  endedAt: '2026-10-06T10:20:00Z',
  segments: [{ side: 'left', startedAt: '2026-10-06T10:00:00Z', endedAt: '2026-10-06T10:20:00Z' }],
});
const bottle = makeEvent('bottle', { id: 'bottle', startedAt: '2026-10-06T11:00:00Z' });
const nap = makeEvent('sleep', { id: 'nap', startedAt: '2026-10-06T11:30:00Z', endedAt: null });

describe('napPromptContent', () => {
  it('offers to end a nap, including at the feed start when that was a while ago', () => {
    const content = napPromptContent(
      { kind: 'end-nap', nap, feedStartedAt: '2026-10-06T11:40:00Z' },
      'Olivia',
      'UTC',
      NOW,
    );
    expect(content.title).toBe("End Olivia's nap?");
    expect(content.body).toBe('A nap has been running since 11:30 am.');
    expect(content.options).toEqual([
      { label: 'End nap now', action: { kind: 'end-nap', napId: 'nap' }, primary: true },
      {
        label: 'End at feed start (11:40 am)',
        action: { kind: 'end-nap', napId: 'nap', at: '2026-10-06T11:40:00Z' },
        primary: false,
      },
      { label: 'Keep sleeping', action: null, primary: false },
    ]);
  });

  it('skips "end at feed start" for a feed that just started', () => {
    const content = napPromptContent({ kind: 'end-nap', nap, feedStartedAt: NOW.toISOString() }, 'Olivia', 'UTC', NOW);
    expect(content.options.map((option) => option.label)).toEqual(['End nap now', 'Keep sleeping']);
  });

  it('only offers "asleep since feed end" when the feed ended a while ago', () => {
    const content = napPromptContent({ kind: 'start-nap', feedEndedAt: NOW.toISOString() }, 'Olivia', 'UTC', NOW);
    expect(content.options.map((option) => option.label)).toEqual(['Start nap now', 'Not now']);
  });

  it('asks whether the baby is asleep after a feed', () => {
    const content = napPromptContent({ kind: 'start-nap', feedEndedAt: '2026-10-06T11:34:00Z' }, 'Olivia', 'UTC', NOW);
    expect(content.title).toBe('Is Olivia asleep?');
    expect(content.options).toEqual([
      { label: 'Start nap now', action: { kind: 'start-nap' }, primary: true },
      {
        label: 'Asleep since feed end (11:34 am)',
        action: { kind: 'start-nap', at: '2026-10-06T11:34:00Z' },
        primary: false,
      },
      { label: 'Not now', action: null, primary: false },
    ]);
  });
});

describe('nappy prompt content', () => {
  it('offers to log a nappy or skip', () => {
    expect(napPromptContent({ kind: 'nappy', at: NOW.toISOString() }, 'Olivia', 'UTC', NOW)).toEqual({
      title: "Change Olivia's nappy?",
      body: 'Log a nappy change with this feed.',
      options: [
        { label: 'Yes, log a nappy', action: { kind: 'log-nappy' }, primary: true },
        { label: 'Not now', action: null, primary: false },
      ],
    });
  });
});

describe('end feed prompt', () => {
  const running = { ...feed, endedAt: null };

  it('ends the feed now when the nap starts now', () => {
    const content = napPromptContent(
      { kind: 'end-feed', feed: running, napStartedAt: NOW.toISOString() },
      'Olivia',
      'UTC',
      NOW,
    );
    expect(content.title).toBe("End Olivia's feed?");
    expect(content.body).toBe('A feed has been running since 10:00 am.');
    expect(content.options).toEqual([
      { label: 'End feed', action: { kind: 'end-feed', feedId: 'feed' }, primary: true },
      { label: 'Keep feeding', action: null, primary: false },
    ]);
  });

  it('ends the feed at a backdated nap start', () => {
    const content = napPromptContent(
      { kind: 'end-feed', feed: running, napStartedAt: '2026-10-06T11:40:00Z' },
      'Olivia',
      'UTC',
      NOW,
    );
    expect(content.options[0]).toEqual({
      label: 'End feed at nap start (11:40 am)',
      action: { kind: 'end-feed', feedId: 'feed', at: '2026-10-06T11:40:00Z' },
      primary: true,
    });
  });
});
