import { MAX_DEVICE_NAME } from '@babble/api';
import { useCurrentDeviceName } from '@babble/api/react';
import { View } from 'react-native';
import { SectionLabel } from '@/components/card';
import { TextField } from '@/components/text-field';
import { useBabble } from '@/lib/babble';
import { defaultDeviceName, localDeviceName } from '@/lib/device-name';

export function DeviceNameSetting({ you, familyId }: { you: string; familyId: string }) {
  const { client } = useBabble();
  const { name, setName, error } = useCurrentDeviceName(client, familyId, localDeviceName);
  const fallback = defaultDeviceName();
  return (
    <View className="gap-3">
      <SectionLabel>Name</SectionLabel>
      <TextField
        label="Device name"
        placeholder={fallback}
        maxLength={MAX_DEVICE_NAME}
        hint={`Shown on entries logged here, like "Logged by ${you} on ${name.trim() || fallback}".`}
        error={error}
        value={name}
        onChangeText={setName}
      />
    </View>
  );
}
