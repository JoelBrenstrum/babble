import {
  DEVICE_LINK_POLL_MS,
  deviceLinkUrl,
  finishDeviceLink,
  formatDeviceLinkCode,
  toBabbleError,
  type BabbleClient,
  type DeviceLinkStart,
} from '@babble/api';
import { Link } from '@tanstack/react-router';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { Spinner } from '#/components/ui/spinner';
import { StatusMessage } from '#/components/ui/status';
import { Wordmark } from '#/components/ui/wordmark';
import { checkDeviceLink, requestDeviceLink } from '#/lib/device-link';

const RETRY_MS = 10_000;

export type DeviceSignInState =
  | { kind: 'loading' }
  | { kind: 'ready'; code: string; url: string; qrSvg: string | null }
  | { kind: 'signing-in' }
  | { kind: 'error'; message: string };

export function useDeviceSignIn(client: BabbleClient, publicUrl: string, onSignedIn: () => void): DeviceSignInState {
  const [link, setLink] = useState<DeviceLinkStart | null>(null);
  const [qr, setQr] = useState<{ code: string; svg: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    requestDeviceLink()
      .then((next) => {
        if (cancelled) return;
        setError(null);
        setLink(next);
      })
      .catch((problem: unknown) => {
        if (cancelled) return;
        setError(toBabbleError(problem).message);
        setTimeout(() => !cancelled && setAttempt((count) => count + 1), RETRY_MS);
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  useEffect(() => {
    if (!link) return;
    let cancelled = false;
    QRCode.toString(deviceLinkUrl(publicUrl, link.code), {
      type: 'svg',
      margin: 0,
      color: { dark: '#1f211c', light: '#00000000' },
    })
      .then((svg) => !cancelled && setQr({ code: link.code, svg }))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [link, publicUrl]);

  useEffect(() => {
    if (!link || signingIn) return;
    let cancelled = false;
    const timer = setInterval(() => {
      checkDeviceLink(link)
        .then(async (result) => {
          if (cancelled) return;
          if (result.status === 'expired') {
            setLink(null);
            setAttempt((count) => count + 1);
          } else if (result.status === 'approved') {
            cancelled = true;
            setSigningIn(true);
            try {
              await finishDeviceLink(client, result.tokenHash);
              onSignedIn();
            } catch (problem) {
              setSigningIn(false);
              setError(toBabbleError(problem).message);
              setLink(null);
              setAttempt((count) => count + 1);
            }
          }
        })
        .catch(() => undefined);
    }, DEVICE_LINK_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [client, link, onSignedIn, signingIn]);

  if (signingIn) return { kind: 'signing-in' };
  if (error && !link) return { kind: 'error', message: error };
  if (!link) return { kind: 'loading' };
  return {
    kind: 'ready',
    code: link.code,
    url: deviceLinkUrl(publicUrl, link.code),
    qrSvg: qr?.code === link.code ? qr.svg : null,
  };
}

export function DeviceSignInView({
  state,
  title,
  publicUrl,
}: {
  state: DeviceSignInState;
  title: string;
  publicUrl: string;
}) {
  const host = publicUrl.replace(/^https?:\/\//, '');
  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="px-6 py-5">
        <Wordmark className="text-[28px]" />
      </header>
      <main className="mx-auto grid w-full max-w-4xl flex-1 content-center items-center gap-8 px-4 pb-12 md:grid-cols-[1fr_auto] md:gap-12">
        <div className="flex flex-col gap-5">
          <h1 className="text-title font-bold">{title}</h1>
          <ol className="flex list-decimal flex-col gap-2 pl-6 text-body text-ink-2">
            <li>Open the camera on a phone that's signed in to babble.</li>
            <li>Scan the code.</li>
            <li>
              Tap <strong className="text-ink">Sign in device</strong>. This screen signs in by itself.
            </li>
          </ol>
          {state.kind === 'ready' && (
            <p className="text-meta text-ink-3">
              No camera? Go to <strong className="text-ink-2">{host}/link</strong> and enter{' '}
              <strong className="tabular text-ink-2">{formatDeviceLinkCode(state.code)}</strong>.
            </p>
          )}
          <Link
            to="/sign-in"
            search={{ invite: undefined }}
            className="self-start text-meta font-semibold text-primary underline-offset-4 hover:underline"
          >
            Sign in with email instead
          </Link>
        </div>
        <div className="flex flex-col items-center gap-4 rounded-card bg-raised p-6 shadow-raised">
          {state.kind === 'error' ? (
            <div className="w-64">
              <StatusMessage tone="danger">{state.message}</StatusMessage>
            </div>
          ) : state.kind === 'ready' && state.qrSvg ? (
            <>
              <div
                role="img"
                aria-label="Sign-in QR code"
                className="size-64 rounded-tile bg-white p-4"
                dangerouslySetInnerHTML={{ __html: state.qrSvg }}
              />
              <div className="text-center">
                <div className="text-meta text-ink-2">Code</div>
                <div className="tabular text-timer-md font-bold tracking-widest" data-testid="device-link-code">
                  {formatDeviceLinkCode(state.code)}
                </div>
              </div>
            </>
          ) : (
            <div className="flex size-64 flex-col items-center justify-center gap-3 text-meta text-ink-2">
              <Spinner className="size-7 text-primary" label={state.kind === 'signing-in' ? 'Signing in' : 'Loading'} />
              {state.kind === 'signing-in' ? 'Signing in…' : 'Making a code…'}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
