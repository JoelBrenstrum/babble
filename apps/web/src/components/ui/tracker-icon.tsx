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

export function TrackerIcon({ tracker, className }: { tracker: Tracker; className?: string }) {
  const Icon = ICONS[tracker.icon];
  return (
    <span className={cn('grid size-11 shrink-0 place-items-center rounded-tile', TILE[tracker.token], className)}>
      <Icon className="size-5" strokeWidth={2.75} />
    </span>
  );
}
