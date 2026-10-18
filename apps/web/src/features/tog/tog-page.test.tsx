import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FixtureRouter } from '#/fixtures/router';
import { TogCalculator } from './tog-calculator';
import { TogPage } from './tog-page';

const now = new Date('2026-10-19T02:00:00Z');

async function renderPage(signedIn = false) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <FixtureRouter>
        <TogPage signedIn={signedIn} now={now} />
      </FixtureRouter>
    </QueryClientProvider>,
  );
  return screen.findByRole('heading', { level: 1, name: 'TOG calculator' });
}

function calculator() {
  return within(screen.getByRole('region', { name: 'TOG calculator' }));
}

describe('TogPage', () => {
  it('opens on room temperature with a way into babble', async () => {
    await renderPage();
    expect(screen.getByText('Free tool · no sign-in')).toBeInTheDocument();
    expect(calculator().getByRole('radio', { name: 'Room temp → TOG' })).toBeChecked();
    expect(calculator().getByText('1.0 TOG')).toBeInTheDocument();
    expect(calculator().getByText('22 °C is 72 °F')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Try babble' })).toHaveAttribute('href', '/sign-in');
    expect(screen.getByRole('img', { name: /running nap/ })).toBeInTheDocument();
  });

  it('offers to open babble when signed in', async () => {
    await renderPage(true);
    expect(screen.getAllByRole('link', { name: 'Open babble' }).length).toBeGreaterThan(1);
    expect(screen.queryByRole('link', { name: 'Try babble' })).toBeNull();
  });
});

describe('TogCalculator', () => {
  function renderCalculator() {
    render(<TogCalculator />);
    return calculator();
  }

  it('steps the temperature and crosses onto a band edge', () => {
    const view = renderCalculator();
    for (let i = 0; i < 4; i++) fireEvent.click(view.getByRole('button', { name: 'Decrease room temperature' }));
    expect(view.getByText('1.0–2.5 TOG')).toBeInTheDocument();
    expect(view.getByText('20 °C sits between two bands. Go 2.5 if the room cools overnight.')).toBeInTheDocument();
    expect(view.getByText('Long-sleeve bodysuit, or a sleepsuit')).toBeInTheDocument();
  });

  it('switches to °F and keeps the same temperature', () => {
    const view = renderCalculator();
    fireEvent.click(view.getByRole('radio', { name: '°F' }));
    expect(view.getByText('72')).toBeInTheDocument();
    expect(view.getByText('For a room of 68–75 °F')).toBeInTheDocument();
    expect(view.getByText('Steps of 1 °F · tap the number to type it')).toBeInTheDocument();
  });

  it('types a temperature on the keypad', () => {
    const view = renderCalculator();
    fireEvent.click(view.getByRole('button', { name: /Tap to type a value/ }));
    const pad = within(view.getByRole('dialog', { name: 'Type the room temperature' }));
    for (const key of ['1', '5', '.', '5']) fireEvent.click(pad.getByRole('button', { name: key }));
    fireEvent.click(pad.getByRole('button', { name: 'Done' }));
    expect(view.queryByRole('dialog')).toBeNull();
    expect(view.getByText('15.5')).toBeInTheDocument();
    expect(view.getByText('2.5–3.5 TOG')).toBeInTheDocument();
  });

  it('answers in the other direction from a bag rating', () => {
    const view = renderCalculator();
    fireEvent.click(view.getByRole('radio', { name: 'Bag TOG → room temp' }));
    expect(view.getByText('A 2.5 TOG bag suits')).toBeInTheDocument();
    expect(view.getByText('16–20 °C')).toBeInTheDocument();
    expect(view.getByText('Warmer than 20 °C:')).toBeInTheDocument();
    fireEvent.click(view.getByRole('radio', { name: '2.0' }));
    expect(view.getByText('17–22 °C')).toBeInTheDocument();
    expect(view.getByText("Brands rate in-between bags differently. Check the label's own guide.")).toBeInTheDocument();
    fireEvent.click(view.getByRole('button', { name: 'Increase bag tog' }));
    expect(view.getByText('A 2.5 TOG bag suits')).toBeInTheDocument();
  });

  it('reads a typed rating above the chart as 3.5', () => {
    const view = renderCalculator();
    fireEvent.click(view.getByRole('radio', { name: 'Bag TOG → room temp' }));
    fireEvent.click(view.getByRole('button', { name: /Tap to type a value/ }));
    const pad = within(view.getByRole('dialog', { name: 'Type the bag tog' }));
    fireEvent.click(pad.getByRole('button', { name: '4' }));
    fireEvent.click(pad.getByRole('button', { name: 'Done' }));
    expect(view.getByText('A 4.0 TOG bag suits')).toBeInTheDocument();
    expect(view.getByText('This chart stops at 3.5 TOG, so it is read as a 3.5 TOG bag.')).toBeInTheDocument();
    expect(view.getByText('Below 16 °C')).toBeInTheDocument();
  });

  it('highlights the matching chart row', () => {
    renderCalculator();
    const rows = within(screen.getByRole('table', { name: 'TOG chart' })).getAllByRole('row');
    expect(rows).toHaveLength(5);
    expect(rows[1]).toHaveClass('bg-sleep-soft');
    expect(rows[3]).not.toHaveClass('bg-sleep-soft');
  });
});
