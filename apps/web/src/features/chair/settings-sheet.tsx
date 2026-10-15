import { MAX_DEVICE_NAME } from '@babble/api';
import { LogOut, Settings } from 'lucide-react';
import { useId, useState } from 'react';
import { useDeviceName } from '#/features/device-name-context';
import { defaultDeviceName } from '#/lib/device-name';
import { BigButton } from './big-button';
import { Sheet } from './sheet';

export function SettingsSheet({ onClose, onSignOut }: { onClose: () => void; onSignOut: () => Promise<void> }) {
  const id = useId();
  const { name, setName } = useDeviceName();
  const [confirming, setConfirming] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  return (
    <Sheet title="Settings" icon={Settings} tone="bg-surface text-ink-2" onClose={onClose}>
      <div className="flex min-h-0 flex-1 flex-col gap-[2cqmin] overflow-y-auto">
        <label htmlFor={id} className="text-[length:5cqmin] font-bold">
          Device name
        </label>
        <input
          id={id}
          value={name}
          maxLength={MAX_DEVICE_NAME}
          placeholder={defaultDeviceName()}
          autoComplete="off"
          enterKeyHint="done"
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') onClose();
          }}
          className="h-[16cqmin] rounded-[4cqmin] border-[0.5cqmin] border-line-strong bg-raised px-[4cqmin] text-[length:6cqmin] text-ink outline-none focus:border-primary"
        />
        <p className="text-[length:4cqmin] text-ink-2">
          Entries logged on this screen say they were logged on {name.trim() || defaultDeviceName()}.
        </p>
        {confirming ? (
          <div className="mt-auto flex flex-none flex-col gap-[2cqmin] rounded-[5cqmin] bg-surface p-[4cqmin]">
            <p className="text-[length:5cqmin] font-bold">Sign out of chair mode?</p>
            <p className="text-[length:4cqmin] text-ink-2">
              To sign back in, scan the code on this screen with your phone.
            </p>
            <div className="flex gap-[3cqmin]">
              <BigButton
                onClick={() => {
                  setSigningOut(true);
                  void onSignOut().catch(() => setSigningOut(false));
                }}
                className="h-[14cqmin] flex-1 rounded-[4cqmin] bg-danger text-[length:5cqmin] text-ink-on-solid"
              >
                {signingOut ? 'Signing out…' : 'Sign out'}
              </BigButton>
              <BigButton
                onClick={() => setConfirming(false)}
                className="h-[14cqmin] flex-1 rounded-[4cqmin] border-[0.5cqmin] border-line-strong bg-raised text-[length:5cqmin]"
              >
                Cancel
              </BigButton>
            </div>
          </div>
        ) : (
          <BigButton
            onClick={() => setConfirming(true)}
            className="mt-auto h-[14cqmin] flex-none rounded-[4cqmin] bg-surface text-[length:5cqmin] text-ink-2"
          >
            <LogOut className="size-[5cqmin]" strokeWidth={2.75} />
            Sign out
          </BigButton>
        )}
      </div>
    </Sheet>
  );
}
