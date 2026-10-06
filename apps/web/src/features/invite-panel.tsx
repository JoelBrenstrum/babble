import { createInvite, toBabbleError, type Invite } from '@babble/api';
import { Copy, Share2 } from 'lucide-react';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { Button } from '#/components/ui/button';
import { StatusMessage } from '#/components/ui/status';
import { useRouteContext } from '@tanstack/react-router';

export function inviteLink(publicUrl: string, code: string): string {
  return `${publicUrl}/join/${code}`;
}

export function formatExpiry(expiresAt: string, now: Date = new Date()): string {
  const days = Math.max(1, Math.round((Date.parse(expiresAt) - now.getTime()) / 86_400_000));
  return `Expires in ${days} ${days === 1 ? 'day' : 'days'} · one use`;
}

export function InvitePanel({ familyId }: { familyId: string }) {
  const { babble } = useRouteContext({ from: '__root__' });
  const [invite, setInvite] = useState<Invite | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    createInvite(babble.client, familyId)
      .then(async (created) => {
        if (cancelled) return;
        setInvite(created);
        setQr(
          await QRCode.toString(inviteLink(babble.config.publicUrl, created.code), {
            type: 'svg',
            margin: 0,
            color: { dark: '#1f211c', light: '#00000000' },
          }),
        );
      })
      .catch((caught) => !cancelled && setError(toBabbleError(caught).message));
    return () => {
      cancelled = true;
    };
  }, [babble, familyId]);

  if (error) return <StatusMessage tone="danger">{error}</StatusMessage>;
  if (!invite) return <div className="h-72 animate-pulse rounded-card bg-surface" />;

  const link = inviteLink(babble.config.publicUrl, invite.code);

  async function share() {
    if (navigator.share) {
      await navigator.share({ title: 'Join our family on Babble', url: link }).catch(() => undefined);
    } else {
      await copy(link);
    }
  }

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col items-center gap-5 rounded-card bg-raised p-6 shadow-raised">
      {qr && (
        <div
          role="img"
          aria-label="Invite QR code"
          className="size-44 rounded-tile bg-white p-3"
          dangerouslySetInnerHTML={{ __html: qr }}
        />
      )}
      <div className="text-center">
        <div className="text-meta text-ink-2">Invite code</div>
        <div className="tabular text-timer-md font-bold tracking-widest">{invite.code}</div>
        <div className="mt-1 text-meta text-ink-3">{formatExpiry(invite.expiresAt)}</div>
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
    </div>
  );
}
