import {
  AlarmClock,
  CalendarDays,
  ChartColumn,
  Droplets,
  FileUp,
  Heart,
  Milk,
  Moon,
  MoonStar,
  Ruler,
  Smartphone,
  Sparkles,
  Tablet,
  TrendingUp,
  Users,
  Wand,
  type LucideIcon,
} from 'lucide-react';

export const GITHUB_URL = 'https://github.com/JoelBrenstrum/babble';

interface Feature {
  icon: LucideIcon;
  tone: string;
  title: string;
  body: string;
  plus?: boolean;
}

export const FEATURES: Feature[] = [
  {
    icon: Heart,
    tone: 'bg-feed-right-soft text-on-feed-right',
    title: 'Breastfeed timer',
    body: 'Time each side, pause for a burp and tap Next side when you swap. babble remembers which side is next.',
  },
  {
    icon: Moon,
    tone: 'bg-sleep-soft text-on-sleep',
    title: 'Sleep and naps',
    body: 'Start a nap with one tap. Pause and resume it, and note wake-ups through the night.',
  },
  {
    icon: Droplets,
    tone: 'bg-nappy-soft text-on-nappy',
    title: 'Nappies',
    body: "Wet, dirty or both, with poo colours. You'll get a heads-up for colours worth checking with your midwife or GP.",
  },
  {
    icon: Milk,
    tone: 'bg-bottle-soft text-on-bottle',
    title: 'Bottles and pumping',
    body: 'Log formula or expressed milk, and how much each side gave when you pump.',
  },
  {
    icon: Ruler,
    tone: 'bg-growth-soft text-on-growth',
    title: 'Growth',
    body: 'Weight, length and head size, plotted against WHO percentiles.',
  },
  {
    icon: Sparkles,
    tone: 'bg-custom-soft text-on-custom',
    title: 'Your own events',
    body: 'Bath, medicine, tummy time. Track whatever matters to you.',
  },
  {
    icon: CalendarDays,
    tone: 'bg-sleep-soft text-on-sleep',
    title: 'Timeline',
    body: 'See the whole day by the hour, or the last 7 days side by side.',
  },
  {
    icon: ChartColumn,
    tone: 'bg-pump-soft text-on-pump',
    title: 'Stats',
    body: 'Trends for sleep, feeds and nappies over a week or a month.',
  },
  {
    icon: Wand,
    tone: 'bg-sleep-soft text-on-sleep',
    title: 'Predicted naps and feeds',
    body: "babble learns your baby's rhythm and shows when they're likely to sleep or feed next, updating with every entry.",
    plus: true,
  },
  {
    icon: TrendingUp,
    tone: 'bg-primary-soft text-on-primary-soft',
    title: 'Patterns',
    body: 'Wake windows, the longest night stretch, a weekly summary of what changed, and a 30-day timeline.',
    plus: true,
  },
  {
    icon: AlarmClock,
    tone: 'bg-feed-right-soft text-on-feed-right',
    title: 'Feed reminders',
    body: 'See when the next feed is due and which side is next. It can stay quiet at night.',
  },
  {
    icon: Tablet,
    tone: 'bg-feed-left-soft text-on-feed-left',
    title: 'Chair mode',
    body: 'Turn a tablet or touchscreen by the feeding chair into a feed station, with giant buttons and a screen that stays on.',
    plus: true,
  },
  {
    icon: Users,
    tone: 'bg-primary-soft text-on-primary-soft',
    title: 'Shared live with your family',
    body: 'Everyone sees the same timers and history as it happens. Invite a partner, grandparent or nanny with a code.',
  },
  {
    icon: MoonStar,
    tone: 'bg-secondary-soft text-on-secondary-soft',
    title: 'Dark at night',
    body: 'babble can switch to a dim theme overnight, so 3am feeds are easier on tired eyes.',
  },
  {
    icon: FileUp,
    tone: 'bg-custom-soft text-on-custom',
    title: 'Bring your history',
    body: 'Import a Huckleberry export, or move between babble servers with your own export, so nothing is lost.',
  },
  {
    icon: Smartphone,
    tone: 'bg-primary-soft text-on-primary-soft',
    title: 'Works on any phone',
    body: 'Use it in your browser or add it to your home screen like an app. No app store needed.',
  },
];
