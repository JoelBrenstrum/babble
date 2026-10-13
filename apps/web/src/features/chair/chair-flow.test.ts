import { CHAIR_ENDED_MS } from '@babble/domain';
import { describe, expect, it } from 'vitest';
import { chairErrorMessage, chairFlowReducer, initialChairFlow, type ChairFlowState } from './chair-flow';

const feed = { id: 'feed-1', summary: { title: 'Fed 13m', sides: 'Left 8m · Right 4m' } };

describe('chairFlowReducer', () => {
  it('opens and closes sheets', () => {
    const open = chairFlowReducer(initialChairFlow, { type: 'open-sheet', sheet: 'bottle' });
    expect(open.sheet).toBe('bottle');
    expect(chairFlowReducer(open, { type: 'close-sheet' }).sheet).toBeNull();
  });

  it('gives every toast a new key so the same message restarts its timer', () => {
    const first = chairFlowReducer(initialChairFlow, { type: 'toast', message: 'Saved' });
    const second = chairFlowReducer(first, { type: 'toast', message: 'Saved' });
    expect(second.toast?.key).not.toBe(first.toast?.key);
    expect(chairFlowReducer(second, { type: 'dismiss-toast' }).toast).toBeNull();
  });

  it('starts the ended countdown and optionally asks about a nappy', () => {
    const plain = chairFlowReducer(initialChairFlow, { type: 'feed-ended', feed, now: 1000, askNappy: false });
    expect(plain.ended).toEqual({ id: 'feed-1', ...feed.summary, until: 1000 + CHAIR_ENDED_MS });
    expect(plain.sheet).toBeNull();
    const asking = chairFlowReducer(initialChairFlow, { type: 'feed-ended', feed, now: 1000, askNappy: true });
    expect(asking.sheet).toBe('nappy-ask');
  });

  it('ticks the countdown, then clears it when time is up', () => {
    const ended = chairFlowReducer(initialChairFlow, { type: 'feed-ended', feed, now: 0, askNappy: false });
    const ticked = chairFlowReducer(ended, { type: 'tick', now: 4000 });
    expect(ticked.now).toBe(4000);
    expect(ticked.ended).not.toBeNull();
    expect(chairFlowReducer(ticked, { type: 'tick', now: CHAIR_ENDED_MS }).ended).toBeNull();
  });

  it('ignores ticks when nothing has ended', () => {
    const state: ChairFlowState = { ...initialChairFlow };
    expect(chairFlowReducer(state, { type: 'tick', now: 5 })).toBe(state);
  });

  it('clears the ended view', () => {
    const ended = chairFlowReducer(initialChairFlow, { type: 'feed-ended', feed, now: 0, askNappy: false });
    expect(chairFlowReducer(ended, { type: 'clear-ended' }).ended).toBeNull();
  });
});

describe('chairErrorMessage', () => {
  it('uses an error message, or a generic one', () => {
    expect(chairErrorMessage(new Error('No connection.'))).toBe('No connection.');
    expect(chairErrorMessage('boom')).toBe('Something went wrong. Try again.');
  });
});
