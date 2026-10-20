import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FixtureRouter } from '#/fixtures/router';
import { SampleMonth } from './sample-month';

describe('SampleMonth', () => {
  it('draws a month of sample days without linking them', async () => {
    render(
      <FixtureRouter>
        <SampleMonth now={new Date('2026-10-13T12:00:00Z')} />
      </FixtureRouter>,
    );
    expect(await screen.findByText('Avg sleep')).toBeInTheDocument();
    expect(screen.getByText('Feeds/day')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
