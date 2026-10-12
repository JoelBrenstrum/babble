import type { BabySettingsRow } from '@babble/api';
import { sampleBaby } from '@babble/api/fixtures';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { fixtureClient } from '@/fixtures/client';
import { BabyTrackingSettings, FamilyTrackingSettings } from './tracking-settings';

const mockSettings: BabySettingsRow = {
  baby_id: sampleBaby.id,
  units: 'metric',
  night_start_minutes: 1140,
  night_end_minutes: 420,
  downtime_merge_threshold_sec: 15,
  auto_end_paused_session_min: 30,
  feed_reminder_enabled: false,
  feed_reminder_interval_min: null,
  feed_reminder_at_night: true,
  nappy_prompt: 'feed_start',
  updated_at: '2026-10-01T00:00:00Z',
};

const mockUpdateFamilySettings = jest.fn();
const mockUpdateBabySettings = jest.fn();
jest.mock('@babble/api', () => {
  const api = jest.requireActual('@babble/api');
  return {
    ...api,
    babySettingsQuery: (_client: unknown, babyId: string) => ({
      queryKey: api.queryKeys.babySettings(babyId),
      queryFn: async () => mockSettings,
    }),
    updateBabySettings: (...args: unknown[]) => mockUpdateBabySettings(...args),
    updateFamilySettings: (...args: unknown[]) => mockUpdateFamilySettings(...args),
  };
});

function wrap(children: ReactNode) {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
}

describe('FamilyTrackingSettings', () => {
  it('saves units for the whole family', async () => {
    mockUpdateFamilySettings.mockResolvedValue({ family_id: 'family-1', units: 'imperial' });
    await render(
      wrap(
        <FamilyTrackingSettings client={fixtureClient} familyId="family-1" babyId={sampleBaby.id} disabled={false} />,
      ),
    );
    await fireEvent.press(await screen.findByText('Imperial'));
    await waitFor(() =>
      expect(mockUpdateFamilySettings).toHaveBeenCalledWith(fixtureClient, 'family-1', { units: 'imperial' }),
    );
    expect(mockUpdateBabySettings).not.toHaveBeenCalled();
    expect(screen.queryByText('Feed reminders')).toBeNull();
  });
});

describe('BabyTrackingSettings', () => {
  it('keeps units and feed rules out of the baby settings', async () => {
    await render(wrap(<BabyTrackingSettings client={fixtureClient} babyId={sampleBaby.id} disabled={false} />));
    expect(await screen.findByText('Reminders and night')).toBeTruthy();
    expect(screen.queryByText('Units')).toBeNull();
    expect(screen.queryByText('Ignore gaps shorter than')).toBeNull();
  });
});
