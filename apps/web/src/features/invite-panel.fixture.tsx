import { InvitePanel } from './invite-panel';

const PUBLIC_URL = 'https://babble.fly.dev';
const sevenDays = () => new Date(Date.now() + 7 * 86_400_000).toISOString();

const ready = () => Promise.resolve({ code: 'K7Q-4MD', expiresAt: sevenDays() });
const loading = () => new Promise<never>(() => undefined);
const failing = () => Promise.reject({ code: '42501', message: 'Only owners and caregivers can invite' });

export default {
  Ready: <InvitePanel publicUrl={PUBLIC_URL} onCreate={ready} />,
  Loading: <InvitePanel publicUrl={PUBLIC_URL} onCreate={loading} />,
  Error: <InvitePanel publicUrl={PUBLIC_URL} onCreate={failing} />,
};
