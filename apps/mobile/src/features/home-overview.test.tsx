import { sampleBaby, sampleFamily } from '@babble/api/fixtures';
import { render, screen } from '@testing-library/react-native';
import { HomeOverview } from './home-overview';

jest.mock('expo-router', () => ({ Link: ({ children }: { children: React.ReactNode }) => children }));

function renderHome(feedDue: { text: string; overdue: boolean } | null) {
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
