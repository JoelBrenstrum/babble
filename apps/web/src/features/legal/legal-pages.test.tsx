import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { legalContact } from './legal-contact';
import { PrivacyPolicy } from './privacy-policy';
import { TermsOfUse } from './terms-of-use';

const configured = legalContact({ operatorName: 'Jane Smith', contactEmail: 'jane@example.com' });
const unset = legalContact({ operatorName: null, contactEmail: null });

describe('PrivacyPolicy', () => {
  it('names the operator and links their email', () => {
    render(<PrivacyPolicy contact={configured} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Privacy policy' })).toBeInTheDocument();
    expect(screen.getByText('Last updated 9 October 2026')).toBeInTheDocument();
    expect(screen.getByText(/"we" means Jane Smith/)).toBeInTheDocument();
    for (const link of screen.getAllByRole('link', { name: 'jane@example.com' })) {
      expect(link).toHaveAttribute('href', 'mailto:jane@example.com');
    }
  });

  it('falls back when the operator and contact are unset', () => {
    render(<PrivacyPolicy contact={unset} />);
    expect(screen.getByText(/"we" means the people who run this babble server/)).toBeInTheDocument();
    expect(
      screen.getAllByText(/talk to the person who invited you, or whoever runs this server/).length,
    ).toBeGreaterThan(0);
    expect(screen.queryByRole('link', { name: /@/ })).not.toBeInTheDocument();
  });

  it('covers the key sections', () => {
    render(<PrivacyPolicy contact={configured} />);
    for (const name of [
      'Who we are',
      'What we collect',
      'Why we keep it',
      'Where it lives',
      'Who can see it',
      'Children',
      'Your choices',
      'Your rights',
      'Changes',
    ]) {
      expect(screen.getByRole('heading', { level: 2, name })).toBeInTheDocument();
    }
    expect(screen.getByText(/Supabase in Sydney, Australia/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'privacy.org.nz' })).toHaveAttribute('href', 'https://www.privacy.org.nz');
    expect(screen.getByRole('link', { name: 'Back to babble' })).toHaveAttribute('href', '/');
  });
});

describe('TermsOfUse', () => {
  it('names the operator and covers the key sections', () => {
    render(<TermsOfUse contact={configured} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Terms of use' })).toBeInTheDocument();
    expect(screen.getByText(/between you and Jane Smith/)).toBeInTheDocument();
    for (const name of [
      'Not medical advice',
      'Your account',
      'Availability',
      'Our liability',
      'Open source',
      'Contact',
    ]) {
      expect(screen.getByRole('heading', { level: 2, name })).toBeInTheDocument();
    }
    expect(screen.getByText(/call 111/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'github.com/JoelBrenstrum/babble' })).toHaveAttribute(
      'href',
      'https://github.com/JoelBrenstrum/babble',
    );
    expect(screen.getByRole('link', { name: 'jane@example.com' })).toHaveAttribute('href', 'mailto:jane@example.com');
  });

  it('falls back when the operator and contact are unset', () => {
    render(<TermsOfUse contact={unset} />);
    expect(screen.getByText(/between you and the people who run this babble server/)).toBeInTheDocument();
    expect(screen.getByText(/talk to the person who invited you, or whoever runs this server/)).toBeInTheDocument();
  });
});
