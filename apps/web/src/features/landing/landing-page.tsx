import { Link } from '@tanstack/react-router';
import {
  AlarmClock,
  ChartColumn,
  CalendarDays,
  Code,
  Download,
  Droplets,
  EyeOff,
  FileUp,
  Heart,
  Milk,
  Moon,
  MoonStar,
  Ruler,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { buttonClassName } from '#/components/ui/button';
import { Wordmark } from '#/components/ui/wordmark';
import { cn } from '#/lib/cn';
import { HomePreview, TimelinePreview } from './previews';

export const GITHUB_URL = 'https://github.com/JoelBrenstrum/babble';

interface Feature {
  icon: LucideIcon;
  tone: string;
  title: string;
  body: string;
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
    body: 'Trends for sleep, feeds and nappies over a week, a month or all time.',
  },
  {
    icon: AlarmClock,
    tone: 'bg-feed-right-soft text-on-feed-right',
    title: 'Feed reminders',
    body: 'See when the next feed is due and which side is next. It can stay quiet at night.',
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
    title: 'Import from Huckleberry',
    body: 'Bring your history across from a Huckleberry export, so nothing is lost.',
  },
  {
    icon: Smartphone,
    tone: 'bg-primary-soft text-on-primary-soft',
    title: 'Works on any phone',
    body: 'Use it in your browser or add it to your home screen like an app. No app store needed.',
  },
];

const PROMISES: { icon: LucideIcon; text: ReactNode }[] = [
  { icon: EyeOff, text: 'No ads, no analytics and no tracking cookies.' },
  { icon: ShieldCheck, text: 'Your data is never sold. In babble, only the family you invite can see it.' },
  { icon: Download, text: 'Export everything or delete your account any time, from Settings.' },
  {
    icon: Code,
    text: (
      <>
        Open source under the AGPL. Read the code or run babble on your own server, from{' '}
        <a href={GITHUB_URL} className="font-semibold text-primary underline-offset-2 hover:underline">
          GitHub
        </a>
        .
      </>
    ),
  },
];

const linkClass = 'rounded-button font-semibold text-ink-2 underline-offset-2 hover:text-ink hover:underline';

function MainAction({ signedIn, className }: { signedIn: boolean; className?: string }) {
  return signedIn ? (
    <Link to="/" className={buttonClassName({ size: 'lg', className })}>
      Open babble
    </Link>
  ) : (
    <Link to="/sign-in" search={{ invite: undefined }} className={buttonClassName({ size: 'lg', className })}>
      Get started
    </Link>
  );
}

function Section({ className, children, ...props }: { className?: string; children: ReactNode; id?: string }) {
  return (
    <section className={cn('mx-auto w-full max-w-6xl px-4 sm:px-6', className)} {...props}>
      {children}
    </section>
  );
}

export function LandingPage({ signedIn, now }: { signedIn: boolean; now?: Date }) {
  return (
    <div className="flex min-h-dvh flex-col overflow-x-clip bg-bg text-ink">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-6">
        <Link to="/welcome" aria-label="babble home" className="rounded-button">
          <Wordmark className="text-[28px]" />
        </Link>
        {signedIn ? (
          <Link to="/" className={linkClass}>
            Open babble
          </Link>
        ) : (
          <Link to="/sign-in" search={{ invite: undefined }} className={linkClass}>
            Sign in
          </Link>
        )}
      </header>

      <main className="flex flex-col gap-20 pb-20 pt-6 sm:gap-28 sm:pt-12">
        <Section className="grid grid-cols-[minmax(0,1fr)] items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:gap-16">
          <div className="flex flex-col items-start gap-6">
            <h1 className="text-[34px] font-bold leading-[1.1] tracking-tight sm:text-[48px]">
              Track your baby's day, together.
            </h1>
            <p className="max-w-xl text-row-title text-ink-2">
              Feeds, sleep, nappies and more, shared live with everyone who helps. Free, private and open source.
            </p>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <MainAction signedIn={signedIn} />
              <a href="#features" className={buttonClassName({ variant: 'secondary', size: 'lg' })}>
                See what it does
              </a>
            </div>
          </div>
          <div className="mx-auto w-full max-w-md">
            <HomePreview now={now} />
          </div>
        </Section>

        <Section id="features" className="scroll-mt-6">
          <h2 className="text-title font-bold">What babble does</h2>
          <p className="mt-2 max-w-2xl text-body text-ink-2">
            Everything you'll be asked about at check-ups, logged in a tap or two, even one-handed at 3am.
          </p>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <li key={feature.title} className="flex gap-4 rounded-card bg-raised p-5 shadow-raised">
                <span aria-hidden className={cn('grid size-11 shrink-0 place-items-center rounded-tile', feature.tone)}>
                  <feature.icon className="size-5" strokeWidth={2.75} />
                </span>
                <div className="min-w-0">
                  <h3 className="text-row-title font-semibold">{feature.title}</h3>
                  <p className="mt-1 text-meta text-ink-2">{feature.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </Section>

        <Section>
          <h2 className="text-title font-bold">See the day at a glance</h2>
          <p className="mb-8 mt-2 max-w-2xl text-body text-ink-2">
            Spot patterns in sleep and feeds without adding anything up. Here's an example day.
          </p>
          <TimelinePreview now={now} />
        </Section>

        <Section>
          <div className="rounded-sheet bg-surface p-6 sm:p-10">
            <h2 className="text-title font-bold">Private and open source</h2>
            <p className="mt-2 max-w-2xl text-body text-ink-2">
              Your baby's day is nobody else's business. Here's the deal, in plain words.
            </p>
            <ul className="mt-6 grid gap-4 md:grid-cols-2">
              {PROMISES.map((promise, index) => (
                <li key={index} className="flex gap-3 text-body">
                  <promise.icon aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" strokeWidth={2.75} />
                  <span>{promise.text}</span>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-meta text-ink-2">
              Read the{' '}
              <Link to="/privacy" className="font-semibold text-primary underline-offset-2 hover:underline">
                privacy policy
              </Link>{' '}
              and{' '}
              <Link to="/terms" className="font-semibold text-primary underline-offset-2 hover:underline">
                terms of use
              </Link>
              .
            </p>
          </div>
        </Section>

        <Section className="flex flex-col items-center gap-4 text-center">
          <h2 className="text-title font-bold">Ready when you are</h2>
          <p className="max-w-md text-body text-ink-2">Set up your family in a minute, then invite whoever helps.</p>
          <MainAction signedIn={signedIn} className="w-full sm:w-auto" />
        </Section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-4 px-4 py-8 sm:flex-row sm:justify-between sm:px-6">
          <Wordmark className="text-heading" />
          <nav aria-label="Footer">
            <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-meta">
              <li>
                <Link to="/sign-in" search={{ invite: undefined }} className={linkClass}>
                  Sign in
                </Link>
              </li>
              <li>
                <Link to="/privacy" className={linkClass}>
                  Privacy
                </Link>
              </li>
              <li>
                <Link to="/terms" className={linkClass}>
                  Terms
                </Link>
              </li>
              <li>
                <a href={GITHUB_URL} className={linkClass}>
                  GitHub
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </footer>
    </div>
  );
}
