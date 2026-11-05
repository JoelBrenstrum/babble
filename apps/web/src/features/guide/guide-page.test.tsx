import { CHART_TYPES, MEASURES, REPORT_TEMPLATES } from '@babble/domain';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FixtureRouter } from '#/fixtures/router';
import { GuidePage } from './guide-page';

async function renderPage(signedIn: boolean, billingEnabled: boolean) {
  render(
    <FixtureRouter>
      <GuidePage signedIn={signedIn} billingEnabled={billingEnabled} />
    </FixtureRouter>,
  );
  return screen.findByRole('heading', { level: 1, name: 'Reports and the dashboard' });
}

describe('GuidePage', () => {
  it('documents every measure, chart type and template', async () => {
    await renderPage(false, true);
    for (const measure of MEASURES) expect(screen.getAllByText(measure.label).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('heading', { level: 3 }).length).toBeGreaterThan(
      CHART_TYPES.length + REPORT_TEMPLATES.length,
    );
    expect(screen.getByRole('heading', { name: 'Heatmap' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'When your baby sleeps' })).toBeInTheDocument();
    expect(screen.getByText(/A free family can save 2 reports/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Get started' })).toBeInTheDocument();
  });

  it('points signed-in readers at Reports and drops the limit when billing is off', async () => {
    await renderPage(true, false);
    expect(screen.getAllByRole('link', { name: 'Open Reports' }).length).toBeGreaterThan(0);
    expect(screen.queryByText(/A free family can save/)).not.toBeInTheDocument();
    expect(screen.getByText('Save as many reports as you like.')).toBeInTheDocument();
  });
});
