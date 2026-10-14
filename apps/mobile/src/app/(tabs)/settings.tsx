import {
  clock,
  deleteMyAccount,
  isAdmin,
  memberRole,
  queryKeys,
  signOut,
  updateBaby,
  type BabyRow,
  type Family,
  authorName,
} from '@babble/api';
import { useAsyncAction } from '@babble/api/react';
import { canAddBaby, planSummary } from '@babble/config';
import { settingsGroups, settingsLockedNote, type SettingsGroup } from '@babble/domain';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import { Button } from '@/components/button';
import { BabyChoiceList } from '@/components/baby-header';
import { Card } from '@/components/card';
import { PlusBadge, PlusDialog } from '@/components/plus';
import { Screen } from '@/components/screen';
import { StatusMessage } from '@/components/status-message';
import { TextField } from '@/components/text-field';
import { DateField } from '@/features/date-field';
import { DayStartPicker } from '@/features/day-start-picker';
import { FamilyMembers } from '@/features/family-members';
import { InviteFlow } from '@/features/invite-flow';
import { MembersLabel, PendingInvites } from '@/features/pending-invites';
import { BabyTrackingSettings, FamilyTrackingSettings } from '@/features/tracking-settings';
import { SexField } from '@/features/sex-field';
import { TimezoneField } from '@/features/timezone-field';
import { ExportData } from '@/features/export-data';
import { PlusPlan } from '@/features/plus-plan';
import { AppearanceSettings } from '@/features/appearance-settings';
import { DeviceNameSetting } from '@/features/device-name-setting';
import { AboutSection } from '@/features/legal-links';
import { useBabble } from '@/lib/babble';
import { useThemePreference } from '@/lib/theme';
import { useOnboarding, useReadyState } from '@/lib/use-onboarding';
import { useActiveBaby } from '@/lib/active-baby';

export default function SettingsTab() {
  const ready = useReadyState();
  const { choices } = useOnboarding();
  const active = useActiveBaby();
  const [pitching, setPitching] = useState(false);
  const { session, client, config } = useBabble();
  if (!ready || !session) return null;
  const { family, baby } = ready;
  const admin = isAdmin(family, session.user.id);
  const lockedNote = settingsLockedNote(memberRole(family, session.user.id));
  const plan = planSummary(config.billingEnabled, family.plan);
  const [babyGroup, familyGroup, deviceGroup, accountGroup] = settingsGroups(baby.name, family.name) as [
    SettingsGroup,
    SettingsGroup,
    SettingsGroup,
    SettingsGroup,
  ];

  return (
    <Screen edges={['top']}>
      <Text className="mb-6 font-bold text-title text-ink">Settings</Text>
      <View className="gap-10">
        <SettingsGroupSection group={babyGroup} note={lockedNote}>
          <Card className="p-2">
            <BabyChoiceList
              choices={choices}
              activeId={baby.id}
              addBabyLocked={!canAddBaby(config.billingEnabled, family.plan, family.babies.length)}
              canAdd={admin}
              onSelect={(choice) => active.select({ familyId: choice.familyId, babyId: choice.baby.id })}
              onPitch={() => setPitching(true)}
            />
          </Card>
          <BabySection key={baby.id} baby={baby} disabled={!admin} />
          <BabyTrackingSettings client={client} babyId={baby.id} disabled={!admin} />
          <ExportData client={client} family={family} baby={baby} scope="baby" />
        </SettingsGroupSection>
        <SettingsGroupSection group={familyGroup} plus={plan?.plus ?? false} note={lockedNote}>
          <MembersSection family={family} userId={session.user.id} admin={admin} />
          {plan && <PlusPlan summary={plan} />}
          <FamilyTrackingSettings client={client} familyId={family.id} babyId={baby.id} disabled={!admin} />
          {family.babies.length > 1 && <ExportData client={client} family={family} baby={baby} scope="family" />}
        </SettingsGroupSection>
        <SettingsGroupSection group={deviceGroup}>
          <DeviceNameSetting you={authorName(family, session.user.id) ?? 'you'} />
          <AppearanceSection babyName={baby.name} />
        </SettingsGroupSection>
        <SettingsGroupSection group={accountGroup}>
          <AccountSection email={session.user.email ?? ''} />
          <AboutSection publicUrl={config.publicUrl} />
        </SettingsGroupSection>
      </View>
      <PlusDialog feature={pitching ? 'multiple_babies' : null} onClose={() => setPitching(false)} />
    </Screen>
  );
}

