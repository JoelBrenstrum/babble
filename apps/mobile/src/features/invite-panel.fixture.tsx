import { InvitePanel } from './invite-panel';

const PUBLIC_URL = 'https://babble.fly.dev';
const sevenDays = () => new Date(Date.now() + 7 * 86_400_000).toISOString();

export default {
  Ready: (
    <InvitePanel
      publicUrl={PUBLIC_URL}
      onCreate={() => Promise.resolve({ code: 'K7Q4M-D2XPA', expiresAt: sevenDays() })}
    />
  ),
  Loading: <InvitePanel publicUrl={PUBLIC_URL} onCreate={() => new Promise<never>(() => undefined)} />,
  Error: (
    <InvitePanel
      publicUrl={PUBLIC_URL}
      onCreate={() => Promise.reject({ code: '42501', message: 'Only owners and caregivers can invite' })}
    />
  ),
};
