import {
  Calendar,
  ChartArea,
  ChartColumn,
  ChartColumnBig,
  ChartLine,
  ChartPie,
  Clock,
  Droplets,
  Grid3x3,
  Hash,
  Heart,
  Layers,
  MapPin,
  Milk,
  Moon,
  Rows3,
  Ruler,
  Sun,
  Table,
  Timer,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { ChartType, ReportTemplate } from '@babble/domain';

export const CHART_ICONS: Record<ChartType, LucideIcon> = {
  bar: ChartColumn,
  line: ChartLine,
  area: ChartArea,
  donut: ChartPie,
  number: Hash,
  table: Table,
  heatmap: Grid3x3,
  histogram: ChartColumnBig,
  rhythm: Rows3,
};

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
