import { TextField } from './text-field';

export default {
  Empty: <TextField label="Email" placeholder="you@example.com" />,
  'With hint': <TextField label="Invite code" placeholder="K7Q-4MD" hint="Only needed the first time you sign in." />,
  'With error': <TextField label="Email" defaultValue="not-an-email" error="Enter a valid email address." />,
};
