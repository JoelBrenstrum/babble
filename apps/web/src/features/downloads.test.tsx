import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ANDROID_APK_URL, Downloads } from './downloads';

describe('Downloads', () => {
  it('links to the latest Android APK', () => {
    render(<Downloads />);
    expect(screen.getByRole('link', { name: 'Download for Android' })).toHaveAttribute('href', ANDROID_APK_URL);
    expect(ANDROID_APK_URL).toMatch(/\/releases\/latest\/download\/babble\.apk$/);
  });

  it('shows the Safari home screen steps for iPhone', () => {
    render(<Downloads />);
    expect(screen.getByText('Add to Home Screen')).toBeInTheDocument();
  });
});
