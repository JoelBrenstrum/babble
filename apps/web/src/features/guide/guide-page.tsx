import { FREE_REPORT_LIMIT } from '@babble/config';
import {
  CHART_TYPE_LABELS,
  CHART_TYPES,
  MEASURE_GROUP_LABELS,
  MEASURE_GROUPS,
  measuresInGroup,
  PREBUILT_LABELS,
  PLUS_PREBUILT,
  REPORT_TEMPLATES,
  SPLIT_KEYS,
  SPLIT_LABELS,
  type ChartType,
} from '@babble/domain';
import { Link } from '@tanstack/react-router';
import { buttonClassName } from '#/components/ui/button';
import { Card } from '#/components/ui/card';
import { Wordmark } from '#/components/ui/wordmark';
import { PlusBadge } from '#/features/plus-dialog';
import { CHART_ICONS } from '#/features/reports/report-icons';

const CHART_USES: Record<ChartType, string> = {
  bar: 'A total per day, week or month. Two or more measures stack, so feeds per day can show breast and bottle together.',
  line: 'A trend, with an optional 7-day average drawn over it. Good for bottle volume, wake windows or weight.',
  area: 'How a total is made up over time, such as night sleep and naps stacked into total sleep.',
  donut: 'The share of one total, split by something: sleep by location, bottles by content, entries by carer.',
  number: 'One figure for the range, the change on the previous period, and a small sparkline.',
  table: 'The numbers behind any report, with a totals row. Export it as CSV from the report menu.',
  heatmap:
    'When things happen: hours across, one row per day. The chart parents screenshot, because rhythms show up as columns.',
  histogram: 'How long or how much, as a distribution: nap lengths, feed durations, gaps between feeds.',
  rhythm: 'Sleep, feeds and nappies as blocks along each day, so you can see a routine settling in.',
};

const STEPS = [
  [
    'Measure',
    'What to count or time. Pick up to four with the same unit (hours, millilitres, counts), or one measure to split.',
  ],
  ['Range', 'The last 7, 14 or 30 days, or a custom pair of dates. Longer ranges and all time are part of Plus.'],
  [
    'Group by',
    'One bar or point per day, week or month, or fold the range onto the hour of day or the weekday to see rhythms.',
  ],
  [
    'Split by',
    'Break one measure into series: sleep by location, nappies by kind, bottles by content, entries by carer or device.',
  ],
  [
    'Chart',
    'Pick from the nine types below. The builder suggests one and dims the ones that do not fit, with a reason on hover.',
  ],
  [
    'Filters',
    'Narrow the entries first: sleeps in the pram only, formula bottles only, or anything whose notes mention a word.',
  ],
  [
    'Options',
    'A 7-day average, a cumulative line, hiding empty days, stacking, and comparing with the previous period.',
  ],
] as const;

