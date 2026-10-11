import {
  canEdit,
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
import { useState } from 'react';
import { Text, View } from 'react-native';
import { Button } from '@/components/button';
import { Card, SectionLabel } from '@/components/card';
import { Screen } from '@/components/screen';
import { StatusMessage } from '@/components/status-message';
import { TextField } from '@/components/text-field';
import { DateField } from '@/features/date-field';
import { DayStartPicker } from '@/features/day-start-picker';
import { FamilyMembers } from '@/features/family-members';
import { InvitePanel } from '@/features/invite-panel';
import { CaregiversLabel, PendingInvites, useCreateInvite } from '@/features/pending-invites';
import { TrackingSettings } from '@/features/tracking-settings';
import { SexField } from '@/features/sex-field';
import { TimezoneField } from '@/features/timezone-field';
import { ExportData } from '@/features/export-data';
import { AppearanceSettings } from '@/features/appearance-settings';
import { AboutSection } from '@/features/legal-links';
import { useBabble } from '@/lib/babble';
import { useThemePreference } from '@/lib/theme';
import { useReadyState } from '@/lib/use-onboarding';

export default function SettingsTab() {
  const ready = useReadyState();
  const { session, client, config } = useBabble();
  if (!ready || !session) return null;
  const editable = canEdit(ready.family, session.user.id);

  return (
    <Screen edges={['top']}>
      <Text className="mb-6 font-bold text-title text-ink">Settings</Text>
      <View className="gap-8">
        <BabySection baby={ready.baby} disabled={!editable} />
        <CaregiversSection family={ready.family} userId={session.user.id} editable={editable} />
        <TrackingSettings client={client} babyId={ready.baby.id} disabled={!editable} />
        <View className="gap-3">
          <SectionLabel>Data</SectionLabel>
          <ExportData client={client} family={ready.family} baby={ready.baby} />
        </View>
        <AppearanceSection babyName={ready.baby.name} />
        <AccountSection email={session.user.email ?? ''} />
        <AboutSection publicUrl={config.publicUrl} />
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
  const [sex, setSex] = useState(baby.sex);
  const [status, setStatus] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);

  async function save() {
    setStatus(null);
    try {
      await updateBaby(client, baby.id, {
        name: name.trim(),
        birth_date: birthDate,
        timezone,
        day_start_minutes: dayStart,
        sex,
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
        <SexField value={sex} onChange={setSex} />
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
  const queryClient = useQueryClient();
  const [inviting, setInviting] = useState(false);
  const onCreate = useCreateInvite(client, family.id);
  return (
    <View className="gap-3">
      <CaregiversLabel client={client} familyId={family.id} editable={editable} />
      <FamilyMembers
        client={client}
        family={family}
        userId={userId}
        onChanged={() => queryClient.invalidateQueries({ queryKey: queryKeys.families, refetchType: 'all' })}
      />
      {editable && <PendingInvites client={client} family={family} />}
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

function AppearanceSection({ babyName }: { babyName: string }) {
  const { preference, night, choose } = useThemePreference();
  return <AppearanceSettings value={preference} babyName={babyName} night={night} onChange={choose} />;
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
