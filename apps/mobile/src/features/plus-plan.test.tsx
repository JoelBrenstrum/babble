import { planSummary } from '@babble/config';
import { render, screen } from '@testing-library/react-native';
import { PlusPlan } from './plus-plan';

describe('PlusPlan', () => {
  it('shows an active plus plan and what it includes', async () => {
    await render(<PlusPlan summary={planSummary(true, 'plus')!} />);
    expect(screen.getByText('Active')).toBeTruthy();
    expect(screen.getByText('Sleep windows and predicted feeds on Home and the Timeline')).toBeTruthy();
  });

  it('tells a free family what plus adds', async () => {
    await render(<PlusPlan summary={planSummary(true, 'free')!} />);
    expect(screen.queryByText('Active')).toBeNull();
    expect(screen.getByText('Plus adds')).toBeTruthy();
  });
});
