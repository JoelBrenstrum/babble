import { sampleBaby, sampleRunningSleep } from '@babble/api/fixtures';
import type { BabyEvent } from '@babble/domain';
import { render, screen } from '@testing-library/react-native';
import { EventRow } from './event-row';

jest.mock('expo-router', () => ({ Link: ({ children }: { children: React.ReactNode }) => children }));

const now = new Date('2026-10-06T10:30:00Z');

const nappy = {
  ...sampleRunningSleep(now),
  type: 'nappy',
  endedAt: now.toISOString(),
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
    await render(<EventRow event={nappy} timeZone={sampleBaby.timezone} units="metric" now={now} />);
    for (const text of ['Both', 'Seedy', 'Black', 'Check', 'Large', 'Changed at nana’s']) {
      expect(screen.getByText(text)).toBeTruthy();
    }
  });

  it('can leave the notes to the group heading', async () => {
    await render(<EventRow event={nappy} timeZone={sampleBaby.timezone} units="metric" now={now} showNotes={false} />);
    expect(screen.queryByText('Changed at nana’s')).toBeNull();
  });

  it('marks running entries as in progress and keeps their duration', async () => {
    await render(<EventRow event={sampleRunningSleep(now)} timeZone={sampleBaby.timezone} units="metric" now={now} />);
    expect(screen.getByText('In progress')).toBeTruthy();
    expect(screen.getByText('Bassinet')).toBeTruthy();
    expect(screen.getByText('1h 12m')).toBeTruthy();
    expect(screen.queryByText('Running')).toBeNull();
  });
});
