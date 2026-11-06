import { emptySpec, runReport, type BabyEvent, type ReportSettings, type ReportSpec } from '@babble/domain';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ReportCard } from './report-card';

const settings: ReportSettings = {
  timeZone: 'UTC',
  dayStartMinutes: 0,
  nightStartMinutes: 19 * 60,
  nightEndMinutes: 7 * 60,
  mergeGapMs: 15_000,
  units: 'metric',
  birthDate: '2026-08-01',
  carers: { 'user-1': 'Joel' },
};
const NOW = new Date('2026-10-08T12:00:00Z');
const bottle = (startedAt: string, amountMl: number): BabyEvent => ({
  id: `bottle-${startedAt}`,
  babyId: 'baby-1',
  createdBy: 'user-1',
  createdDevice: null,
  createdAt: startedAt,
  updatedAt: startedAt,
  deletedAt: null,
  source: 'manual',
  sessionState: null,
  endedBy: null,
  endedDevice: null,
  endRecordedAt: null,
  type: 'bottle',
  startedAt,
  endedAt: startedAt,
  notes: null,
  details: { content: 'formula', amountMl, amountLeftMl: null },
});
const events = [
  bottle('2026-10-06T08:00:00Z', 60),
  bottle('2026-10-07T08:00:00Z', 90),
  bottle('2026-10-07T12:00:00Z', 30),
];
const spec = (overrides: Partial<ReportSpec>): ReportSpec => ({
  ...emptySpec(),
  range: { preset: '7d' },
  ...overrides,
});

describe('ReportCard', () => {
  it('shows figures, labels each bar and reads out the hovered one', () => {
    const result = runReport(spec({ series: [{ measure: 'feeds.bottleMl' }] }), events, '2026-10-08', NOW, settings);
    render(<ReportCard result={result} units="metric" title="Bottle intake" meta="7 days" />);
    expect(screen.getByRole('heading', { name: 'Bottle intake' })).toBeInTheDocument();
    expect(screen.getByText('Per day')).toBeInTheDocument();
    expect(screen.getByText('30 ml')).toBeInTheDocument();
    const bar = screen.getByRole('img', { name: 'Wed 7 Oct · Bottle volume 120 ml' });
    fireEvent.mouseEnter(bar);
    expect(screen.getByText('Bottle volume 120 ml')).toBeInTheDocument();
    expect(screen.getByText('Fri 2 Oct')).toBeInTheDocument();
    expect(screen.getByText('Today')).toBeInTheDocument();
  });

  it('draws a donut with a legend, a table, a number and an empty state', () => {
    const donut = runReport(
      spec({ series: [{ measure: 'feeds.bottleMl' }], splitBy: 'carer', chart: 'donut' }),
      events,
      '2026-10-08',
      NOW,
      settings,
    );
    const { rerender } = render(<ReportCard result={donut} units="metric" title="Who gives bottles" />);
    expect(screen.getByText('Joel')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();

    const table = runReport(
      spec({ series: [{ measure: 'feeds.bottles' }], chart: 'table' }),
      events,
      '2026-10-08',
      NOW,
      settings,
    );
    rerender(<ReportCard result={table} units="metric" title="Bottles" />);
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /Wed 7 Oct 2/ })).toBeInTheDocument();

    const number = runReport(
      spec({ series: [{ measure: 'feeds.bottles' }], chart: 'number', compare: 'previous' }),
      events,
      '2026-10-08',
      NOW,
      settings,
    );
    rerender(<ReportCard result={number} units="metric" title="Bottles" />);
    expect(screen.getByText('0.5')).toBeInTheDocument();
    expect(screen.getByText(/Up 0.5 on the previous 7 days/)).toBeInTheDocument();

    const empty = runReport(spec({ series: [{ measure: 'pump.ml' }] }), events, '2026-10-08', NOW, settings);
    rerender(<ReportCard result={empty} units="metric" title="Pumped" />);
    expect(screen.getByText('Nothing logged in this range yet')).toBeInTheDocument();

    rerender(<ReportCard result={null} units="metric" title="Loading" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders heatmap, histogram and rhythm charts', () => {
    const heat = runReport(
      spec({ series: [{ measure: 'feeds.count' }], bucket: 'hour', chart: 'heatmap' }),
      events,
      '2026-10-08',
      NOW,
      settings,
    );
    const { rerender } = render(<ReportCard result={heat} units="metric" title="When feeds happen" />);
    expect(screen.getByRole('img', { name: 'Feeds by hour of day, one row per day' })).toBeInTheDocument();

    const hist = runReport(
      spec({ series: [{ measure: 'feeds.perBottle' }], chart: 'histogram' }),
      events,
      '2026-10-08',
      NOW,
      settings,
    );
    rerender(<ReportCard result={hist} units="metric" title="Bottle sizes" />);
    expect(screen.getByText('Median')).toBeInTheDocument();
    expect(screen.getAllByText('60 ml').length).toBeGreaterThan(0);

    const rhythm = runReport(
      spec({ series: [{ measure: 'feeds.count' }], chart: 'rhythm' }),
      events,
      '2026-10-08',
      NOW,
      settings,
    );
    rerender(<ReportCard result={rhythm} units="metric" title="Last 7 days" />);
    expect(
      screen.getByRole('img', { name: 'Sleep, feeds and nappies as blocks, one row per day' }),
    ).toBeInTheDocument();
  });
});
