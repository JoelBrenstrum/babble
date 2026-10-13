import { sampleBaby } from '@babble/api/fixtures';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FixtureRouter } from '#/fixtures/router';
import { HomeOverview } from './home-overview';

function renderHome(
  feedDue: { text: string; overdue: boolean } | null,
  prediction: string | null = null,
  predictionPlus = false,
) {
  render(
    <FixtureRouter>
      <HomeOverview
        baby={sampleBaby}
        now={new Date()}
        units="metric"
        running={[]}
        latest={[]}
        summary={null}
        renderRunning={() => null}
        feedDue={feedDue}
        prediction={prediction}
        predictionPlus={predictionPlus}
      />
    </FixtureRouter>,
  );
}

describe('HomeOverview feed due line', () => {
  it('shows when the next feed is due', async () => {
    renderHome({ text: 'Next feed due in 42m · Left side next', overdue: false });
    expect(await screen.findByRole('status')).toHaveTextContent('Next feed due in 42m · Left side next');
  });

  it('is absent when reminders are off', async () => {
    renderHome(null);
    await screen.findByText('Breastfeed');
    expect(screen.queryByRole('status')).toBeNull();
  });
});

describe('HomeOverview prediction line', () => {
  it('marks the prediction as a Plus feature when billing is on', async () => {
    renderHome(null, 'Likely asleep around 2:10 pm', true);
    const line = (await screen.findByText('Likely asleep around 2:10 pm')).closest('p')!;
    expect(line).toHaveTextContent('Plus');
  });

  it('leaves the Plus mark off when billing is off', async () => {
    renderHome(null, 'Likely asleep around 2:10 pm');
    const line = (await screen.findByText('Likely asleep around 2:10 pm')).closest('p')!;
    expect(line).not.toHaveTextContent('Plus');
  });

  it('shows the likely next sleep', async () => {
    renderHome(null, 'Likely asleep around 2:10 pm');
    expect(await screen.findByText('Likely asleep around 2:10 pm')).toBeInTheDocument();
  });

  it('is absent without a prediction', async () => {
    renderHome(null);
    await screen.findByText('Breastfeed');
    expect(screen.queryByText(/^Likely/)).toBeNull();
  });
});
