import { acceptInvite, createFamily, familiesQuery, queryKeys, toBabbleError } from '@babble/api';
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { useState, type FormEvent } from 'react';
import { CenteredPage } from '#/components/shell/centered-page';
import { Button } from '#/components/ui/button';
import { TextField } from '#/components/ui/field';
import { Segmented } from '#/components/ui/segmented';
import { StatusMessage } from '#/components/ui/status';
import { readStorage, storageKeys, writeStorage } from '#/lib/storage';

export const Route = createFileRoute('/onboarding/family')({
  beforeLoad: async ({ context }) => {
    const families = await context.queryClient.ensureQueryData(familiesQuery(context.babble.client));
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
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const familyId =
        mode === 'create'
          ? await createFamily(babble.client, { familyName, displayName })
          : await acceptInvite(babble.client, { code: inviteCode, displayName });
      writeStorage(storageKeys.activeFamily, familyId);
      writeStorage(storageKeys.pendingInvite, null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.families, refetchType: 'all' });
      await navigate({ to: mode === 'create' ? '/onboarding/baby' : '/' });
    } catch (caught) {
      setError(toBabbleError(caught).message);
      setSubmitting(false);
    }
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
            placeholder="K7Q-4MD"
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
