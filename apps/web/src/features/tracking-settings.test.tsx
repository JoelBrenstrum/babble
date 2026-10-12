import type { BabySettingsRow } from '@babble/api';
import { sampleBaby } from '@babble/api/fixtures';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { fixtureClient } from '#/fixtures/client';
import { BabyTrackingSettings, FamilyTrackingSettings } from './tracking-settings';

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
  nappy_prompt: 'feed_start',
  updated_at: '2026-10-01T00:00:00Z',
};

let current = settings;
const updateBabySettings = vi.fn();
const updateFamilySettings = vi.fn();
vi.mock('@babble/api', async (importOriginal) => {
  const api = await importOriginal<typeof import('@babble/api')>();
  return {
    ...api,
    babySettingsQuery: (_client: unknown, babyId: string) => ({
      queryKey: api.queryKeys.babySettings(babyId),
      queryFn: async () => current,
    }),
    updateBabySettings: (...args: unknown[]) => updateBabySettings(...args),
    updateFamilySettings: (...args: unknown[]) => updateFamilySettings(...args),
  };
});

describe('BabyTrackingSettings', () => {
  it('turns reminders on at the chosen interval', async () => {
    updateBabySettings.mockResolvedValue({ ...settings, feed_reminder_enabled: true, feed_reminder_interval_min: 150 });
    render(
      <QueryClientProvider client={new QueryClient()}>
        <BabyTrackingSettings client={fixtureClient} babyId={sampleBaby.id} disabled={false} />
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
        <BabyTrackingSettings client={fixtureClient} babyId={sampleBaby.id} disabled={false} />
      </QueryClientProvider>,
    );
    await userEvent.click(await screen.findByRole('radio', { name: 'Quiet' }));
    expect(updateBabySettings).toHaveBeenLastCalledWith(fixtureClient, sampleBaby.id, {
      feed_reminder_at_night: false,
    });
    expect(await screen.findByRole('radio', { name: 'Quiet', checked: true })).toBeInTheDocument();
  });

  it('chooses when to ask about a nappy', async () => {
    current = settings;
    updateBabySettings.mockResolvedValue({ ...settings, nappy_prompt: 'first_side' });
    render(
      <QueryClientProvider client={new QueryClient()}>
        <BabyTrackingSettings client={fixtureClient} babyId={sampleBaby.id} disabled={false} />
      </QueryClientProvider>,
    );
    expect(await screen.findByRole('checkbox', { name: 'When a feed starts', checked: true })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('checkbox', { name: 'After the first side' }));
    expect(updateBabySettings).toHaveBeenLastCalledWith(fixtureClient, sampleBaby.id, { nappy_prompt: 'first_side' });
    expect(await screen.findByRole('checkbox', { name: 'After the first side', checked: true })).toBeInTheDocument();
  });
});

describe('FamilyTrackingSettings', () => {
  it('saves units for the whole family', async () => {
    current = settings;
    updateFamilySettings.mockResolvedValue({ family_id: 'family-1', units: 'imperial' });
    render(
      <QueryClientProvider client={new QueryClient()}>
        <FamilyTrackingSettings client={fixtureClient} familyId="family-1" babyId={sampleBaby.id} disabled={false} />
      </QueryClientProvider>,
    );
    await userEvent.click(await screen.findByRole('radio', { name: 'Imperial (oz, lb, in)' }));
    expect(updateFamilySettings).toHaveBeenCalledWith(fixtureClient, 'family-1', { units: 'imperial' });
    expect(updateBabySettings).not.toHaveBeenCalledWith(fixtureClient, sampleBaby.id, { units: 'imperial' });
  });

  it('leaves baby-only settings out', async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <FamilyTrackingSettings client={fixtureClient} familyId="family-1" babyId={sampleBaby.id} disabled={false} />
      </QueryClientProvider>,
    );
    expect(await screen.findByText('Units and feeds')).toBeInTheDocument();
    expect(screen.queryByText('Feed reminders')).toBeNull();
    expect(screen.queryByLabelText('Night starts')).toBeNull();
  });
});
