import { sampleBaby, sampleFamily } from '@babble/api/fixtures';
import { render, screen } from '@testing-library/react-native';
import { HomeOverview } from './home-overview';

jest.mock('expo-router', () => ({ Link: ({ children }: { children: React.ReactNode }) => children }));

function renderHome(feedDue: { text: string; overdue: boolean } | null, prediction: string | null = null) {
  return render(
    <HomeOverview
      family={sampleFamily}
      baby={sampleBaby}
      now={new Date()}
      units="metric"
      running={[]}
      latest={[]}
      summary={null}
      renderRunning={() => null}
      feedDue={feedDue}
      prediction={prediction}
    />,
  );
}

describe('HomeOverview feed due line', () => {
  it('shows when the next feed is due', async () => {
    await renderHome({ text: 'Overdue 10m · Left side next', overdue: true });
    expect(screen.getByText('Overdue 10m · Left side next')).toBeTruthy();
  });

  it('is absent when reminders are off', async () => {
    await renderHome(null);
    expect(screen.queryByText(/feed due|Overdue/)).toBeNull();
  });
});

describe('HomeOverview prediction line', () => {
  it('shows the likely next wake-up', async () => {
    await renderHome(null, 'Likely awake around 3:20 pm');
    expect(screen.getByText('Likely awake around 3:20 pm')).toBeTruthy();
  });

  it('is absent without a prediction', async () => {
    await renderHome(null);
    expect(screen.queryByText(/^Likely/)).toBeNull();
  });
});
