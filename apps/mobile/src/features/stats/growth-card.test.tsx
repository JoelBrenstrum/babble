import { growthReport, type BabyEvent } from '@babble/domain';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { GrowthCard } from './growth-card';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const weighIn = {
  id: 'growth-1',
  babyId: 'baby-1',
  createdBy: 'user-1',
  createdAt: '2026-10-01T10:00:00Z',
  updatedAt: '2026-10-01T10:00:00Z',
  deletedAt: null,
  source: 'manual',
  sessionState: null,
  type: 'growth',
  startedAt: '2026-10-01T10:00:00Z',
  endedAt: null,
  notes: '',
  details: { weightG: 4187, lengthMm: null, headCircumferenceMm: null },
} as BabyEvent;

describe('GrowthCard', () => {
  it('shows the latest weight with its WHO percentile', async () => {
    const report = growthReport([weighIn], { birthDate: '2026-09-01', sex: 'female', timeZone: 'UTC' }, 'metric');
    await render(<GrowthCard report={report} babyName="Olivia" timeZone="UTC" />);
    expect(screen.getByText('4.19 kg')).toBeTruthy();
    expect(screen.getByText('51st percentile')).toBeTruthy();
  });

  it('shows the measurement and percentile for a tapped point', async () => {
    const report = growthReport([weighIn], { birthDate: '2026-09-01', sex: 'female', timeZone: 'UTC' }, 'metric');
    await render(<GrowthCard report={report} babyName="Olivia" timeZone="UTC" />);
    expect(screen.getByText('Tap a point to see it')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('growth-point-weight-0'));
    expect(screen.getByText('1 Oct · 4.19 kg · 51st percentile')).toBeTruthy();
  });

  it('asks for the sex when it is not set', async () => {
    const report = growthReport([weighIn], { birthDate: '2026-09-01', sex: null, timeZone: 'UTC' }, 'metric');
    await render(<GrowthCard report={report} babyName="Olivia" timeZone="UTC" />);
    expect(screen.getByText(/Set Olivia's sex in Settings/)).toBeTruthy();
    expect(screen.queryByText(/percentile$/)).toBeNull();
  });

  it("shows today's estimate and its readout when the report has one", async () => {
    const at = (id: string, startedAt: string, weightG: number) =>
      ({ ...weighIn, id, startedAt, details: { weightG, lengthMm: null, headCircumferenceMm: null } }) as BabyEvent;
    const report = growthReport(
      [at('g1', '2026-09-01T10:00:00Z', 3232), at('g2', '2026-09-15T10:00:00Z', 3700), weighIn],
      { birthDate: '2026-09-01', sex: 'female', timeZone: 'UTC' },
      'metric',
      new Date('2026-10-14T10:00:00Z'),
    );
    await render(<GrowthCard report={report} babyName="Olivia" timeZone="UTC" plusBadge />);
    expect(screen.getByText('Estimate for today')).toBeTruthy();
    expect(screen.queryByText(/^Next:/)).toBeNull();
    await fireEvent.press(screen.getByTestId('growth-milestone-weight-0'));
    expect(screen.getByText(/^5 kg around \d+ \w+$/)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('growth-estimate-weight'));
    expect(screen.getByText(/^Estimate for today · \d\.\d+ kg · \d+(st|nd|rd|th) percentile$/)).toBeTruthy();
  });
});
