import { MAX_DEVICE_NAME } from '@babble/api';
import { useState } from 'react';
import { SectionLabel } from '#/components/ui/card';
import { TextField } from '#/components/ui/field';
import { defaultDeviceName, saveDeviceName, savedDeviceName } from '#/lib/device-name';

export function DeviceNameSetting({ you }: { you: string }) {
  const [name, setName] = useState(savedDeviceName);
  const fallback = defaultDeviceName();
  return (
    <section className="flex flex-col gap-3">
      <SectionLabel>Name</SectionLabel>
      <TextField
        label="Device name"
        placeholder={fallback}
        maxLength={MAX_DEVICE_NAME}
        hint={`Shown on entries logged here, like "Logged by ${you} on ${name.trim() || fallback}".`}
        value={name}
        onChange={(event) => {
          setName(event.target.value);
          saveDeviceName(event.target.value);
        }}
      />
    </section>
  );
}
