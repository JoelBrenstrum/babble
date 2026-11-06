import type { ReportTemplate } from '@babble/domain';
import {
  Calendar,
  Clock,
  Droplets,
  Heart,
  Layers,
  MapPin,
  Milk,
  Moon,
  Ruler,
  Sun,
  Timer,
  Users,
  type LucideIcon,
} from 'lucide-react-native';

export const TEMPLATE_ICONS: Record<ReportTemplate['icon'], LucideIcon> = {
  moon: Moon,
  clock: Clock,
  heart: Heart,
  'map-pin': MapPin,
  bottle: Milk,
  timer: Timer,
  sun: Sun,
  droplets: Droplets,
  users: Users,
  ruler: Ruler,
  calendar: Calendar,
  layers: Layers,
};

export const GROUP_ICONS: Record<string, LucideIcon> = {
  sleep: Moon,
  feeds: Heart,
  nappies: Droplets,
  pump: Milk,
  solids: Layers,
  growth: Ruler,
  custom: Calendar,
  logging: Users,
};
