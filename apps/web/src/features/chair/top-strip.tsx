import { ChevronsUpDown, Maximize, Minimize, Moon, Settings } from 'lucide-react';
import { TOP_STRIP_ACTION, TOP_STRIP_ICON, TOP_STRIP_PILL } from './styles';
import type { ChairActions, ChairData } from './types';

export function TopStrip({
  data,
  actions,
  canSwitchBaby,
  onSwitchBaby,
  onSettings,
}: {
  data: ChairData;
  actions: Pick<ChairActions, 'dimNow' | 'enterFullscreen' | 'exitFullscreen'>;
  canSwitchBaby: boolean;
  onSwitchBaby: () => void;
  onSettings: () => void;
}) {
  const { fullscreen } = data;
  return (
    <div className="flex h-[6cqmin] flex-none items-center gap-[2cqmin] text-[length:4.2cqmin] text-ink-2">
      {canSwitchBaby ? (
        <button
          type="button"
          aria-label={`${data.babyName}, ${data.age}. Switch baby`}
          onClick={onSwitchBaby}
          className={`${TOP_STRIP_PILL} gap-[1.2cqmin] font-bold text-ink`}
        >
          {data.babyName}
          <ChevronsUpDown className={`${TOP_STRIP_ICON} text-ink-2`} strokeWidth={2.5} />
        </button>
      ) : (
        <a href="/" aria-label={`Leave chair mode, back to ${data.babyName}'s home`} className="font-bold text-ink">
          {data.babyName}
        </a>
      )}
      <span>{data.age}</span>
      <span className="flex-1" />
      {fullscreen.supported && !data.dimmed && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            if (fullscreen.active) actions.exitFullscreen();
            else actions.enterFullscreen();
          }}
          className={TOP_STRIP_ACTION}
        >
          {fullscreen.active ? (
            <Minimize className={TOP_STRIP_ICON} strokeWidth={2.5} />
          ) : (
            <Maximize className={TOP_STRIP_ICON} strokeWidth={2.5} />
          )}
          {fullscreen.active ? 'Exit full screen' : 'Full screen'}
        </button>
      )}
      {!data.dimmed && (
        <button type="button" onClick={actions.dimNow} className={TOP_STRIP_ACTION}>
          <Moon className={TOP_STRIP_ICON} strokeWidth={2.5} />
          Dim now
        </button>
      )}
      {data.dimmed && (
        <span className="flex items-center gap-[1cqmin] text-ink-3">
          <Moon className={TOP_STRIP_ICON} strokeWidth={2.5} />
          Dimmed · tap to wake
        </span>
      )}
      <span className="tabular font-semibold">{data.clock}</span>
      {!data.dimmed && (
        <button
          type="button"
          aria-label="Chair mode settings"
          title="Settings"
          onClick={onSettings}
          className={`${TOP_STRIP_PILL} aspect-square justify-center px-0 text-ink-2`}
        >
          <Settings className={TOP_STRIP_ICON} strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}
