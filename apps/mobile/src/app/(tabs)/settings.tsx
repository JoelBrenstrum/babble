import {
  canEdit,
  createInvite,
  deleteMyAccount,
  queryKeys,
  signOut,
  toBabbleError,
  updateBaby,
  type BabyRow,
  type Family,
} from '@babble/api';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { Card, SectionLabel } from '@/components/card';
import { Screen } from '@/components/screen';
import { Segmented } from '@/components/segmented';
import { StatusMessage } from '@/components/status-message';
import { TextField } from '@/components/text-field';
import { DateField } from '@/features/date-field';
import { DayStartPicker } from '@/features/day-start-picker';
import { InvitePanel } from '@/features/invite-panel';
import { TrackingSettings } from '@/features/tracking-settings';
import { TimezoneField } from '@/features/timezone-field';
import { useBabble } from '@/lib/babble';
import { loadThemePreference, saveThemePreference, type ThemePreference } from '@/lib/theme-preference';
import { useReadyState } from '@/lib/use-onboarding';

const ROLE_LABELS = { owner: 'Owner', caregiver: 'Caregiver', viewer: 'Viewer' } as const;

export default function SettingsTab() {
  const ready = useReadyState();
  const { session, client } = useBabble();
  if (!ready || !session) return null;
  const editable = canEdit(ready.family, session.user.id);

  return (
    <Screen edges={['top']}>
      <Text className="mb-6 font-bold text-title text-ink">Settings</Text>
      <View className="gap-8">
        <BabySection baby={ready.baby} disabled={!editable} />
        <CaregiversSection family={ready.family} userId={session.user.id} editable={editable} />
        <TrackingSettings client={client} babyId={ready.baby.id} disabled={!editable} />
        <AppearanceSection />
        <AccountSection email={session.user.email ?? ''} />
      </View>
    </Screen>
  );
}

function BabySection({ baby, disabled }: { baby: BabyRow; disabled: boolean }) {
  const { client } = useBabble();
  const queryClient = useQueryClient();
  const [name, setName] = useState(baby.name);
  const [birthDate, setBirthDate] = useState(baby.birth_date);
  const [timezone, setTimezone] = useState(baby.timezone);
  const [dayStart, setDayStart] = useState(baby.day_start_minutes);
  const [status, setStatus] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);

  async function save() {
    setStatus(null);
    try {
      await updateBaby(client, baby.id, {
        name: name.trim(),
        birth_date: birthDate,
        timezone,
        day_start_minutes: dayStart,
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.families, refetchType: 'all' });
      setStatus({ tone: 'success', text: 'Saved.' });
    } catch (caught) {
      setStatus({ tone: 'danger', text: toBabbleError(caught).message });
    }
  }

  return (
    <View className="gap-3">
      <SectionLabel>Baby</SectionLabel>
      <Card className={`gap-5 p-5 ${disabled ? 'opacity-60' : ''}`} pointerEvents={disabled ? 'none' : 'auto'}>
        <TextField label="Name" value={name} onChangeText={setName} />
        <DateField label="Birth date" value={birthDate} onChange={setBirthDate} maximumDate={new Date()} />
        <TimezoneField value={timezone} onChange={setTimezone} />
        <View className="gap-2">
          <Text className="font-semibold text-label text-ink">Day starts at</Text>
          <DayStartPicker value={dayStart} onChange={setDayStart} />
        </View>
        {status && <StatusMessage tone={status.tone}>{status.text}</StatusMessage>}
        {!disabled && (
          <Button onPress={save} disabled={!name.trim()}>
            Save changes
          </Button>
        )}
      </Card>
    </View>
  );
}

function CaregiversSection({ family, userId, editable }: { family: Family; userId: string; editable: boolean }) {
  const { client, config } = useBabble();
  const [inviting, setInviting] = useState(false);
  const onCreate = useCallback(() => createInvite(client, family.id), [client, family.id]);
  return (
    <View className="gap-3">
      <SectionLabel>Caregivers</SectionLabel>
      <Card>
        {family.members.map((member, index) => (
          <View
            key={member.user_id}
            className={`flex-row items-center gap-3 px-4 py-3 ${index > 0 ? 'border-t border-line' : ''}`}
          >
            <Avatar name={member.display_name} />
            <View className="flex-1">
              <Text className="font-semibold text-row-title text-ink">
                {member.display_name}
                {member.user_id === userId ? ' (you)' : ''}
              </Text>
              <Text className="font-sans text-meta text-ink-2">{ROLE_LABELS[member.role]}</Text>
            </View>
          </View>
        ))}
      </Card>
      {editable &&
        (inviting ? (
          <InvitePanel publicUrl={config.publicUrl} onCreate={onCreate} />
        ) : (
          <Button variant="secondary" onPress={() => setInviting(true)}>
            Invite a caregiver
          </Button>
        ))}
    </View>
  );
}

function AppearanceSection() {
  const { setColorScheme } = useColorScheme();
  const [preference, setPreference] = useState<ThemePreference>('system');

  useEffect(() => {
    void loadThemePreference().then(setPreference);
  }, []);

  function change(next: ThemePreference) {
    setPreference(next);
    setColorScheme(next);
    void saveThemePreference(next);
  }

  return (
    <View className="gap-3">
      <SectionLabel>Appearance</SectionLabel>
      <Segmented
        value={preference}
        onChange={change}
        options={[
          { value: 'system', label: 'System' },
          { value: 'light', label: 'Light' },
          { value: 'dark', label: 'Dark' },
        ]}
      />
    </View>
  );
}

function AccountSection({ email }: { email: string }) {
  const { client } = useBabble();
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function leave(action: () => Promise<void>) {
    setError(null);
    try {
      await action();
      queryClient.clear();
      router.replace('/sign-in');
    } catch (caught) {
      setError(toBabbleError(caught).message);
    }
  }

  return (
    <View className="gap-3">
      <SectionLabel>Account</SectionLabel>
      <Card className="gap-4 p-5">
        <Text className="font-sans text-body text-ink-2">{`Signed in as ${email}`}</Text>
        <Button variant="secondary" onPress={() => leave(() => signOut(client))}>
          Sign out
        </Button>
        {confirming ? (
          <View className="gap-4 rounded-tile bg-danger-soft p-4">
            <Text className="font-sans text-meta text-on-danger">
              You'll be signed out on every device and your login is removed. Your family keeps its records while
              another member remains.
            </Text>
            <TextField
              label="Type DELETE to confirm"
              value={confirmText}
              onChangeText={setConfirmText}
              autoCapitalize="characters"
            />
            <Button
              variant="destructive"
              disabled={confirmText !== 'DELETE'}
              onPress={() => leave(() => deleteMyAccount(client))}
            >
              Delete account
            </Button>
            <Button variant="ghost" onPress={() => setConfirming(false)}>
              Cancel
            </Button>
          </View>
        ) : (
          <Button variant="ghost" onPress={() => setConfirming(true)}>
            Delete account
          </Button>
        )}
        {error && <StatusMessage tone="danger">{error}</StatusMessage>}
      </Card>
    </View>
  );
}
