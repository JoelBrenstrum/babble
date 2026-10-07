import type { Tracker } from '@babble/domain';
import { Droplets, GlassWater, Heart, Milk, Moon, Ruler, Sparkles, type LucideIcon } from 'lucide-react';
import { cn } from '#/lib/cn';

const ICONS: Record<Tracker['icon'], LucideIcon> = {
  heart: Heart,
  moon: Moon,
  droplets: Droplets,
  milk: Milk,
  'glass-water': GlassWater,
  ruler: Ruler,
  sparkles: Sparkles,
};

const TILE: Record<Tracker['token'], string> = {
  'feed-right': 'bg-feed-right-soft text-on-feed-right',
  sleep: 'bg-sleep-soft text-on-sleep',
  nappy: 'bg-nappy-soft text-on-nappy',
  bottle: 'bg-bottle-soft text-on-bottle',
  pump: 'bg-pump-soft text-on-pump',
  growth: 'bg-growth-soft text-on-growth',
  custom: 'bg-custom-soft text-on-custom',
};

export function TrackerIcon({ tracker, size = 'md' }: { tracker: Tracker; size?: 'md' | 'lg' }) {
  const Icon = ICONS[tracker.icon];
  return (
    <span
      aria-hidden
      className={cn(
        'grid shrink-0 place-items-center',
        size === 'lg' ? 'size-16 rounded-full' : 'size-11 rounded-tile',
        TILE[tracker.token],
      )}
    >
      <Icon className={size === 'lg' ? 'size-7' : 'size-5'} strokeWidth={2.75} />
    </span>
  );
}
