import { canEdit, deleteMyAccount, updatePassword, queryKeys, signOut, toBabbleError, updateBaby } from '@babble/api';
import { createFileRoute, Link, useNavigate, useRouter } from '@tanstack/react-router';
import { ChevronRight, LogOut, UserPlus } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { Button } from '#/components/ui/button';
import { Card, SectionLabel } from '#/components/ui/card';
import { SexField } from '#/features/sex-field';
import { SelectField, TextField } from '#/components/ui/field';
import { StatusMessage } from '#/components/ui/status';
import { DayStartPicker } from '#/features/day-start-picker';
import { FamilyMembers } from '#/features/family-members';
import { InvitePanel } from '#/features/invite-panel';
import { CaregiversLabel, PendingInvites, useCreateInvite } from '#/features/pending-invites';
import { PasswordForm } from '#/features/password-form';
import { TrackingSettings } from '#/features/tracking-settings';
import { ExportData } from '#/features/export-data';
import { InstallSection } from '#/features/install-app';
import { AppearanceSettings } from '#/features/appearance-settings';
import { AboutSection } from '#/features/legal/legal-links';
import { clearAccountStorage } from '#/lib/storage';
import { listTimeZones } from '#/lib/timezones';

export const Route = createFileRoute('/_app/settings')({ component: SettingsPage });

function SettingsPage() {
  const { family, session, babble, baby, queryClient } = Route.useRouteContext();
  const router = useRouter();
  const editable = canEdit(family, session.user.id);

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-title font-bold">Settings</h1>
      <BabySection disabled={!editable} />

      <section className="flex flex-col gap-3">
        <CaregiversLabel client={babble.client} familyId={family.id} editable={editable} />
        <FamilyMembers
          client={babble.client}
          family={family}
          userId={session.user.id}
          onChanged={async () => {
            await queryClient.invalidateQueries({ queryKey: queryKeys.families, refetchType: 'all' });
            await router.invalidate();
          }}
        />
        {editable && <PendingInvites client={babble.client} family={family} />}
        {editable && <InviteToggle familyId={family.id} />}
      </section>

      <TrackingSettings client={babble.client} babyId={baby.id} disabled={!editable} />
      <section className="flex flex-col gap-3">
        <SectionLabel>Data</SectionLabel>
        <Link
          to="/import"
          className="flex min-h-tap items-center justify-between rounded-card bg-raised px-5 py-4 shadow-raised hover:bg-surface"
        >
          <span>
            <span className="block text-row-title font-semibold">Import from Huckleberry</span>
            <span className="block text-meta text-ink-2">Bring in your history from a Huckleberry CSV export</span>
          </span>
          <ChevronRight className="size-5 text-ink-3" strokeWidth={2.75} />
        </Link>
        <ExportData client={babble.client} family={family} baby={baby} />
      </section>
      <AppearanceSettings client={babble.client} baby={baby} />
      <section className="flex flex-col gap-3">
        <SectionLabel>Chair mode</SectionLabel>
        <Link
          to="/chair"
          className="flex min-h-tap items-center justify-between rounded-card bg-raised px-5 py-4 shadow-raised hover:bg-surface"
        >
          <span>
            <span className="block text-row-title font-semibold">Open chair mode</span>
            <span className="block text-meta text-ink-2">
              A full-screen feed station for a tablet or touchscreen by the feeding chair. It keeps the screen on.
            </span>
          </span>
          <ChevronRight className="size-5 text-ink-3" strokeWidth={2.75} />
        </Link>
      </section>
      <InstallSection />
      <AccountSection email={session.user.email ?? ''} />
      <AboutSection />
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
  const [sex, setSex] = useState(baby.sex);
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
        sex,
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.families, refetchType: 'all' });
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
            <SexField value={sex} onChange={setSex} />
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
  const { babble } = Route.useRouteContext();
  const [open, setOpen] = useState(false);
  const onCreate = useCreateInvite(babble.client, familyId);
  return open ? (
    <InvitePanel publicUrl={babble.config.publicUrl} onCreate={onCreate} />
  ) : (
    <Button variant="secondary" className="self-start" onClick={() => setOpen(true)}>
      <UserPlus className="size-5" strokeWidth={2.75} />
      Invite a caregiver
    </Button>
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
      clearAccountStorage();
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
        <ChangePassword />
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

function ChangePassword() {
  const { babble } = Route.useRouteContext();
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  if (!open) {
    return (
      <div className="flex flex-col gap-2">
        <Button variant="secondary" className="self-start" onClick={() => setOpen(true)}>
          Change password
        </Button>
        {saved && <StatusMessage tone="success">Password saved.</StatusMessage>}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3 rounded-tile border border-line p-4">
      <PasswordForm
        submitLabel="Save password"
        onSubmit={async (password) => {
          await updatePassword(babble.client, password);
          setOpen(false);
          setSaved(true);
        }}
      />
      <Button variant="ghost" className="self-start" onClick={() => setOpen(false)}>
        Cancel
      </Button>
    </div>
  );
}
