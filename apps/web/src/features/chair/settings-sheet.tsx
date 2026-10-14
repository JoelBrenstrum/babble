import { MAX_DEVICE_NAME } from '@babble/api';
import { Settings } from 'lucide-react';
import { useId, useState } from 'react';
import { defaultDeviceName, saveDeviceName, savedDeviceName } from '#/lib/device-name';
import { Sheet } from './sheet';

export function SettingsSheet({ onClose }: { onClose: () => void }) {
  const id = useId();
  const [name, setName] = useState(savedDeviceName);
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
          onChange={(event) => {
            setName(event.target.value);
            saveDeviceName(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') onClose();
          }}
          className="h-[16cqmin] rounded-[4cqmin] border-[0.5cqmin] border-line-strong bg-raised px-[4cqmin] text-[length:6cqmin] text-ink outline-none focus:border-primary"
        />
        <p className="text-[length:4cqmin] text-ink-2">
          Entries logged on this screen say they were logged on {name.trim() || defaultDeviceName()}.
        </p>
      </div>
    </Sheet>
  );
}
