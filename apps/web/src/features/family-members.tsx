import {
  adminCount,
  canChangeRole,
  canRemoveMember,
  canRenameMember,
  MAX_MEMBER_NAME,
  memberNameError,
  removeMember,
  renameMember,
  setMemberRole,
  type BabbleClient,
  type Family,
} from '@babble/api';
import { useAsyncAction } from '@babble/api/react';
import { roleLabel, type MemberRole } from '@babble/domain';
import { useState, type FormEvent } from 'react';
import { Avatar } from '#/components/ui/avatar';
import { Button } from '#/components/ui/button';
import { Card } from '#/components/ui/card';
import { ConfirmPanel } from '#/components/ui/confirm-panel';
import { TextField } from '#/components/ui/field';
import { StatusMessage } from '#/components/ui/status';
import { RolePicker } from '#/components/settings/role-picker';

type Member = Family['members'][number];
type Mode = { kind: 'rename' | 'remove' | 'role'; userId: string } | null;

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
  const [role, setRole] = useState<MemberRole>('caregiver');
  const { run, busy, error, setError } = useAsyncAction();

  function open(next: Mode, member: Member) {
    setError(null);
    setName(member.display_name);
    setRole(member.role);
    setMode(next);
  }

  async function change(task: () => Promise<void>) {
    const done = await run(async () => {
      await task();
      await onChanged();
    });
    if (done) setMode(null);
  }

  function rename(event: FormEvent, member: Member) {
    event.preventDefault();
    const problem = memberNameError(name);
    if (problem) {
      setError(problem);
      return;
    }
    void change(() => renameMember(client, { familyId: family.id, userId: member.user_id }, name));
  }

  return (
    <Card className="divide-y divide-line" role="list" aria-label="Family members">
      {family.members.map((member) => {
        const you = member.user_id === userId;
        const editing = mode?.userId === member.user_id ? mode.kind : null;
        const roleChangeable =
          canChangeRole(family, userId, member.user_id) && !(member.role === 'owner' && adminCount(family) === 1);
        return (
          <div key={member.user_id} role="listitem" className="flex flex-col gap-3 px-4 py-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <Avatar name={member.display_name} className="shrink-0" />
              <div className="min-w-[7rem] flex-1">
                <div className="truncate text-row-title font-semibold">
                  {member.display_name}
                  {you && <span className="text-ink-3"> (you)</span>}
                </div>
                <div className="text-meta text-ink-2">{roleLabel(member.role)}</div>
              </div>
              {!editing && (
                <div className="ml-auto flex">
                  {roleChangeable && (
                    <Button
                      variant="ghost"
                      aria-label={`Change ${member.display_name}'s role`}
                      onClick={() => open({ kind: 'role', userId: member.user_id }, member)}
                    >
                      Role
                    </Button>
                  )}
                  {canRenameMember(family, userId, member.user_id) && (
                    <Button
                      variant="ghost"
                      aria-label={`Rename ${member.display_name}`}
                      onClick={() => open({ kind: 'rename', userId: member.user_id }, member)}
                    >
                      Rename
                    </Button>
                  )}
                  {canRemoveMember(family, userId, member.user_id) && (
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
            {editing === 'role' && (
              <form
                className="flex flex-col gap-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  void change(() => setMemberRole(client, { familyId: family.id, userId: member.user_id }, role));
                }}
              >
                <RolePicker
                  label={you ? 'Your role' : `${member.display_name}'s role`}
                  value={role}
                  onChange={setRole}
                />
                {error && <StatusMessage tone="danger">{error}</StatusMessage>}
                <div className="flex gap-3">
                  <Button type="submit" loading={busy} disabled={role === member.role}>
                    Save
                  </Button>
                  <Button variant="ghost" onClick={() => setMode(null)}>
                    Cancel
                  </Button>
                </div>
              </form>
            )}
            {editing === 'remove' && (
              <ConfirmPanel
                message={`Remove ${member.display_name} from ${family.name}? They'll lose access straight away. What they logged stays.`}
                confirmLabel="Remove"
                loading={busy}
                error={error}
                onConfirm={() =>
                  void change(() => removeMember(client, { familyId: family.id, userId: member.user_id }))
                }
                onCancel={() => setMode(null)}
              />
            )}
          </div>
        );
      })}
    </Card>
  );
}
