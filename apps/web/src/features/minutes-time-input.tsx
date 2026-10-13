import { clockToMinutes, minutesToTimeInputValue } from '@babble/domain';
import { useState } from 'react';
import { showNativePicker } from '#/lib/native-picker';

export function MinutesTimeInput({
  label,
  minutes,
  onChange,
  accept = () => true,
}: {
  label: string;
  minutes: number;
  onChange: (minutes: number) => void;
  accept?: (minutes: number) => boolean;
}) {
  const external = minutesToTimeInputValue(minutes);
  const [seen, setSeen] = useState(external);
  const [draft, setDraft] = useState(external);
  if (seen !== external) {
    setSeen(external);
    setDraft(external);
  }

  function commit() {
    const next = clockToMinutes(draft);
    if (next !== null && next !== minutes && accept(next)) onChange(next);
    else setDraft(external);
  }

  return (
    <input
      type="time"
      aria-label={label}
      step={900}
      value={draft}
      onClick={(event) => showNativePicker(event.currentTarget)}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      className="h-tap rounded-button border border-line-strong bg-raised px-3 text-body text-ink"
    />
  );
}
