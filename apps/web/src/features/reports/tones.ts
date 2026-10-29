import type { CSSProperties } from 'react';

interface ToneClasses {
  bg: string;
  fill: string;
  stroke: string;
  text: string;
}

const tone = (name: string): ToneClasses => ({
  bg: `bg-${name}`,
  fill: `fill-${name}`,
  stroke: `stroke-${name}`,
  text: `text-${name}`,
});

const BASE: Record<string, ToneClasses> = {
  sleep: { bg: 'bg-sleep', fill: 'fill-sleep', stroke: 'stroke-sleep', text: 'text-sleep' },
  'feed-left': { bg: 'bg-feed-left', fill: 'fill-feed-left', stroke: 'stroke-feed-left', text: 'text-feed-left' },
  'feed-right': { bg: 'bg-feed-right', fill: 'fill-feed-right', stroke: 'stroke-feed-right', text: 'text-feed-right' },
  bottle: { bg: 'bg-bottle', fill: 'fill-bottle', stroke: 'stroke-bottle', text: 'text-bottle' },
  nappy: { bg: 'bg-nappy', fill: 'fill-nappy', stroke: 'stroke-nappy', text: 'text-nappy' },
  pump: { bg: 'bg-pump', fill: 'fill-pump', stroke: 'stroke-pump', text: 'text-pump' },
  growth: { bg: 'bg-growth', fill: 'fill-growth', stroke: 'stroke-growth', text: 'text-growth' },
  solids: { bg: 'bg-solids', fill: 'fill-solids', stroke: 'stroke-solids', text: 'text-solids' },
  custom: { bg: 'bg-custom', fill: 'fill-custom', stroke: 'stroke-custom', text: 'text-custom' },
  primary: { bg: 'bg-primary', fill: 'fill-primary', stroke: 'stroke-primary', text: 'text-primary' },
  caution: { bg: 'bg-caution', fill: 'fill-caution', stroke: 'stroke-caution', text: 'text-caution' },
  'session-downtime': {
    bg: 'bg-session-downtime',
    fill: 'fill-session-downtime',
    stroke: 'stroke-session-downtime',
    text: 'text-session-downtime',
  },
  'ink-3': { bg: 'bg-ink-3', fill: 'fill-ink-3', stroke: 'stroke-ink-3', text: 'text-ink-3' },
  'person-1': { bg: 'bg-person-1', fill: 'fill-person-1', stroke: 'stroke-person-1', text: 'text-person-1' },
  'person-2': { bg: 'bg-person-2', fill: 'fill-person-2', stroke: 'stroke-person-2', text: 'text-person-2' },
  'person-3': { bg: 'bg-person-3', fill: 'fill-person-3', stroke: 'stroke-person-3', text: 'text-person-3' },
  'person-4': { bg: 'bg-person-4', fill: 'fill-person-4', stroke: 'stroke-person-4', text: 'text-person-4' },
  'poo-yellow': tone('poo-yellow'),
  'poo-mustard': tone('poo-mustard'),
  'poo-green': tone('poo-green'),
  'poo-dark-green': tone('poo-dark-green'),
  'poo-brown': tone('poo-brown'),
  'poo-orange': tone('poo-orange'),
  'poo-black': tone('poo-black'),
  'poo-red': tone('poo-red'),
  'poo-white-grey': tone('poo-white-grey'),
};

export interface ToneLook {
  classes: ToneClasses;
  style: CSSProperties | undefined;
  opacity: number;
}

export function toneLook(toneName: string): ToneLook {
  const [base, alpha] = toneName.split('/');
  const classes = BASE[base ?? ''] ?? BASE.primary!;
  const opacity = alpha ? Number(alpha) / 100 : 1;
  return { classes, style: alpha ? { opacity } : undefined, opacity };
}

export const TILE_LOOK: Record<string, string> = {
  sleep: 'bg-sleep-soft text-on-sleep',
  feeds: 'bg-feed-right-soft text-on-feed-right',
  nappies: 'bg-nappy-soft text-on-nappy',
  pump: 'bg-pump-soft text-on-pump',
  solids: 'bg-solids-soft text-on-solids',
  growth: 'bg-growth-soft text-on-growth',
  custom: 'bg-custom-soft text-on-custom',
  logging: 'bg-primary-soft text-on-primary-soft',
};
