import { babyChoices } from '@babble/api';
import { sampleBaby, sampleFamily, sampleRunningSleep } from '@babble/api/fixtures';
import { runningIndicator } from '@babble/domain';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FixtureRouter } from '#/fixtures/router';
import { AppShell } from './app-shell';

const choices = babyChoices([sampleFamily]);

async function renderShell(running: ReturnType<typeof runningIndicator>, initialPath = '/timeline') {
  render(
    <FixtureRouter initialPath={initialPath}>
      <AppShell family={sampleFamily} baby={sampleBaby} choices={choices} onSelectBaby={() => {}} running={running}>
        <p>Page</p>
      </AppShell>
    </FixtureRouter>,
  );
  await screen.findByText('Page');
}

describe('AppShell', () => {
  it('marks Home in every nav when a nap is running on another tab', async () => {
    await renderShell(runningIndicator([sampleRunningSleep(new Date())]));
    expect(screen.getAllByRole('link', { name: 'Home, nap running' })).toHaveLength(2);
    expect(screen.getAllByTestId('running-dot').length).toBeGreaterThan(0);
  });

  it('hides the dot while on Home', async () => {
    await renderShell(runningIndicator([sampleRunningSleep(new Date())]), '/');
    expect(screen.queryByTestId('running-dot')).toBeNull();
    expect(screen.getAllByRole('link', { name: 'Home' })).toHaveLength(2);
  });

  it('shows no dot when nothing is running', async () => {
    await renderShell(null);
    expect(screen.queryByTestId('running-dot')).toBeNull();
    expect(screen.getAllByRole('link', { name: 'Home' })).toHaveLength(2);
  });

  it('gives each family member their own avatar colour', async () => {
    await renderShell(null);
    const tone = (name: string) => screen.getAllByTitle(name)[0]!.dataset.tone;
    expect(tone('John')).toBe('person-1');
    expect(tone('Jane')).toBe('person-2');
  });
});
