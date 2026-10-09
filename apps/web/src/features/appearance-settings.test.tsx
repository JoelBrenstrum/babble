import type { BabySettingsRow } from '@babble/api';
import { sampleBaby } from '@babble/api/fixtures';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fixtureClient } from '#/fixtures/client';
import { AppearanceSettings } from './appearance-settings';

const settings = { night_start_minutes: 1140, night_end_minutes: 420 } as BabySettingsRow;

vi.mock('@babble/api', async (importOriginal) => {
  const api = await importOriginal<typeof import('@babble/api')>();
  return {
    ...api,
    babySettingsQuery: (_client: unknown, babyId: string) => ({
      queryKey: api.queryKeys.babySettings(babyId),
      queryFn: async () => settings,
    }),
  };
});

describe('AppearanceSettings', () => {
  afterEach(() => localStorage.clear());

  it('saves dark at night and explains the window', async () => {
    window.matchMedia = ((query: string) => ({ matches: false, media: query })) as typeof window.matchMedia;
    render(
      <QueryClientProvider client={new QueryClient()}>
        <AppearanceSettings client={fixtureClient} baby={sampleBaby} />
      </QueryClientProvider>,
    );
    expect(screen.queryByText(/Dark between/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: 'Dark at night' }));
    expect(localStorage.getItem('babble.theme')).toBe('night');
    expect(screen.getByRole('radio', { name: 'Dark at night', checked: true })).toBeInTheDocument();
    expect(
      await screen.findByText(`Dark between 7:00 pm and 7:00 am, from ${sampleBaby.name}'s night settings.`),
    ).toBeInTheDocument();
  });

  it('starts on the saved choice', () => {
    localStorage.setItem('babble.theme', 'night');
    render(
      <QueryClientProvider client={new QueryClient()}>
        <AppearanceSettings client={fixtureClient} baby={sampleBaby} />
      </QueryClientProvider>,
    );
    expect(screen.getByRole('radio', { name: 'Dark at night', checked: true })).toBeInTheDocument();
  });
});
