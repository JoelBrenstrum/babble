import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FixtureRouter } from '#/fixtures/router';
import { FEATURES, GITHUB_URL, LandingPage } from './landing-page';

const now = new Date('2026-10-09T02:00:00Z');

async function renderLanding(signedIn = false) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <FixtureRouter>
        <LandingPage signedIn={signedIn} now={now} />
      </FixtureRouter>
    </QueryClientProvider>,
  );
  return screen.findByRole('heading', { level: 1, name: "Track your baby's day, together." });
}

describe('LandingPage', () => {
  it('leads with the hero and a way in', async () => {
    await renderLanding();
    const getStarted = screen.getAllByRole('link', { name: 'Get started' });
    expect(getStarted.length).toBeGreaterThan(0);
    for (const link of getStarted) expect(link).toHaveAttribute('href', '/sign-in');
    expect(screen.getByRole('link', { name: 'See what it does' })).toHaveAttribute('href', '#features');
    expect(screen.queryByRole('link', { name: 'Open babble' })).toBeNull();
  });

  it('lists the features', async () => {
    await renderLanding();
    for (const title of [
      'Breastfeed timer',
      'Sleep and naps',
      'Nappies',
      'Feed reminders',
      'Import from Huckleberry',
    ]) {
      expect(screen.getByRole('heading', { level: 3, name: title })).toBeInTheDocument();
    }
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(FEATURES.length);
  });

  it('links to sign in, privacy, terms and the source', async () => {
    await renderLanding();
    const footer = within(screen.getByRole('navigation', { name: 'Footer' }));
    expect(footer.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/sign-in');
    expect(footer.getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', '/privacy');
    expect(footer.getByRole('link', { name: 'Terms' })).toHaveAttribute('href', '/terms');
    expect(footer.getByRole('link', { name: 'GitHub' })).toHaveAttribute('href', GITHUB_URL);
    expect(screen.getByRole('link', { name: 'privacy policy' })).toHaveAttribute('href', '/privacy');
    expect(screen.getByRole('link', { name: 'terms of use' })).toHaveAttribute('href', '/terms');
  });

  it('offers to open babble when already signed in', async () => {
    await renderLanding(true);
    expect(screen.queryByRole('link', { name: 'Get started' })).toBeNull();
    const open = screen.getAllByRole('link', { name: 'Open babble' });
    expect(open.length).toBeGreaterThan(0);
    for (const link of open) expect(link).toHaveAttribute('href', '/');
  });

  it('renders the live previews from fixture data, hidden from assistive tech behind a description', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    await renderLanding();
    const home = screen.getByRole('img', { name: /home screen: a breastfeed timer/ });
    expect(home.textContent).toContain('Feeding · Right');
    expect(home.textContent).toContain('Started by Jane');
    expect(home.textContent).toContain('Bottle');
    const timeline = screen.getByRole('img', { name: /a day on the babble timeline/ });
    expect(within(timeline).getByTestId('day-timeline')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /day's totals/ }).textContent).toContain('Sleep');
    for (const preview of screen.getAllByRole('img')) {
      expect(preview.firstElementChild).toHaveAttribute('inert');
      expect(preview.firstElementChild).toHaveAttribute('aria-hidden', 'true');
    }
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
