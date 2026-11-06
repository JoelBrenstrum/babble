import { emptySpec, runReport, type BabyEvent, type ReportSettings, type ReportSpec } from '@babble/domain';
import { fireEvent, render, screen } from '@testing-library/react-native';
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
  it('shows figures and reads out a tapped bar', async () => {
    const result = runReport(spec({ series: [{ measure: 'feeds.bottleMl' }] }), events, '2026-10-08', NOW, settings);
    await render(<ReportCard result={result} units="metric" title="Bottle intake" meta="7 days" />);
    expect(screen.getByRole('header', { name: 'Bottle intake' })).toBeTruthy();
    expect(screen.getByText('Per day')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Wed 7 Oct · Bottle volume 120 ml'));
    expect(screen.getByText('Wed 7 Oct Bottle volume 120 ml')).toBeTruthy();
  });

  it('renders a donut, a heatmap and an empty state', async () => {
    const donut = runReport(
      spec({ series: [{ measure: 'feeds.bottleMl' }], splitBy: 'carer', chart: 'donut' }),
      events,
      '2026-10-08',
      NOW,
      settings,
    );
    await render(<ReportCard result={donut} units="metric" title="Who gives bottles" compact />);
    expect(screen.getByText('Joel')).toBeTruthy();
    expect(screen.getByText('100%')).toBeTruthy();

    const heat = runReport(
      spec({ series: [{ measure: 'feeds.count' }], bucket: 'hour', chart: 'heatmap' }),
      events,
      '2026-10-08',
      NOW,
      settings,
    );
    await screen.rerender(<ReportCard result={heat} units="metric" title="When feeds happen" />);
    expect(screen.getByLabelText('Feeds by hour of day, one row per day')).toBeTruthy();

    const empty = runReport(spec({ series: [{ measure: 'pump.ml' }] }), events, '2026-10-08', NOW, settings);
    await screen.rerender(<ReportCard result={empty} units="metric" title="Pumped" />);
    expect(screen.getByText('Nothing logged in this range yet')).toBeTruthy();
  });
});
