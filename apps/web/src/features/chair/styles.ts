import type { Side } from '@babble/domain';

export const SIDE_BG: Record<Side, string> = { left: 'bg-feed-left', right: 'bg-feed-right' };
export const SIDE_SOFT: Record<Side, string> = { left: 'bg-feed-left-soft', right: 'bg-feed-right-soft' };
export const SIDE_ON: Record<Side, string> = { left: 'text-on-feed-left', right: 'text-on-feed-right' };
export const SIDE_RING: Record<Side, string> = {
  left: 'shadow-[0_0_0_1cqmin_rgb(var(--bg)),0_0_0_2.2cqmin_rgb(var(--feed-left))]',
  right: 'shadow-[0_0_0_1cqmin_rgb(var(--bg)),0_0_0_2.2cqmin_rgb(var(--feed-right))]',
};

export const TOP_STRIP_PILL = 'flex h-[6cqmin] items-center rounded-full bg-surface px-[2.4cqmin]';
export const TOP_STRIP_ACTION = `${TOP_STRIP_PILL} gap-[1cqmin] text-[length:3.6cqmin] font-semibold text-ink-2`;
export const TOP_STRIP_ICON = 'size-[3.6cqmin]';

export const ACTION_BUTTON = 'h-[20cqmin] rounded-[4cqmin]';
export const OUTLINED = 'border-[0.5cqmin] border-line-strong bg-raised';
export const ACTION_ROW = 'flex flex-none flex-wrap gap-[3cqmin] text-[length:5.6cqmin]';
export const ACTION_ICON = 'size-[6cqmin]';

export const FLOATING_PILL =
  'absolute top-[3cqmin] left-1/2 flex -translate-x-1/2 items-center rounded-full border-[0.3cqmin] border-line-strong bg-raised py-[1.4cqmin] pl-[4cqmin] whitespace-nowrap shadow-toast';
