import { SIDE_LABEL, type Side } from '@babble/domain';

export interface SideStyle {
  solid: string;
  soft: string;
  text: string;
  letter: string;
}

export const SIDE_STYLE: Record<Side, SideStyle> = {
  left: {
    solid: 'bg-feed-left',
    soft: 'bg-feed-left-soft border border-feed-left/40',
    text: 'text-on-feed-left',
    letter: SIDE_LABEL.left.charAt(0),
  },
  right: {
    solid: 'bg-feed-right',
    soft: 'bg-feed-right-soft border border-feed-right/40',
    text: 'text-on-feed-right',
    letter: SIDE_LABEL.right.charAt(0),
  },
};

export function sideStyle(side: Side | null): SideStyle {
  return SIDE_STYLE[side ?? 'right'];
}
