import { growthReport, type BabyEvent } from '@babble/domain';
import { render, screen } from '@testing-library/react-native';
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

  it('asks for the sex when it is not set', async () => {
    const report = growthReport([weighIn], { birthDate: '2026-09-01', sex: null, timeZone: 'UTC' }, 'metric');
    await render(<GrowthCard report={report} babyName="Olivia" timeZone="UTC" />);
    expect(screen.getByText(/Set Olivia's sex in Settings/)).toBeTruthy();
    expect(screen.queryByText(/percentile$/)).toBeNull();
  });
});
