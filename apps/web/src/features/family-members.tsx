import {
  canRemoveMember,
  canRenameMember,
  MAX_MEMBER_NAME,
  memberNameError,
  removeMember,
  renameMember,
  toBabbleError,
  type BabbleClient,
  type Family,
} from '@babble/api';
import { useState, type FormEvent } from 'react';
import { Avatar } from '#/components/ui/avatar';
import { Button } from '#/components/ui/button';
import { Card } from '#/components/ui/card';
import { TextField } from '#/components/ui/field';
import { StatusMessage } from '#/components/ui/status';

const ROLE_LABELS = { owner: 'Owner', caregiver: 'Caregiver', viewer: 'Viewer' } as const;

type Member = Family['members'][number];
type Mode = { kind: 'rename'; userId: string } | { kind: 'remove'; userId: string } | null;

export function FamilyMembers({
  client,
  family,
  userId,
  onChanged,
}: {
  client: BabbleClient;
  family: Family;
  userId: string;
  onChanged: () => Promise<unknown>;
}) {
  const [mode, setMode] = useState<Mode>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function open(next: Mode, member: Member) {
    setError(null);
    setName(member.display_name);
    setMode(next);
  }

  async function run(task: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await task();
      await onChanged();
      setMode(null);
    } catch (caught) {
      setError(toBabbleError(caught).message);
    } finally {
      setBusy(false);
    }
  }

  function rename(event: FormEvent, member: Member) {
    event.preventDefault();
    const problem = memberNameError(name);
    if (problem) {
      setError(problem);
      return;
    }
    void run(() => renameMember(client, { familyId: family.id, userId: member.user_id }, name));
  }

  return (
    <Card className="divide-y divide-line" role="list" aria-label="Family members">
      {family.members.map((member) => {
        const you = member.user_id === userId;
        const editing = mode?.userId === member.user_id ? mode.kind : null;
        return (
          <div key={member.user_id} role="listitem" className="flex flex-col gap-3 px-4 py-3">
            <div className="flex items-center gap-3">
              <Avatar name={member.display_name} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-row-title font-semibold">
                  {member.display_name}
                  {you && <span className="text-ink-3"> (you)</span>}
                </div>
                <div className="text-meta text-ink-2">{ROLE_LABELS[member.role]}</div>
              </div>
              {!editing && canRenameMember(family, userId, member.user_id) && (
                <Button
                  variant="ghost"
                  aria-label={`Rename ${member.display_name}`}
                  onClick={() => open({ kind: 'rename', userId: member.user_id }, member)}
                >
                  Rename
                </Button>
              )}
              {!editing && canRemoveMember(family, userId, member.user_id) && (
                <Button
                  variant="ghost"
                  className="text-danger"
                  aria-label={`Remove ${member.display_name}`}
                  onClick={() => open({ kind: 'remove', userId: member.user_id }, member)}
                >
                  Remove
                </Button>
              )}
            </div>
            {editing === 'rename' && (
              <form className="flex flex-col gap-3" onSubmit={(event) => rename(event, member)}>
                <TextField
                  label={you ? 'Your name' : `${member.display_name}'s name`}
                  value={name}
                  maxLength={MAX_MEMBER_NAME}
                  autoFocus
                  error={error ?? undefined}
                  onChange={(event) => setName(event.target.value)}
                />
                <div className="flex gap-3">
                  <Button type="submit" loading={busy}>
                    Save
                  </Button>
                  <Button variant="ghost" onClick={() => setMode(null)}>
                    Cancel
                  </Button>
                </div>
              </form>
            )}
            {editing === 'remove' && (
              <div className="flex flex-col gap-3 rounded-tile bg-danger-soft p-4">
                <p className="text-meta text-on-danger">
                  Remove {member.display_name} from {family.name}? They'll lose access straight away. What they logged
                  stays.
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="destructive"
                    loading={busy}
                    onClick={() =>
                      void run(() => removeMember(client, { familyId: family.id, userId: member.user_id }))
                    }
                  >
                    Remove
                  </Button>
                  <Button variant="ghost" onClick={() => setMode(null)}>
                    Cancel
                  </Button>
                </div>
                {error && <StatusMessage tone="danger">{error}</StatusMessage>}
              </div>
            )}
          </div>
        );
      })}
    </Card>
  );
}
