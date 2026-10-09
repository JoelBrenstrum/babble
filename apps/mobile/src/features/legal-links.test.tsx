import { fireEvent, render, screen } from '@testing-library/react-native';
import { AboutSection, AgreementNote, legalUrls } from './legal-links';

const mockOpen = jest.fn();
jest.mock('expo-web-browser', () => ({ openBrowserAsync: (url: string) => mockOpen(url) }));

describe('legalUrls', () => {
  it('points at the pages on the web app', () => {
    expect(legalUrls('https://babble.example.com')).toEqual({
      privacy: 'https://babble.example.com/privacy',
      terms: 'https://babble.example.com/terms',
    });
  });
});

describe('legal links', () => {
  beforeEach(() => mockOpen.mockReset());

  it('opens the terms and privacy policy from the sign-in note', async () => {
    await render(<AgreementNote publicUrl="https://babble.example.com" />);
    await fireEvent.press(screen.getByRole('link', { name: 'Terms of use' }));
    await fireEvent.press(screen.getByRole('link', { name: 'Privacy policy' }));
    expect(mockOpen.mock.calls).toEqual([['https://babble.example.com/terms'], ['https://babble.example.com/privacy']]);
  });

  it('opens the privacy policy and terms from settings', async () => {
    await render(<AboutSection publicUrl="https://babble.example.com" />);
    expect(screen.getByText('About')).toBeTruthy();
    await fireEvent.press(screen.getByRole('link', { name: 'Privacy policy' }));
    await fireEvent.press(screen.getByRole('link', { name: 'Terms of use' }));
    expect(mockOpen.mock.calls).toEqual([['https://babble.example.com/privacy'], ['https://babble.example.com/terms']]);
  });
});
