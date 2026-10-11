import { keepAwakeHint, parseKeepAwake, serialiseKeepAwake } from '@babble/domain';
import { Sun } from 'lucide-react';
import { useId, useState } from 'react';
import { Card } from '#/components/ui/card';
import { cn } from '#/lib/cn';
import { readStorage, storageKeys, writeStorage } from '#/lib/storage';
import { useCharging, useScreenWakeLock, wakeLockSupported } from '#/lib/wake-lock';

export function KeepAwakeToggle() {
  const [on, setOn] = useState(() => parseKeepAwake(readStorage(storageKeys.keepAwake)));
  const charging = useCharging();
  const labelId = useId();
  const hintId = useId();
  useScreenWakeLock(on);
  if (!wakeLockSupported()) return null;

  function toggle() {
    setOn(!on);
    writeStorage(storageKeys.keepAwake, serialiseKeepAwake(!on));
  }

  return (
    <Card className="flex items-center gap-3 p-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface text-ink-2">
        <Sun className="size-5" strokeWidth={2.5} />
      </span>
      <div className="min-w-0 flex-1">
        <p id={labelId} className="text-label font-semibold">
          Keep screen on
        </p>
        <p id={hintId} className="text-meta text-ink-2">
          {keepAwakeHint(on, charging)}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-labelledby={labelId}
        aria-describedby={hintId}
        onClick={toggle}
        className="grid h-tap shrink-0 place-items-center px-1"
      >
        <span
          className={cn(
            'flex h-7 w-12 items-center rounded-full p-0.5 transition-colors duration-base',
            on ? 'bg-primary' : 'bg-line-strong',
          )}
        >
          <span
            className={cn(
              'size-6 rounded-full bg-raised shadow-raised transition-transform duration-base',
              on && 'translate-x-5',
            )}
          />
        </span>
      </button>
    </Card>
  );
}
