import type { Tracker } from '@babble/domain';
import { Droplets, GlassWater, Heart, Milk, Moon, Ruler, Sparkles, type LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';
import { useTokenColor } from '@/lib/theme';

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
  'feed-right': 'bg-feed-right-soft',
  sleep: 'bg-sleep-soft',
  nappy: 'bg-nappy-soft',
  bottle: 'bg-bottle-soft',
  pump: 'bg-pump-soft',
  growth: 'bg-growth-soft',
  custom: 'bg-custom-soft',
};

export function TrackerIcon({ tracker }: { tracker: Tracker }) {
  const Icon = ICONS[tracker.icon];
  const color = useTokenColor(`--on-${tracker.token}`);
  return (
    <View className={`size-11 items-center justify-center rounded-tile ${TILE[tracker.token]}`}>
      <Icon size={20} color={color} strokeWidth={2.75} />
    </View>
  );
}
