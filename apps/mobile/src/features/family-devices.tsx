import {
  deviceDetail,
  deviceNameError,
  familyDeviceLabel,
  familyDevicesQuery,
  MAX_DEVICE_NAME,
  queryKeys,
  DEVICES_SHOWN,
  renameDevice,
  shownDevices,
  signOutDevice,
  signOutDeviceMessage,
  signOutThisDevice,
  type BabbleClient,
  type FamilyDevice,
} from '@babble/api';
import { useAsyncAction, useNow } from '@babble/api/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { router } from 'expo-router';
import { Alert, Pressable, Text, View } from 'react-native';
import { Button } from '@/components/button';
import { Card, SectionLabel } from '@/components/card';
import { TextField } from '@/components/text-field';
import { localDeviceName } from '@/lib/device-name';

export function FamilyDevices({ client, familyId, admin }: { client: BabbleClient; familyId: string; admin: boolean }) {
  const devices = useQuery(familyDevicesQuery(client, familyId)).data;
  const queryClient = useQueryClient();
  const now = useNow(60_000);
  const [editing, setEditing] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [name, setName] = useState('');
  const { run, busy, error, setError } = useAsyncAction();

  if (!devices || devices.length === 0) return null;
  const { shown, hidden } = shownDevices(devices, expanded);

  function confirmSignOut(device: FamilyDevice) {
    Alert.alert(signOutDeviceMessage(device), undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () =>
          void run(async () => {
            if (device.current) {
              await signOutThisDevice(client, device.sessionId);
              queryClient.clear();
              router.replace('/sign-in');
              return;
            }
            await signOutDevice(client, device.sessionId);
            await queryClient.invalidateQueries({ queryKey: queryKeys.familyDevices(familyId) });
          }),
      },
    ]);
  }

  function save(device: FamilyDevice) {
    const problem = deviceNameError(name);
    if (problem) {
      setError(problem);
      return;
    }
    void run(async () => {
      await renameDevice(client, device.sessionId, name);
      if (device.current) localDeviceName.write(name.trim());
      await queryClient.invalidateQueries({ queryKey: queryKeys.familyDevices(familyId) });
    }).then((done) => done && setEditing(null));
  }

  return (
    <View className="gap-3">
      <SectionLabel>{admin ? 'Signed-in devices' : 'Your devices'}</SectionLabel>
      <Card>
        {shown.map((device, index) => {
          const label = familyDeviceLabel(device);
          return (
            <View key={device.sessionId} className={`gap-3 px-4 py-3 ${index > 0 ? 'border-t border-line' : ''}`}>
              <View className="flex-row items-center gap-3">
                <View className="flex-1">
                  <Text
                    className={`text-row-title ${label.named ? 'font-semibold text-ink' : 'font-sans text-ink-2'}`}
                    numberOfLines={1}
                  >
                    {label.text}
                  </Text>
                  <Text className="font-sans text-meta text-ink-2">{deviceDetail(device, now)}</Text>
                </View>
                {editing !== device.sessionId && (
                  <>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Rename ${label.text} (${device.memberName})`}
                      hitSlop={8}
                      className="min-h-tap justify-center rounded-button px-3 active:bg-surface"
                      onPress={() => {
                        setError(null);
                        setName(device.name ?? '');
                        setEditing(device.sessionId);
                      }}
                    >
                      <Text className="font-semibold text-body text-primary">Rename</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Sign out ${label.text} (${device.memberName})`}
                      hitSlop={8}
                      className="min-h-tap justify-center rounded-button px-3 active:bg-surface"
                      onPress={() => {
                        setError(null);
                        confirmSignOut(device);
                      }}
                    >
                      <Text className="font-semibold text-body text-danger">Sign out</Text>
                    </Pressable>
                  </>
                )}
              </View>
              {editing === device.sessionId && (
                <View className="gap-3">
                  <TextField
                    label="Device name"
                    placeholder={familyDeviceLabel({ name: null, userAgent: device.userAgent }).text}
                    hint="Leave it blank to go back to the automatic name."
                    value={name}
                    maxLength={MAX_DEVICE_NAME}
                    autoFocus
                    error={error}
                    onChangeText={setName}
                    onSubmitEditing={() => save(device)}
                  />
                  <View className="flex-row gap-3">
                    <Button loading={busy} onPress={() => save(device)}>
                      Save
                    </Button>
                    <Button variant="ghost" onPress={() => setEditing(null)}>
                      Cancel
                    </Button>
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </Card>
      {devices.length > DEVICES_SHOWN && (
        <Button variant="ghost" onPress={() => setExpanded(!expanded)}>
          {expanded ? 'Show fewer' : `Show ${hidden} more`}
        </Button>
      )}
      {error && editing === null && <Text className="font-sans text-meta text-danger">{error}</Text>}
    </View>
  );
}
