import { clock, toBabbleError, type Invite } from '@babble/api';
import { formatExpiry, inviteLink } from '@babble/domain';
import { Copy, Share2 } from 'lucide-react';
import QRCode from 'qrcode';
import { useEffect, useRef, useState } from 'react';
import { Button } from '#/components/ui/button';
import { Spinner } from '#/components/ui/spinner';
import { StatusMessage } from '#/components/ui/status';

const COPIED_MS = 2000;

export function InvitePanel({ publicUrl, onCreate }: { publicUrl: string; onCreate: () => Promise<Invite> }) {
  const [result, setResult] = useState<{ source: typeof onCreate; invite: Invite | null; error: string | null } | null>(
    null,
  );
  const [qr, setQr] = useState<{ code: string; svg: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const creating = useRef<{ source: typeof onCreate; promise: Promise<Invite> } | null>(null);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    if (creating.current?.source !== onCreate) creating.current = { source: onCreate, promise: onCreate() };
    creating.current.promise.then(
      (invite) => !cancelled && setResult({ source: onCreate, invite, error: null }),
      (caught: unknown) =>
        !cancelled && setResult({ source: onCreate, invite: null, error: toBabbleError(caught).message }),
    );
    return () => {
      cancelled = true;
    };
  }, [onCreate]);

  useEffect(() => () => clearTimeout(copiedTimer.current), []);

  const current = result?.source === onCreate ? result : null;
  const invite = current?.invite ?? null;
  const code = invite?.code;

  useEffect(() => {
    if (!code) return;
    let cancelled = false;
    QRCode.toString(inviteLink(publicUrl, code), {
      type: 'svg',
      margin: 0,
      color: { dark: '#1f211c', light: '#00000000' },
    })
      .then((svg) => !cancelled && setQr({ code, svg }))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [code, publicUrl]);

  if (current?.error) return <StatusMessage tone="danger">{current.error}</StatusMessage>;
  if (!invite) {
    return (
      <div className="flex h-80 flex-col items-center justify-center gap-3 rounded-card bg-raised text-meta text-ink-2 shadow-raised">
        <Spinner className="size-7 text-primary" label="Creating invite" />
        Creating invite…
      </div>
    );
  }

  const link = inviteLink(publicUrl, invite.code);

  async function share() {
    if (navigator.share) {
      await navigator.share({ title: 'Join our family on babble', url: link }).catch(() => undefined);
    } else {
      await copy(link);
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      setCopyFailed(true);
      return;
    }
    setCopyFailed(false);
    setCopied(true);
    clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopied(false), COPIED_MS);
  }

  return (
    <div className="flex flex-col items-center gap-5 rounded-card bg-raised p-6 shadow-raised">
      {qr?.code === invite.code && (
        <div
          role="img"
          aria-label="Invite QR code"
          className="size-44 rounded-tile bg-white p-3"
          dangerouslySetInnerHTML={{ __html: qr.svg }}
        />
      )}
      <div className="text-center">
        <div className="text-meta text-ink-2">Invite code</div>
        <div className="tabular text-timer-md font-bold tracking-widest">{invite.code}</div>
        <div className="mt-1 text-meta text-ink-3">{formatExpiry(invite.expiresAt, clock.now())}</div>
      </div>
      <div className="grid w-full grid-cols-2 gap-3">
        <Button onClick={share}>
          <Share2 className="size-5" strokeWidth={2.75} />
          Share link
        </Button>
        <Button variant="secondary" onClick={() => copy(invite.code)}>
          <Copy className="size-5" strokeWidth={2.75} />
          {copied ? 'Copied' : 'Copy code'}
        </Button>
      </div>
      {copyFailed && <StatusMessage tone="danger">Couldn't copy. Select the code and copy it by hand.</StatusMessage>}
    </div>
  );
}
