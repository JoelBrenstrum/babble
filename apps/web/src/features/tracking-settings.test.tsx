import type { BabySettingsRow } from '@babble/api';
import { sampleBaby } from '@babble/api/fixtures';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { fixtureClient } from '#/fixtures/client';
import { TrackingSettings } from './tracking-settings';

const settings: BabySettingsRow = {
  baby_id: sampleBaby.id,
  units: 'metric',
  night_start_minutes: 1140,
  night_end_minutes: 420,
  downtime_merge_threshold_sec: 15,
  auto_end_paused_session_min: 30,
  feed_reminder_enabled: false,
  feed_reminder_interval_min: null,
  feed_reminder_at_night: true,
  updated_at: '2026-10-01T00:00:00Z',
};

let current = settings;
const updateBabySettings = vi.fn();
vi.mock('@babble/api', async (importOriginal) => {
  const api = await importOriginal<typeof import('@babble/api')>();
  return {
    ...api,
    babySettingsQuery: (_client: unknown, babyId: string) => ({
      queryKey: api.queryKeys.babySettings(babyId),
      queryFn: async () => current,
    }),
    updateBabySettings: (...args: unknown[]) => updateBabySettings(...args),
  };
});

describe('TrackingSettings feed reminders', () => {
  it('turns reminders on at the chosen interval', async () => {
    updateBabySettings.mockResolvedValue({ ...settings, feed_reminder_enabled: true, feed_reminder_interval_min: 150 });
    render(
      <QueryClientProvider client={new QueryClient()}>
        <TrackingSettings client={fixtureClient} babyId={sampleBaby.id} disabled={false} />
      </QueryClientProvider>,
    );
    expect(await screen.findByRole('checkbox', { name: 'Off', checked: true })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('checkbox', { name: '2h 30m' }));
    expect(updateBabySettings).toHaveBeenCalledWith(fixtureClient, sampleBaby.id, {
      feed_reminder_enabled: true,
      feed_reminder_interval_min: 150,
    });
    expect(await screen.findByRole('checkbox', { name: '2h 30m', checked: true })).toBeInTheDocument();
  });

  it('can keep reminders quiet at night once they are on', async () => {
    current = { ...settings, feed_reminder_enabled: true, feed_reminder_interval_min: 180 };
    updateBabySettings.mockResolvedValue({ ...current, feed_reminder_at_night: false });
    render(
      <QueryClientProvider client={new QueryClient()}>
        <TrackingSettings client={fixtureClient} babyId={sampleBaby.id} disabled={false} />
      </QueryClientProvider>,
    );
    await userEvent.click(await screen.findByRole('radio', { name: 'Quiet' }));
    expect(updateBabySettings).toHaveBeenLastCalledWith(fixtureClient, sampleBaby.id, {
      feed_reminder_at_night: false,
    });
    expect(await screen.findByRole('radio', { name: 'Quiet', checked: true })).toBeInTheDocument();
  });
});
