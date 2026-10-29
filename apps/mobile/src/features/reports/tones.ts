import { darkVars, lightVars } from '@babble/tokens';
import { useColorScheme } from 'nativewind';

type Token = keyof typeof lightVars;

const BASE: Record<string, { className: string; token: Token }> = {
  sleep: { className: 'bg-sleep', token: '--sleep' },
  'feed-left': { className: 'bg-feed-left', token: '--feed-left' },
  'feed-right': { className: 'bg-feed-right', token: '--feed-right' },
  bottle: { className: 'bg-bottle', token: '--bottle' },
  nappy: { className: 'bg-nappy', token: '--nappy' },
  pump: { className: 'bg-pump', token: '--pump' },
  growth: { className: 'bg-growth', token: '--growth' },
  solids: { className: 'bg-solids', token: '--solids' },
  custom: { className: 'bg-custom', token: '--custom' },
  primary: { className: 'bg-primary', token: '--primary' },
  caution: { className: 'bg-caution', token: '--caution' },
  'session-downtime': { className: 'bg-session-downtime', token: '--session-downtime' },
  'ink-3': { className: 'bg-ink-3', token: '--ink-3' },
  'person-1': { className: 'bg-person-1', token: '--person-1' },
  'person-2': { className: 'bg-person-2', token: '--person-2' },
  'person-3': { className: 'bg-person-3', token: '--person-3' },
  'person-4': { className: 'bg-person-4', token: '--person-4' },
  'poo-yellow': { className: 'bg-poo-yellow', token: '--poo-yellow' },
  'poo-mustard': { className: 'bg-poo-mustard', token: '--poo-mustard' },
  'poo-green': { className: 'bg-poo-green', token: '--poo-green' },
  'poo-dark-green': { className: 'bg-poo-dark-green', token: '--poo-dark-green' },
  'poo-brown': { className: 'bg-poo-brown', token: '--poo-brown' },
  'poo-orange': { className: 'bg-poo-orange', token: '--poo-orange' },
  'poo-black': { className: 'bg-poo-black', token: '--poo-black' },
  'poo-red': { className: 'bg-poo-red', token: '--poo-red' },
  'poo-white-grey': { className: 'bg-poo-white-grey', token: '--poo-white-grey' },
};

export function toneLook(tone: string): { className: string; token: Token; opacity: number } {
  const [base, alpha] = tone.split('/');
  const look = BASE[base ?? ''] ?? BASE.primary!;
  return { ...look, opacity: alpha ? Number(alpha) / 100 : 1 };
}

export const TILE_LOOK: Record<string, { className: string; token: Token }> = {
  sleep: { className: 'bg-sleep-soft', token: '--on-sleep' },
  feeds: { className: 'bg-feed-right-soft', token: '--on-feed-right' },
  nappies: { className: 'bg-nappy-soft', token: '--on-nappy' },
  pump: { className: 'bg-pump-soft', token: '--on-pump' },
  solids: { className: 'bg-solids-soft', token: '--on-solids' },
  growth: { className: 'bg-growth-soft', token: '--on-growth' },
  custom: { className: 'bg-custom-soft', token: '--on-custom' },
  logging: { className: 'bg-primary-soft', token: '--on-primary-soft' },
};

export function useToneColor(): (tone: string) => string {
  const { colorScheme } = useColorScheme();
  const palette = colorScheme === 'dark' ? darkVars : lightVars;
  return (tone) => `rgb(${palette[toneLook(tone).token].replaceAll(' ', ',')})`;
}