function SettingsGroupSection({
  group,
  plus = false,
  note = null,
  children,
}: {
  group: SettingsGroup;
  plus?: boolean;
  note?: string | null;
  children: ReactNode;
}) {
  return (
    <View className="gap-4">
      <View>
        <View className="flex-row items-center gap-2">
          <Text accessibilityRole="header" className="font-bold text-heading text-ink">
            {group.title}
          </Text>
          {plus && <PlusBadge />}
        </View>
        <Text className="font-sans text-meta text-ink-2">{group.description}</Text>
      </View>
      {note && <StatusMessage tone="info">{note}</StatusMessage>}
      {children}
    </View>
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
  const { run, error } = useAsyncAction();
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaved(false);
    const ok = await run(async () => {
      await updateBaby(client, baby.id, {
        name: name.trim(),
        birth_date: birthDate,
        timezone,
        day_start_minutes: dayStart,
        sex,
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.families, refetchType: 'all' });
    });
    setSaved(ok);
  }

  return (
    <Card className={`gap-5 p-5 ${disabled ? 'opacity-60' : ''}`} pointerEvents={disabled ? 'none' : 'auto'}>
      <Text className="font-semibold text-row-title text-ink">Profile</Text>
      <TextField label="Name" value={name} onChangeText={setName} />
      <DateField label="Birth date" value={birthDate} onChange={setBirthDate} maximumDate={clock.now()} />
      <SexField value={sex} onChange={setSex} />
      <TimezoneField value={timezone} onChange={setTimezone} />
      <View className="gap-2">
        <Text className="font-semibold text-label text-ink">Day starts at</Text>
        <DayStartPicker value={dayStart} onChange={setDayStart} />
      </View>
      {error && <StatusMessage tone="danger">{error}</StatusMessage>}
      {saved && !error && <StatusMessage tone="success">Saved.</StatusMessage>}
      {!disabled && (
        <Button onPress={save} disabled={!name.trim()}>
          Save changes
        </Button>
      )}
    </Card>
  );
}

function MembersSection({ family, userId, admin }: { family: Family; userId: string; admin: boolean }) {
  const { client, config } = useBabble();
  const queryClient = useQueryClient();
  return (
    <View className="gap-3">
      <MembersLabel client={client} familyId={family.id} editable={admin} />
      <FamilyMembers
        client={client}
        family={family}
        userId={userId}
        onChanged={() => queryClient.invalidateQueries({ queryKey: queryKeys.families, refetchType: 'all' })}
      />
      {admin && <PendingInvites client={client} family={family} />}
      {admin && (
        <InviteFlow
          client={client}
          family={family}
          billingEnabled={config.billingEnabled}
          publicUrl={config.publicUrl}
        />
      )}
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
  const { run, error } = useAsyncAction();

  async function leave(action: () => Promise<void>) {
    if (!(await run(action))) return;
    queryClient.clear();
    router.replace('/sign-in');
  }

  return (
    <Card className="gap-4 p-5">
      <Text className="font-sans text-body text-ink-2">{`Signed in as ${email}`}</Text>
      <Button variant="secondary" onPress={() => leave(() => signOut(client))}>
        Sign out
      </Button>
      {confirming ? (
        <View className="gap-4 rounded-tile bg-danger-soft p-4">
          <Text className="font-sans text-meta text-on-danger">
            You'll be signed out on every device and your login is removed. Your family keeps its records while another
            member remains.
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
  );
}
