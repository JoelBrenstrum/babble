import { sampleBaby, sampleFamily, sampleStatsReport } from '@babble/api/fixtures';
import type { BabbleClient } from '@babble/api';
import type { DashboardLayout } from '@babble/domain';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { FixtureRouter } from '#/fixtures/router';
import { Dashboard, type DashboardSources } from './dashboard';
import { TextCard } from './text-card';

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

function renderEditable() {
  let latest = layout;
  function Editable() {
    const [current, setCurrent] = useState(layout);
    const [arranging, setArranging] = useState(true);
    return (
      <FixtureRouter>
        <Dashboard
          layout={current}
          sources={sources()}
          arranging={arranging}
          onChange={(edit) => {
            latest = edit(latest);
            setCurrent(latest);
          }}
          onAdd={vi.fn()}
        />
        <button type="button" onClick={() => setArranging((value) => !value)}>
          {arranging ? 'Done' : 'Arrange'}
        </button>
      </FixtureRouter>
    );
  }
  render(<Editable />);
  return { saved: () => latest };
}

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
    const view = renderEditable();
    const noteBar = await screen.findByLabelText('Arrange Note');
    fireEvent.click(noteBar.querySelector('[aria-label="Move up"]')!);
    expect(view.saved().cards.map((card) => card.id)).toEqual(['note', 'sleep', 'wake']);
    fireEvent.click(screen.getByLabelText('Arrange Note').querySelector('[aria-label="Make wide"]')!);
    expect(view.saved().cards[0]).toMatchObject({ id: 'note', size: 'm' });
    fireEvent.change(screen.getByLabelText('Note'), { target: { value: 'Changed' } });
    await waitFor(() => expect(view.saved().cards[0]).toMatchObject({ body: 'Changed' }));
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(screen.getByText('Changed')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Arrange' }));
    fireEvent.click(screen.getByLabelText('Arrange Note').querySelector('[aria-label="Remove card"]')!);
    expect(view.saved().cards.map((card) => card.id)).toEqual(['sleep', 'wake']);
  });

  it('keeps a note saved on blur when a resize follows straight after', async () => {
    const view = renderEditable();
    const note = await screen.findByLabelText('Note');
    fireEvent.change(note, { target: { value: 'Typed' } });
    fireEvent.blur(note);
    fireEvent.click(screen.getByLabelText('Arrange Note').querySelector('[aria-label="Make wide"]')!);
    expect(view.saved().cards[1]).toMatchObject({ id: 'note', size: 'm', body: 'Typed' });
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(view.saved().cards[1]).toMatchObject({ id: 'note', size: 'm', body: 'Typed' });
    expect(screen.getByLabelText('Note')).toHaveValue('Typed');
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

  it('labels each arrange toolbar as a group', async () => {
    render(
      <FixtureRouter>
        <Dashboard layout={layout} sources={sources()} arranging onChange={vi.fn()} onAdd={vi.fn()} />
      </FixtureRouter>,
    );
    expect(await screen.findByRole('group', { name: 'Arrange Note' })).toBeInTheDocument();
  });
});

describe('TextCard', () => {
  it('follows a note changed elsewhere without saving over it', async () => {
    const onChange = vi.fn();
    const { rerender } = render(<TextCard body="First" editing onChange={onChange} />);
    rerender(<TextCard body="Changed by someone else" editing onChange={onChange} />);
    expect(screen.getByLabelText('Note')).toHaveValue('Changed by someone else');
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('saves once when the note loses focus and the save lands', async () => {
    const onChange = vi.fn();
    function Saved() {
      const [body, setBody] = useState('First');
      const [editing, setEditing] = useState(true);
      return (
        <>
          <TextCard
            body={body}
            editing={editing}
            onChange={(next) => {
              onChange(next);
              setBody(next);
            }}
          />
          <button type="button" onClick={() => setEditing(false)}>
            Done
          </button>
        </>
      );
    }
    render(<Saved />);
    const note = screen.getByLabelText('Note');
    fireEvent.change(note, { target: { value: 'Typed' } });
    fireEvent.blur(note);
    await new Promise((resolve) => setTimeout(resolve, 500));
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(screen.getByText('Typed')).toBeInTheDocument();
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('saves the typed note again when a different note replaced the one saved on blur', async () => {
    const saved: string[] = [];
    const { rerender } = render(<TextCard body="" editing onChange={(next) => saved.push(next)} />);
    const note = screen.getByLabelText('Note');
    fireEvent.change(note, { target: { value: 'Typed' } });
    fireEvent.blur(note);
    rerender(<TextCard body="Someone else" editing onChange={(next) => saved.push(next)} />);
    await waitFor(() => expect(saved).toHaveLength(2));
    expect(saved.at(-1)).toBe('Typed');
    expect(screen.getByLabelText('Note')).toHaveValue('Typed');
  });
});
