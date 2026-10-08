import { toBabbleError } from '@babble/api';
import { resendState } from '@babble/domain';
import { useEffect, useState } from 'react';
import { CenteredPage } from '#/components/shell/centered-page';
import { Button } from '#/components/ui/button';
import { StatusMessage } from '#/components/ui/status';

export function CheckEmail({
  email,
  onResend,
  onUseDifferentEmail,
}: {
  email: string;
  onResend: () => Promise<void>;
  onUseDifferentEmail: () => void;
}) {
  const [sentAt, setSentAt] = useState(() => Date.now());
  const [now, setNow] = useState(sentAt);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resend = resendState(sentAt, now);

  useEffect(() => {
    if (resend.ready) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [resend.ready]);

  async function run() {
    setPending(true);
    setError(null);
    try {
      await onResend();
      const at = Date.now();
      setSentAt(at);
      setNow(at);
    } catch (caught) {
      setError(toBabbleError(caught).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <CenteredPage>
      <h1 className="text-title font-bold">Check your email</h1>
      <p className="mt-3 text-body text-ink-2">
        We sent a sign-in link to <strong className="text-ink">{email}</strong>. Open it on this device. It expires
        soon, so use it within the hour.
      </p>
      {error && (
        <div className="mt-6">
          <StatusMessage tone="danger">{error}</StatusMessage>
        </div>
      )}
      <div className="mt-8 flex flex-col gap-2 sm:flex-row">
        <Button variant="secondary" className="tabular" disabled={!resend.ready} loading={pending} onClick={run}>
          {resend.label}
        </Button>
        <Button variant="ghost" onClick={onUseDifferentEmail}>
          Use a different email
        </Button>
      </div>
    </CenteredPage>
  );
}
