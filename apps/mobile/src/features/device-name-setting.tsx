import { MAX_DEVICE_NAME } from '@babble/api';
import { useState } from 'react';
import { View } from 'react-native';
import { SectionLabel } from '@/components/card';
import { TextField } from '@/components/text-field';
import { defaultDeviceName, saveDeviceName, savedDeviceName } from '@/lib/device-name';

export function DeviceNameSetting({ you }: { you: string }) {
  const [name, setName] = useState(savedDeviceName);
  const fallback = defaultDeviceName();
  return (
    <View className="gap-3">
      <SectionLabel>Name</SectionLabel>
      <TextField
        label="Device name"
        placeholder={fallback}
        maxLength={MAX_DEVICE_NAME}
        hint={`Shown on entries logged here, like "Logged by ${you} on ${name.trim() || fallback}".`}
        value={name}
        onChangeText={(text) => {
          setName(text);
          void saveDeviceName(text);
        }}
      />
    </View>
  );
}
