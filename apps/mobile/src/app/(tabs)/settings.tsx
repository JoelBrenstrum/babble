import {
  canEdit,
  deleteMyAccount,
  queryKeys,
  signOut,
  toBabbleError,
  updateBaby,
  pendingInvitesQuery,
  type BabyRow,
  type Family,
} from '@babble/api';
import { canAddBaby, canInviteCarer, planSummary } from '@babble/config';
import { settingsGroups, type SettingsGroup } from '@babble/domain';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Lock } from 'lucide-react-native';
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
import { InvitePanel } from '@/features/invite-panel';
import { MembersLabel, PendingInvites, useCreateInvite } from '@/features/pending-invites';
import { BabyTrackingSettings, FamilyTrackingSettings } from '@/features/tracking-settings';
import { SexField } from '@/features/sex-field';
import { TimezoneField } from '@/features/timezone-field';
import { ExportData } from '@/features/export-data';
import { PlusPlan } from '@/features/plus-plan';
import { AppearanceSettings } from '@/features/appearance-settings';
import { AboutSection } from '@/features/legal-links';
import { useBabble } from '@/lib/babble';
import { useThemePreference, useTokenColor } from '@/lib/theme';
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
  const editable = canEdit(family, session.user.id);
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
        <SettingsGroupSection group={babyGroup}>
          <Card className="p-2">
            <BabyChoiceList
              choices={choices}
              activeId={baby.id}
              addBabyLocked={!canAddBaby(config.billingEnabled, family.plan, family.babies.length)}
              onSelect={(choice) => active.select({ familyId: choice.familyId, babyId: choice.baby.id })}
              onPitch={() => setPitching(true)}
            />
          </Card>
          <BabySection key={baby.id} baby={baby} disabled={!editable} />
          <BabyTrackingSettings client={client} babyId={baby.id} disabled={!editable} />
          <ExportData client={client} family={family} baby={baby} scope="baby" />
        </SettingsGroupSection>
        <SettingsGroupSection group={familyGroup} plus={plan?.plus ?? false}>
          <MembersSection family={family} userId={session.user.id} editable={editable} />
          {plan && <PlusPlan summary={plan} />}
          <FamilyTrackingSettings client={client} familyId={family.id} babyId={baby.id} disabled={!editable} />
          {family.babies.length > 1 && <ExportData client={client} family={family} baby={baby} scope="family" />}
        </SettingsGroupSection>
        <SettingsGroupSection group={deviceGroup}>
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
  children,
}: {
  group: SettingsGroup;
  plus?: boolean;
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
    <Card className={`gap-5 p-5 ${disabled ? 'opacity-60' : ''}`} pointerEvents={disabled ? 'none' : 'auto'}>
      <Text className="font-semibold text-row-title text-ink">Profile</Text>
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
  );
}

function MembersSection({ family, userId, editable }: { family: Family; userId: string; editable: boolean }) {
  const { client, config } = useBabble();
  const queryClient = useQueryClient();
  const [inviting, setInviting] = useState(false);
  const [pitching, setPitching] = useState(false);
  const onCreate = useCreateInvite(client, family.id);
  const pending = useQuery({ ...pendingInvitesQuery(client, family.id), enabled: editable }).data ?? [];
  const locked = !canInviteCarer(config.billingEnabled, family.plan, family.members.length, pending.length);
  const muted = useTokenColor('--ink-2');
  return (
    <View className="gap-3">
      <MembersLabel client={client} familyId={family.id} editable={editable} />
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
          <Button
            variant="secondary"
            icon={locked ? <Lock size={18} color={muted} strokeWidth={2.75} /> : undefined}
            accessibilityLabel={locked ? 'Invite a caregiver, Babble Plus' : undefined}
            onPress={() => (locked ? setPitching(true) : setInviting(true))}
          >
            Invite a caregiver
          </Button>
        ))}
      {editable && locked && !inviting && (
        <View className="flex-row items-center justify-center gap-2">
          <PlusBadge />
          <Text className="font-sans text-meta text-ink-2">Two carers on the free plan</Text>
        </View>
      )}
      <PlusDialog feature={pitching ? 'extra_carers' : null} onClose={() => setPitching(false)} />
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