export function GuidePage({ signedIn, billingEnabled }: { signedIn: boolean; billingEnabled: boolean }) {
  return (
    <div className="min-h-dvh bg-bg text-ink">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-5 sm:px-6">
        <Link to="/welcome" aria-label="babble home" className="rounded-button">
          <Wordmark className="text-[28px]" />
        </Link>
        {signedIn ? (
          <Link to="/reports" className={buttonClassName({ variant: 'secondary' })}>
            Open Reports
          </Link>
        ) : (
          <Link to="/sign-in" search={{ invite: undefined }} className={buttonClassName({ variant: 'secondary' })}>
            Sign in
          </Link>
        )}
      </header>
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-12 px-4 pb-20 pt-4 sm:px-6 sm:pt-8">
        <section className="flex flex-col gap-3">
          <h1 className="text-title font-bold">Reports and the dashboard</h1>
          <p className="text-body text-ink-2">
            Stats answers the questions we thought of. Reports lets you ask your own, from menus and chips rather than
            formulas, and the dashboard puts the answers you care about at the top of Stats for everyone in the family.
          </p>
          <nav aria-label="On this page" className="flex flex-wrap gap-2">
            {[
              ['reports', 'Reports'],
              ['measures', 'Measures and splits'],
              ['charts', 'Chart types'],
              ['templates', 'Templates'],
              ['saving', 'Saving and sharing'],
              ['dashboard', 'Dashboard'],
            ].map(([id, label]) => (
              <a
                key={id}
                href={`#${id}`}
                className="inline-flex h-10 items-center rounded-full bg-surface px-4 text-label font-semibold text-ink-2 hover:bg-line hover:text-ink"
              >
                {label}
              </a>
            ))}
          </nav>
        </section>

        <section id="reports" className="flex scroll-mt-6 flex-col gap-4" aria-labelledby="guide-reports">
          <h2 id="guide-reports" className="text-heading font-bold">
            Reports
          </h2>
          <p className="text-body text-ink-2">
            A report is a question: what to measure, over which days, grouped how, split by what, and which chart to
            draw it with. Open <strong>Reports</strong> from the sidebar or the link under the Stats range picker, start
            from a template or a blank report, and the preview redraws as you change each setting.
          </p>
          <ol className="flex flex-col gap-3">
            {STEPS.map(([title, body], index) => (
              <li key={title} className="flex gap-4 rounded-card bg-raised p-4 shadow-raised">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-soft text-label font-bold text-on-primary-soft">
                  {index + 1}
                </span>
                <div>
                  <h3 className="text-row-title font-semibold">{title}</h3>
                  <p className="mt-1 text-meta text-ink-2">{body}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="text-body text-ink-2">
            On a phone the same settings sit in five tabs under the preview. The babble app for iPhone and Android shows
            your saved reports and creates new ones from templates; editing measures, splits and filters is on the web.
          </p>
        </section>

        <section id="measures" className="flex scroll-mt-6 flex-col gap-4" aria-labelledby="guide-measures">
          <h2 id="guide-measures" className="text-heading font-bold">
            Measures and splits
          </h2>
          <p className="text-body text-ink-2">
            Every measure comes from what you have logged. Durations are shown in hours and minutes, volumes in your
            family's units, and per-day figures use finished days only, so today never drags an average down.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {MEASURE_GROUPS.map((group) => (
              <Card key={group} className="p-5">
                <h3 className="text-row-title font-semibold">{MEASURE_GROUP_LABELS[group]}</h3>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {measuresInGroup(group).map((measure) => (
                    <li
                      key={measure.id}
                      className="rounded-chip bg-surface px-2.5 py-1 text-caption font-semibold text-ink-2"
                    >
                      {measure.label}
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
          <h3 className="text-row-title font-semibold">Splits</h3>
          <p className="text-meta text-ink-2">
            A split turns one measure into a series per value. Which splits are offered depends on the measure: sleep
            measures can split by location or mood, nappies by kind, size, colour or texture, and everything can split
            by carer, device, source, weekday, or day and night.
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {SPLIT_KEYS.map((key) => (
              <li key={key} className="rounded-chip bg-surface px-2.5 py-1 text-caption font-semibold text-ink-2">
                {SPLIT_LABELS[key]}
              </li>
            ))}
          </ul>
        </section>

        <section id="charts" className="flex scroll-mt-6 flex-col gap-4" aria-labelledby="guide-charts">
          <h2 id="guide-charts" className="text-heading font-bold">
            Chart types
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {CHART_TYPES.map((chart) => {
              const Icon = CHART_ICONS[chart];
              return (
                <Card key={chart} className="flex gap-4 p-5">
                  <span
                    aria-hidden
                    className="grid size-11 shrink-0 place-items-center rounded-tile bg-primary-soft text-on-primary-soft"
                  >
                    <Icon className="size-5" strokeWidth={2.75} />
                  </span>
                  <div>
                    <h3 className="text-row-title font-semibold">{CHART_TYPE_LABELS[chart]}</h3>
                    <p className="mt-1 text-meta text-ink-2">{CHART_USES[chart]}</p>
                  </div>
                </Card>
              );
            })}
          </div>
          <p className="text-body text-ink-2">
            Hover or tap any bar, point, slice or cell for its values. Bars and points along the days link to that day
            in the Timeline.
          </p>
        </section>

        <section id="templates" className="flex scroll-mt-6 flex-col gap-4" aria-labelledby="guide-templates">
          <h2 id="guide-templates" className="text-heading font-bold">
            Templates
          </h2>
          <p className="text-body text-ink-2">
            Templates are ready-made reports. Open one to see it straight away, then change anything and save it as your
            own.
          </p>
          <ul className="grid gap-3 sm:grid-cols-2">
            {REPORT_TEMPLATES.map((template) => (
              <li key={template.key} className="rounded-card bg-raised p-4 shadow-raised">
                <h3 className="text-row-title font-semibold">{template.name.replace('{baby}', 'your baby')}</h3>
                <p className="mt-1 text-meta text-ink-2">{template.description}</p>
              </li>
            ))}
          </ul>
        </section>

        <section id="saving" className="flex scroll-mt-6 flex-col gap-4" aria-labelledby="guide-saving">
          <h2 id="guide-saving" className="text-heading font-bold">
            Saving and sharing
          </h2>
          <ul className="flex list-disc flex-col gap-2 pl-5 text-body text-ink-2">
            <li>Saved reports are shared with everyone in your family and update live as entries are logged.</li>
            <li>
              Open a saved report to change its range without editing it, compare it with the previous period, duplicate
              it, export the numbers as CSV, or delete it.
            </li>
            {billingEnabled ? (
              <li className="flex flex-wrap items-center gap-2">
                A free family can save {FREE_REPORT_LIMIT} reports, and can replace one when saving a third. Babble Plus
                saves as many as you like, and unlocks 90 days, 6 months and all-time ranges. <PlusBadge />
              </li>
            ) : (
              <li>Save as many reports as you like.</li>
            )}
            <li>Carers with read-only access see every report and can export it, but cannot save or change one.</li>
          </ul>
        </section>

        <section id="dashboard" className="flex scroll-mt-6 flex-col gap-4" aria-labelledby="guide-dashboard">
          <h2 id="guide-dashboard" className="text-heading font-bold">
            Dashboard
          </h2>
          <p className="text-body text-ink-2">
            Stats opens with your family's dashboard: a grid of cards that everyone in the family shares. It starts as
            the usual sleep, feeds, nappies, pump and growth cards. Tap <strong>Arrange</strong> to change it.
          </p>
          <ul className="flex list-disc flex-col gap-2 pl-5 text-body text-ink-2">
            <li>
              <strong>Add card</strong> offers the stats cards you have removed, the Patterns cards, every saved report,
              and a short note to sit between cards, for things like "Started formula top-ups 12 Oct".
            </li>
            <li>Move a card up or down, switch it between one column (S) and two (M), or remove it.</li>
            <li>The range picker applies to the built-in cards. Saved reports keep their own range.</li>
            <li>
              Cards with nothing to show in the range stay hidden until you arrange, so an empty pump card never takes
              up space.
            </li>
            <li>Changes save as you make them and appear for the rest of the family straight away.</li>
          </ul>
          <Card className="p-5">
            <h3 className="text-row-title font-semibold">Cards you can add</h3>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {(Object.keys(PREBUILT_LABELS) as (keyof typeof PREBUILT_LABELS)[]).map((card) => (
                <li
                  key={card}
                  className="inline-flex items-center gap-1.5 rounded-chip bg-surface px-2.5 py-1 text-caption font-semibold text-ink-2"
                >
                  {PREBUILT_LABELS[card]}
                  {billingEnabled && PLUS_PREBUILT.includes(card) && <PlusBadge />}
                </li>
              ))}
              <li className="rounded-chip bg-surface px-2.5 py-1 text-caption font-semibold text-ink-2">
                Any saved report
              </li>
              <li className="rounded-chip bg-surface px-2.5 py-1 text-caption font-semibold text-ink-2">A note</li>
            </ul>
          </Card>
        </section>

        <section className="flex flex-col items-start gap-3 rounded-card bg-surface p-6">
          <h2 className="text-heading font-bold">Try it</h2>
          <p className="text-body text-ink-2">
            {signedIn
              ? 'Start from a template and see your own numbers in a few taps.'
              : 'babble is free to use. Create an account, log a few days, and build your first report.'}
          </p>
          {signedIn ? (
            <Link to="/reports" className={buttonClassName({ size: 'lg' })}>
              Open Reports
            </Link>
          ) : (
            <Link to="/sign-in" search={{ invite: undefined }} className={buttonClassName({ size: 'lg' })}>
              Get started
            </Link>
          )}
        </section>
      </main>
    </div>
  );
}
