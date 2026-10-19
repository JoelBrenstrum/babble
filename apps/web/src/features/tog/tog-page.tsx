import { sampleBaby, sampleFamily, sampleRunningSleep } from '@babble/api/fixtures';
import { Link } from '@tanstack/react-router';
import { ArrowRight, Moon, ShieldAlert } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { buttonClassName } from '#/components/ui/button';
import { Wordmark } from '#/components/ui/wordmark';
import { RunningCard } from '#/features/events/running-card';
import { GITHUB_URL } from '#/features/landing/content';
import { fixtureClient } from '#/fixtures/client';
import { cn } from '#/lib/cn';
import { TogCalculator } from './tog-calculator';

const linkClass = 'rounded-button font-semibold text-ink-2 underline-offset-2 hover:text-ink hover:underline';

function Section({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cn('mx-auto w-full max-w-6xl px-4 sm:px-6', className)}>{children}</section>;
}

function NapPreview({ now: fixedNow }: { now?: Date }) {
  const [now] = useState(() => fixedNow ?? new Date());
  const [nap] = useState(() => sampleRunningSleep(now));
  return (
    <div
      role="img"
      aria-label="Preview of a running nap in babble, started by Jane, with Pause nap and End nap buttons."
      className="w-full max-w-sm justify-self-center rounded-sheet border border-line bg-bg p-3 shadow-toast"
    >
      <div inert aria-hidden className="pointer-events-none select-none">
        <RunningCard event={nap} client={fixtureClient} timeZone={sampleBaby.timezone} members={sampleFamily.members} />
      </div>
    </div>
  );
}

export function TogPage({ signedIn, now }: { signedIn: boolean; now?: Date }) {
  const signInLink = signedIn ? (
    <Link to="/" className={linkClass}>
      Open babble
    </Link>
  ) : (
    <Link to="/sign-in" search={{ invite: undefined }} className={linkClass}>
      Sign in
    </Link>
  );
  return (
    <div className="flex min-h-dvh flex-col overflow-x-clip bg-bg text-ink">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-6">
        <Link to="/welcome" aria-label="babble home" className="rounded-button">
          <Wordmark className="text-[28px]" />
        </Link>
        {signInLink}
      </header>

      <main className="flex flex-col gap-12 pb-20 pt-6 sm:gap-20 sm:pt-12">
        <Section>
          <div className="flex max-w-3xl flex-col items-start gap-3.5">
            <span className="flex h-8 items-center gap-2 rounded-chip bg-sleep-soft px-3 text-meta font-bold text-on-sleep">
              <Moon className="size-4" strokeWidth={2.75} />
              Free tool · no sign-in
            </span>
            <h1 className="font-brand text-[44px] font-normal leading-[1.02] tracking-[-0.01em] sm:text-[64px] lg:text-[80px]">
              TOG calculator
            </h1>
            <p className="text-pretty text-row-title text-ink-2 sm:text-[20px] sm:leading-[1.5]">
              A TOG is the warmth rating of a baby sleeping bag, from 0.2 for a thin summer bag to 3.5 for a thick
              winter one. Find the bag for the room, or the room for the bag you have.
            </p>
          </div>
        </Section>

        <Section className="flex flex-col gap-12 sm:gap-20">
          <TogCalculator />
        </Section>

        <Section>
          <aside
            aria-labelledby="tog-disclaimer-heading"
            className="flex gap-4 rounded-card border border-line bg-raised p-5 sm:p-6"
          >
            <ShieldAlert aria-hidden className="mt-0.5 size-5 shrink-0 text-caution" strokeWidth={2.75} />
            <div className="flex flex-col gap-2">
              <h2 id="tog-disclaimer-heading" className="text-row-title font-bold">
                A guide, not advice
              </h2>
              <p className="text-body text-ink-2">
                This calculator is a general guide built from published TOG charts. It is not medical or safety advice,
                and babble takes no responsibility for how it is used or for any outcome. Every baby, bag and room is
                different, so use your own judgement: check your baby's chest or the back of their neck rather than the
                chart, follow the safe sleep guidance of your midwife, doctor or national health authority, and if
                something doesn't seem right, stop and ask a professional.
              </p>
            </div>
          </aside>
        </Section>

        <Section>
          <div className="grid items-center gap-7 rounded-sheet bg-surface p-5 sm:p-10 md:grid-cols-2">
            <div className="flex flex-col gap-3.5">
              <h2 className="font-brand text-[30px] font-normal leading-[1.1] sm:text-[44px]">
                Keep track of every nap
              </h2>
              <p className="text-row-title text-ink-2">
                babble logs sleep, feeds and nappies, and shares them with everyone who looks after your baby.
              </p>
              <div className="mt-1 flex flex-wrap gap-2.5">
                {signedIn ? (
                  <Link to="/" className={buttonClassName({ size: 'lg' })}>
                    Open babble
                    <ArrowRight className="size-[18px]" strokeWidth={2.75} />
                  </Link>
                ) : (
                  <>
                    <Link to="/sign-in" search={{ invite: undefined }} className={buttonClassName({ size: 'lg' })}>
                      Try babble
                      <ArrowRight className="size-[18px]" strokeWidth={2.75} />
                    </Link>
                    <Link to="/welcome" className={buttonClassName({ variant: 'ghost', size: 'lg' })}>
                      See what it does
                    </Link>
                  </>
                )}
              </div>
            </div>
            <NapPreview now={now} />
          </div>
        </Section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-4 px-4 py-8 sm:flex-row sm:justify-between sm:px-6">
          <Wordmark className="text-heading" />
          <nav aria-label="Footer">
            <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-meta">
              <li>
                <Link to="/welcome" className={linkClass}>
                  About babble
                </Link>
              </li>
              <li>{signInLink}</li>
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
