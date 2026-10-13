import { Check, RefreshCw, Undo2 } from 'lucide-react';
import { useRef } from 'react';
import { cn } from '#/lib/cn';
import { BabySheet } from './baby-sheet';
import { BigButton } from './big-button';
import { BottleSheet } from './bottle-sheet';
import { ChairPill } from './chair-pill';
import { EndedView } from './ended-view';
import { FeedingView } from './feeding-view';
import { IdleView } from './idle-view';
import { NappyAskSheet, NappySheet } from './nappy-sheet';
import { OfflineView } from './offline-view';
import { SIDE_SOFT } from './styles';
import { TopStrip } from './top-strip';
import type { ChairActions, ChairData } from './types';
import { useChairFlow } from './use-chair-flow';

export type { ChairActions, ChairBaby, ChairData, ChairFeed } from './types';

export function ChairScreen({
  data,
  actions,
  embedded = false,
}: {
  data: ChairData;
  actions: ChairActions;
  embedded?: boolean;
}) {
  const flow = useChairFlow(data, actions);
  const swallowClick = useRef(false);
  const { sheet, toast, ended } = flow;
  const feed = ended ? null : data.feed;
  const canSwitchBaby = data.babies.length > 1 && actions.selectBaby !== undefined;

  return (
    <div
      data-theme={data.night ? 'dark' : undefined}
      data-testid="chair"
      className={cn(
        embedded ? 'absolute' : 'fixed',
        'inset-0 overflow-hidden font-sans text-ink select-none [container-type:size]',
        data.dimmed && 'chair-dim',
        feed ? (feed.view.paused ? 'bg-session-paused-soft' : SIDE_SOFT[feed.view.side]) : 'bg-bg',
      )}
      onPointerDownCapture={() => {
        swallowClick.current = actions.wake().screenWasOff;
      }}
      onClickCapture={(event) => {
        const { supported, active, wanted } = data.fullscreen;
        if (supported && wanted && !active) actions.enterFullscreen();
        if (!swallowClick.current) return;
        swallowClick.current = false;
        event.stopPropagation();
        event.preventDefault();
      }}
    >
      <div className="absolute inset-0 box-border flex flex-col gap-[3cqmin] p-[4cqmin]">
        {!ended && !data.offline && (
          <TopStrip
            data={data}
            actions={actions}
            canSwitchBaby={canSwitchBaby}
            onSwitchBaby={() => flow.openSheet('baby')}
          />
        )}

        {data.offline ? (
          <OfflineView />
        ) : ended ? (
          <EndedView
            ended={ended}
            secondsLeft={flow.endedSecondsLeft}
            babyName={data.babyName}
            onUndo={flow.undoEnded}
            onAsleep={data.nap ? null : flow.asleepAfterFeed}
          />
        ) : feed ? (
          <FeedingView
            feed={feed}
            actions={actions}
            onEnd={() => flow.endFeed(feed)}
            onSwitch={flow.switchSide}
            onDiscard={() => flow.discardFeed(feed)}
          />
        ) : (
          <IdleView
            data={data}
            onStart={flow.startFeed}
            onBottle={() => flow.openSheet('bottle')}
            onNappy={() => flow.openSheet('nappy')}
            onSleep={flow.toggleNap}
          />
        )}
      </div>

      {sheet === 'bottle' && (
        <BottleSheet units={data.units} initial={data.bottle} onClose={flow.closeSheet} onSave={flow.saveBottle} />
      )}
      {sheet === 'baby' && <BabySheet babies={data.babies} onClose={flow.closeSheet} onPick={flow.pickBaby} />}
      {sheet === 'nappy-ask' && (
        <NappyAskSheet babyName={data.babyName} onClose={flow.closeSheet} onYes={() => flow.openSheet('nappy')} />
      )}
      {sheet === 'nappy' && <NappySheet onClose={flow.closeSheet} onPick={flow.saveNappy} />}

      {data.updateReady && !toast && (
        <ChairPill className="gap-[3cqmin] pr-[1.4cqmin]">
          <RefreshCw className="size-[5cqmin] text-primary" strokeWidth={2.75} />
          <span className="text-[length:5cqmin] font-bold">A new version of babble is ready</span>
          <BigButton
            onClick={actions.refresh}
            className="h-[16cqmin] rounded-full bg-primary px-[6cqmin] text-[length:5cqmin] text-on-primary"
          >
            Refresh
          </BigButton>
        </ChairPill>
      )}
      {toast && (
        <ChairPill
          key={toast.key}
          className={cn('gap-[4cqmin]', toast.undo ? 'pr-[1.4cqmin]' : 'min-h-[12cqmin] pr-[5cqmin]')}
        >
          <Check className="size-[5.4cqmin] text-success" strokeWidth={2.75} />
          <span className="text-[length:5.4cqmin] font-bold">{toast.message}</span>
          {toast.undo && (
            <BigButton
              className="h-[18.4cqmin] rounded-full bg-primary-soft px-[6cqmin] text-on-primary-soft"
              onClick={flow.undoToast}
            >
              <Undo2 className="size-[5.4cqmin]" strokeWidth={2.75} />
              Undo
            </BigButton>
          )}
        </ChairPill>
      )}
    </div>
  );
}
