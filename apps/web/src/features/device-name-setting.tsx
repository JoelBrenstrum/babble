import { MAX_DEVICE_NAME } from '@babble/api';
import { SectionLabel } from '#/components/ui/card';
import { TextField } from '#/components/ui/field';
import { useDeviceName } from '#/features/device-name-context';
import { defaultDeviceName } from '#/lib/device-name';

export function DeviceNameSetting({ you }: { you: string }) {
  const { name, setName, error } = useDeviceName();
  const fallback = defaultDeviceName();
  return (
    <section className="flex flex-col gap-3">
      <SectionLabel>Name</SectionLabel>
      <TextField
        label="Device name"
        placeholder={fallback}
        maxLength={MAX_DEVICE_NAME}
        hint={`Shown on entries logged here, like "Logged by ${you} on ${name.trim() || fallback}".`}
        error={error ?? undefined}
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
    </section>
  );
}
