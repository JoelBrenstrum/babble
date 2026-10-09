import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AboutSection, AgreementNote } from './legal-links';

describe('AgreementNote', () => {
  it('links to the terms and privacy policy', () => {
    render(<AgreementNote />);
    expect(screen.getByRole('link', { name: 'Terms of use' })).toHaveAttribute('href', '/terms');
    expect(screen.getByRole('link', { name: 'Privacy policy' })).toHaveAttribute('href', '/privacy');
  });
});

describe('AboutSection', () => {
  it('links to the privacy policy and terms', () => {
    render(<AboutSection />);
    expect(screen.getByRole('heading', { name: 'About' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Privacy policy' })).toHaveAttribute('href', '/privacy');
    expect(screen.getByRole('link', { name: 'Terms of use' })).toHaveAttribute('href', '/terms');
  });
});
