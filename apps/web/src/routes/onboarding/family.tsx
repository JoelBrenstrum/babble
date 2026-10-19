import { acceptInvite, createFamily, familiesQuery } from '@babble/api';
import { refreshFamilies, useAsyncAction } from '@babble/api/react';
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { useState, type FormEvent } from 'react';
import { CenteredPage } from '#/components/shell/centered-page';
import { Button } from '#/components/ui/button';
import { TextField } from '#/components/ui/field';
import { Segmented } from '#/components/ui/segmented';
import { StatusMessage } from '#/components/ui/status';
import { ensureCurrentData } from '#/lib/query-persistence';
import { readStorage, storageKeys, writeStorage } from '#/lib/storage';

export const Route = createFileRoute('/onboarding/family')({
  beforeLoad: async ({ context }) => {
    const families = await ensureCurrentData(context.queryClient, familiesQuery(context.babble.client));
    if (families.length > 0) throw redirect({ to: '/' });
  },
  component: FamilyStep,
});

type Mode = 'create' | 'join';

function FamilyStep() {
  const { babble, queryClient, session } = Route.useRouteContext();
  const navigate = useNavigate();
  const pendingInvite = readStorage(storageKeys.pendingInvite);
  const [mode, setMode] = useState<Mode>(pendingInvite ? 'join' : 'create');
  const [displayName, setDisplayName] = useState(
    (session.user.user_metadata.full_name as string | undefined)?.split(' ')[0] ?? '',
  );
  const [familyName, setFamilyName] = useState('');
  const [inviteCode, setInviteCode] = useState(pendingInvite ?? '');
  const { run, busy: submitting, error } = useAsyncAction();

  function submit(event: FormEvent) {
    event.preventDefault();
    void run(async () => {
      const familyId =
        mode === 'create'
          ? await createFamily(babble.client, { familyName, displayName })
          : await acceptInvite(babble.client, { code: inviteCode, displayName });
      writeStorage(storageKeys.activeFamily, familyId);
      writeStorage(storageKeys.pendingInvite, null);
      await refreshFamilies(queryClient);
      await navigate({ to: mode === 'create' ? '/onboarding/baby' : '/' });
    });
  }

  const valid = displayName.trim() && (mode === 'create' ? familyName.trim() : inviteCode.trim());

  return (
    <CenteredPage step="Step 1 of 4">
      <h1 className="text-title font-bold">Set up your family</h1>
      <p className="mb-8 mt-2 text-body text-ink-2">Everyone in a family shares the same babies, timers and history.</p>
      <form onSubmit={submit} className="flex flex-col gap-5">
        <Segmented
          label="Create or join"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'create', label: 'Create a family' },
            { value: 'join', label: 'Join with a code' },
          ]}
        />
        <TextField
          label="Your name"
          autoComplete="given-name"
          hint="Shown to your family, e.g. on timers you start."
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
        />
        {mode === 'create' ? (
          <TextField
            label="Family name"
            placeholder="The Smiths"
            value={familyName}
            onChange={(event) => setFamilyName(event.target.value)}
          />
        ) : (
          <TextField
            label="Invite code"
            placeholder="K7Q4M-D2XPA"
            autoCapitalize="characters"
            value={inviteCode}
            onChange={(event) => setInviteCode(event.target.value)}
          />
        )}
        {error && <StatusMessage tone="danger">{error}</StatusMessage>}
        <Button type="submit" size="lg" disabled={!valid} loading={submitting}>
          {submitting
            ? mode === 'create'
              ? 'Creating family…'
              : 'Joining…'
            : mode === 'create'
              ? 'Continue'
              : 'Join family'}
        </Button>
      </form>
    </CenteredPage>
  );
}
