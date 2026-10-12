import { fireEvent, render, screen } from '@testing-library/react-native';
import { DevSignIn } from './dev-sign-in';

describe('DevSignIn', () => {
  it('signs in as a seeded account with the dev password', async () => {
    const onSignIn = jest.fn().mockResolvedValue(undefined);
    await render(<DevSignIn onSignIn={onSignIn} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Sign in as John' }));
    expect(onSignIn).toHaveBeenCalledWith({ email: 'john@babble.dev', password: 'password' });
  });

  it('offers a free-plan account alongside the plus family', async () => {
    const onSignIn = jest.fn().mockResolvedValue(undefined);
    await render(<DevSignIn onSignIn={onSignIn} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Sign in as Sam' }));
    expect(onSignIn).toHaveBeenCalledWith({ email: 'sam@babble.dev', password: 'password' });
  });
});
