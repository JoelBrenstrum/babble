import { clock } from '@babble/api';
import {
  CHAIR_UNDO_MS,
  formatBottleAmount,
  secondsLeft,
  type BottleContent,
  type ChairBaby,
  type ChairFeed,
  type NappyType,
  type Side,
} from '@babble/domain';
import { useCallback, useEffect, useReducer } from 'react';
import { chairErrorMessage, chairFlowReducer, initialChairFlow, type ChairSheet } from './chair-flow';
import { NAPPY_SAVED } from './nappy-sheet';
import type { ChairActions, ChairData } from './types';

export function useChairFlow(data: ChairData, actions: ChairActions) {
  const [state, dispatch] = useReducer(chairFlowReducer, initialChairFlow);
  const { sheet, toast, ended, now } = state;

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => dispatch({ type: 'dismiss-toast' }), CHAIR_UNDO_MS);
    return () => clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    if (!ended) return;
    const id = setInterval(() => dispatch({ type: 'tick', now: clock.now().getTime() }), 1000);
    return () => clearInterval(id);
  }, [ended]);

  const show = useCallback((message: string, undo?: () => Promise<unknown>) => {
    dispatch({ type: 'toast', message, undo });
  }, []);

  function run(task: () => Promise<unknown>) {
    task().catch((caught: unknown) => show(chairErrorMessage(caught)));
  }

  const openSheet = (next: ChairSheet) => dispatch({ type: 'open-sheet', sheet: next });
  const closeSheet = () => dispatch({ type: 'close-sheet' });

  function startFeed(side: Side) {
    const askNappy = data.nappyAsk.start;
    run(async () => {
      await actions.startFeed(side);
      if (askNappy) openSheet('nappy-ask');
    });
  }

  function switchSide(side: Side) {
    const askNappy = data.nappyAsk.switch;
    actions.switchSide(side);
    if (askNappy) openSheet('nappy-ask');
  }

  function endFeed(feed: ChairFeed) {
    const askNappy = data.nappyAsk.end;
    dispatch({ type: 'feed-ended', feed, now: clock.now().getTime(), askNappy });
    actions.endFeed().catch((caught: unknown) => {
      dispatch({ type: 'clear-ended' });
      show(chairErrorMessage(caught));
    });
  }

  function discardFeed(feed: ChairFeed) {
    run(async () => {
      await actions.undoEntry(feed.id);
      show('Feed discarded', () => actions.restoreEntry(feed.id));
    });
  }

  function startNap() {
    run(async () => {
      const id = await actions.startNap();
      show('Nap started', () => actions.undoEntry(id));
    });
  }

  function pauseNap() {
    if (data.nap?.paused) actions.resumeNap();
    else actions.pauseNap();
  }

  function toggleNap() {
    if (!data.nap) return startNap();
    run(async () => {
      await actions.endNap();
      show('Nap ended');
    });
  }

  function saveEntry(save: () => Promise<string>, message: string) {
    closeSheet();
    run(async () => {
      const id = await save();
      show(message, () => actions.undoEntry(id));
    });
  }

  function saveBottle(amount: number, content: BottleContent) {
    const unit = data.units === 'metric' ? 'ml' : 'oz';
    saveEntry(() => actions.saveBottle(amount, content), `Bottle saved · ${formatBottleAmount(amount)} ${unit}`);
  }

  function saveNappy(type: NappyType) {
    saveEntry(() => actions.saveNappy(type), `Nappy saved · ${NAPPY_SAVED[type]}`);
  }

  function undoEnded() {
    if (!ended) return;
    dispatch({ type: 'clear-ended' });
    run(() => actions.resumeFeed(ended.id));
  }

  function notAsleepAfterFeed() {
    dispatch({ type: 'clear-ended' });
  }

  function asleepAfterFeed() {
    dispatch({ type: 'clear-ended' });
    startNap();
  }

  function undoToast() {
    if (!toast?.undo) return;
    const { undo } = toast;
    dispatch({ type: 'dismiss-toast' });
    run(undo);
  }

  function pickBaby(baby: ChairBaby) {
    closeSheet();
    if (!baby.selected) actions.selectBaby?.(baby.id);
  }

  return {
    sheet,
    toast,
    ended,
    endedSecondsLeft: ended ? secondsLeft(ended.until, now) : 0,
    openSheet,
    closeSheet,
    startFeed,
    switchSide,
    endFeed,
    discardFeed,
    toggleNap,
    pauseNap,
    saveBottle,
    saveNappy,
    undoEnded,
    asleepAfterFeed,
    notAsleepAfterFeed,
    undoToast,
    pickBaby,
  };
}
