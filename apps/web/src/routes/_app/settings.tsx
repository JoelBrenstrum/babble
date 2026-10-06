import { canEdit, deleteMyAccount, queryKeys, signOut, toBabbleError, updateBaby } from '@babble/api';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { LogOut, UserPlus } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { Avatar } from '#/components/ui/avatar';
import { Button } from '#/components/ui/button';
import { Card, SectionLabel } from '#/components/ui/card';
import { SelectField, TextField } from '#/components/ui/field';
import { Segmented } from '#/components/ui/segmented';
import { StatusMessage } from '#/components/ui/status';
import { DayStartPicker } from '#/features/day-start-picker';
import { InvitePanel } from '#/features/invite-panel';
import { readStorage, storageKeys, writeStorage } from '#/lib/storage';
import { applyTheme, type ThemePreference } from '#/lib/theme';
import { listTimeZones } from '#/lib/timezones';

export const Route = createFileRoute('/_app/settings')({ component: SettingsPage });

const ROLE_LABELS = { owner: 'Owner', caregiver: 'Caregiver', viewer: 'Viewer' } as const;

function SettingsPage() {
  const { family, session } = Route.useRouteContext();
  const editable = canEdit(family, session.user.id);

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-title font-bold">Settings</h1>
      <BabySection disabled={!editable} />

      <section className="flex flex-col gap-3">
        <SectionLabel>Caregivers</SectionLabel>
        <Card className="divide-y divide-line">
          {family.members.map((member) => (
            <div key={member.user_id} className="flex items-center gap-3 px-4 py-3">
              <Avatar name={member.display_name} />
              <div className="flex-1">
                <div className="text-row-title font-semibold">
                  {member.display_name}
                  {member.user_id === session.user.id && <span className="text-ink-3"> (you)</span>}
                </div>
                <div className="text-meta text-ink-2">{ROLE_LABELS[member.role]}</div>
              </div>
            </div>
          ))}
        </Card>
        {editable && <InviteToggle familyId={family.id} />}
      </section>

      <AppearanceSection />
      <AccountSection email={session.user.email ?? ''} />
    </div>
  );
}

function BabySection({ disabled }: { disabled: boolean }) {
  const { babble, queryClient, baby } = Route.useRouteContext();
  const timeZones = useMemo(listTimeZones, []);
  const [name, setName] = useState(baby.name);
  const [birthDate, setBirthDate] = useState(baby.birth_date);
  const [timezone, setTimezone] = useState(baby.timezone);
  const [dayStart, setDayStart] = useState(baby.day_start_minutes);
  const [status, setStatus] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);

  async function save(event: FormEvent) {
    event.preventDefault();
    setStatus(null);
    try {
      await updateBaby(babble.client, baby.id, {
        name: name.trim(),
        birth_date: birthDate,
        timezone,
        day_start_minutes: dayStart,
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.families });
      setStatus({ tone: 'success', text: 'Saved.' });
    } catch (caught) {
      setStatus({ tone: 'danger', text: toBabbleError(caught).message });
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <SectionLabel>Baby</SectionLabel>
      <Card className="p-5">
        <form onSubmit={save} className="flex flex-col gap-5">
          <fieldset disabled={disabled} className="flex flex-col gap-5 disabled:opacity-60">
            <div className="grid gap-5 md:grid-cols-2">
              <TextField label="Name" value={name} onChange={(event) => setName(event.target.value)} />
              <TextField
                label="Birth date"
                type="date"
                value={birthDate}
                onChange={(event) => setBirthDate(event.target.value)}
              />
            </div>
            <SelectField label="Timezone" value={timezone} onChange={(event) => setTimezone(event.target.value)}>
              {timeZones.map((zone) => (
                <option key={zone} value={zone}>
                  {zone.replaceAll('_', ' ')}
                </option>
              ))}
            </SelectField>
            <div className="flex flex-col gap-2">
              <span className="text-label font-semibold">Day starts at</span>
              <DayStartPicker value={dayStart} onChange={setDayStart} />
            </div>
          </fieldset>
          {status && <StatusMessage tone={status.tone}>{status.text}</StatusMessage>}
          {!disabled && (
            <Button type="submit" className="self-start" disabled={!name.trim() || !birthDate}>
              Save changes
            </Button>
          )}
        </form>
      </Card>
    </section>
  );
}

function InviteToggle({ familyId }: { familyId: string }) {
  const [open, setOpen] = useState(false);
  return open ? (
    <InvitePanel familyId={familyId} />
  ) : (
    <Button variant="secondary" className="self-start" onClick={() => setOpen(true)}>
      <UserPlus className="size-5" strokeWidth={2.75} />
      Invite a caregiver
    </Button>
  );
}

function AppearanceSection() {
  const [theme, setTheme] = useState<ThemePreference>(() => {
    const stored = readStorage(storageKeys.theme);
    return stored === 'light' || stored === 'dark' ? stored : 'system';
  });

  function change(next: ThemePreference) {
    setTheme(next);
    writeStorage(storageKeys.theme, next === 'system' ? null : next);
    applyTheme(next);
  }

  return (
    <section className="flex flex-col gap-3">
      <SectionLabel>Appearance</SectionLabel>
      <Segmented
        label="Theme"
        value={theme}
        onChange={change}
        options={[
          { value: 'system', label: 'System' },
          { value: 'light', label: 'Light' },
          { value: 'dark', label: 'Dark' },
        ]}
      />
    </section>
  );
}

function AccountSection({ email }: { email: string }) {
  const { babble, queryClient } = Route.useRouteContext();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function leave(action: () => Promise<void>) {
    setError(null);
    try {
      await action();
      for (const key of [storageKeys.activeFamily, storageKeys.activeBaby]) writeStorage(key, null);
      queryClient.clear();
      await navigate({ to: '/sign-in', search: { invite: undefined } });
    } catch (caught) {
      setError(toBabbleError(caught).message);
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <SectionLabel>Account</SectionLabel>
      <Card className="flex flex-col gap-4 p-5">
        <div className="text-body text-ink-2">
          Signed in as <span className="font-semibold text-ink">{email}</span>
        </div>
        <Button variant="secondary" className="self-start" onClick={() => leave(() => signOut(babble.client))}>
          <LogOut className="size-5" strokeWidth={2.75} />
          Sign out
        </Button>
        {confirming ? (
          <div className="flex flex-col gap-4 rounded-tile bg-danger-soft p-4">
            <p className="text-meta text-on-danger">
              You'll be signed out on every device and your login is removed. Your family keeps its records while
              another member remains.
            </p>
            <TextField
              label="Type DELETE to confirm"
              value={confirmText}
              onChange={(event) => setConfirmText(event.target.value)}
            />
            <div className="flex gap-3">
              <Button
                variant="destructive"
                disabled={confirmText !== 'DELETE'}
                onClick={() => leave(() => deleteMyAccount(babble.client))}
              >
                Delete account
              </Button>
              <Button variant="ghost" onClick={() => setConfirming(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="ghost" className="self-start text-danger" onClick={() => setConfirming(true)}>
            Delete account
          </Button>
        )}
        {error && <StatusMessage tone="danger">{error}</StatusMessage>}
      </Card>
    </section>
  );
}
