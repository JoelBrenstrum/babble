import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PublicHeader } from './public-header';

describe('PublicHeader', () => {
  it('shows the wordmark on its own', () => {
    render(<PublicHeader />);
    expect(screen.getByRole('banner')).toHaveTextContent('babble');
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('links the wordmark home when asked', () => {
    render(<PublicHeader homeLink />);
    expect(screen.getByRole('link', { name: 'babble home' })).toHaveAttribute('href', '/');
  });

  it('places extra content opposite the wordmark', () => {
    render(
      <PublicHeader>
        <span>Step 2 of 3</span>
      </PublicHeader>,
    );
    expect(screen.getByRole('banner')).toHaveTextContent('Step 2 of 3');
  });
});
