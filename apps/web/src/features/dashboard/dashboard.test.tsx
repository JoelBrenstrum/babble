import { sampleBaby, sampleFamily, sampleStatsReport } from '@babble/api/fixtures';
import type { BabbleClient } from '@babble/api';
import type { DashboardLayout } from '@babble/domain';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FixtureRouter } from '#/fixtures/router';
import { Dashboard, type DashboardSources } from './dashboard';

const now = new Date('2026-10-08T12:00:00Z');

function sources(overrides: Partial<DashboardSources> = {}): DashboardSources {
  return {
    stats: sampleStatsReport(now),
    growth: null,
    patterns: null,
    reports: [],
    client: {} as BabbleClient,
    baby: sampleBaby,
    family: sampleFamily,
    now,
    babyName: 'Olivia',
    canLog: true,
    plusBadges: true,
    linkBars: false,
    ...overrides,
  };
}

const layout: DashboardLayout = {
  version: 1,
  cards: [
    { id: 'sleep', kind: 'prebuilt', card: 'sleep', size: 's' },
    { id: 'note', kind: 'text', body: 'Started formula top-ups', size: 's' },
    { id: 'wake', kind: 'prebuilt', card: 'wake', size: 'm' },
  ],
};

describe('Dashboard', () => {
  it('shows prebuilt cards with data, notes, and hides empty prebuilt cards until arranging', async () => {
    const { rerender } = render(
      <FixtureRouter>
        <Dashboard layout={layout} sources={sources()} arranging={false} onChange={vi.fn()} onAdd={vi.fn()} />
      </FixtureRouter>,
    );
    expect(await screen.findByRole('heading', { name: 'Sleep' })).toBeInTheDocument();
    expect(screen.getByText('Started formula top-ups')).toBeInTheDocument();
    expect(screen.queryByText('Wake windows')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add card' })).not.toBeInTheDocument();

    rerender(
      <FixtureRouter>
        <Dashboard layout={layout} sources={sources()} arranging onChange={vi.fn()} onAdd={vi.fn()} />
      </FixtureRouter>,
    );
    expect((await screen.findAllByText('Wake windows')).length).toBeGreaterThan(0);
    expect(screen.getByText('Shows once there are two weeks of entries.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add card' })).toBeInTheDocument();
  });

  it('moves, resizes, edits and removes cards while arranging', async () => {
    const onChange = vi.fn();
    render(
      <FixtureRouter>
        <Dashboard layout={layout} sources={sources()} arranging onChange={onChange} onAdd={vi.fn()} />
      </FixtureRouter>,
    );
    const noteBar = await screen.findByLabelText('Arrange Note');
    fireEvent.click(noteBar.querySelector('[aria-label="Move up"]')!);
    expect(onChange.mock.calls.at(-1)![0].cards.map((card: { id: string }) => card.id)).toEqual([
      'note',
      'sleep',
      'wake',
    ]);
    fireEvent.click(noteBar.querySelector('[aria-label="Make wide"]')!);
    expect(onChange.mock.calls.at(-1)![0].cards[1]).toMatchObject({ id: 'note', size: 'm' });
    fireEvent.change(screen.getByLabelText('Note'), { target: { value: 'Changed' } });
    await waitFor(() => expect(onChange.mock.calls.at(-1)![0].cards[1]).toMatchObject({ body: 'Changed' }));
    fireEvent.click(noteBar.querySelector('[aria-label="Remove card"]')!);
    expect(onChange.mock.calls.at(-1)![0].cards.map((card: { id: string }) => card.id)).toEqual(['sleep', 'wake']);
  });

  it('offers the Plus teaser for locked pattern cards', async () => {
    render(
      <FixtureRouter>
        <Dashboard
          layout={layout}
          sources={sources({ patterns: { locked: true } })}
          arranging={false}
          onChange={vi.fn()}
          onAdd={vi.fn()}
        />
      </FixtureRouter>,
    );
    expect(await screen.findByText('Wake windows is part of Babble Plus.')).toBeInTheDocument();
  });
});
