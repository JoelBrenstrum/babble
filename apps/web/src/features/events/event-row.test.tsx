import { sampleBaby, sampleRunningSleep } from '@babble/api/fixtures';
import type { BabyEvent } from '@babble/domain';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FixtureRouter } from '#/fixtures/router';
import { EventRow } from './event-row';

const now = new Date('2026-10-06T10:30:00Z');

function renderRow(event: BabyEvent, props: { showNotes?: boolean } = {}) {
  render(
    <FixtureRouter>
      <EventRow event={event} timeZone={sampleBaby.timezone} units="metric" now={now} {...props} />
    </FixtureRouter>,
  );
}

const nappy = {
  ...sampleRunningSleep(now),
  type: 'nappy',
  endedAt: now.toISOString(),
  segments: undefined,
  notes: 'Changed at nana’s',
  details: {
    wet: true,
    dirty: true,
    wetSize: 'medium',
    pooSize: 'large',
    pooColours: ['black'],
    pooTextures: ['seedy'],
    rash: false,
  },
} as unknown as BabyEvent;

describe('EventRow', () => {
  it('shows nappy type, texture, colour, a caution pill and the size', async () => {
    renderRow(nappy);
    expect(await screen.findByText('Both')).toBeInTheDocument();
    expect(screen.getByText('Seedy')).toBeInTheDocument();
    expect(screen.getByText('Black')).toBeInTheDocument();
    expect(screen.getByText('Check')).toBeInTheDocument();
    expect(screen.getByText('Large')).toBeInTheDocument();
    expect(screen.getByText('Changed at nana’s')).toBeInTheDocument();
  });

  it('can leave the notes to the group heading', async () => {
    renderRow(nappy, { showNotes: false });
    await screen.findByText('Both');
    expect(screen.queryByText('Changed at nana’s')).not.toBeInTheDocument();
  });

  it('marks running entries as in progress and keeps their duration', async () => {
    renderRow(sampleRunningSleep(now));
    expect(await screen.findByText('In progress')).toBeInTheDocument();
    expect(screen.getByText('Bassinet')).toBeInTheDocument();
    expect(screen.getByText('1h 12m')).toBeInTheDocument();
    expect(screen.queryByText('Running')).not.toBeInTheDocument();
  });
});
