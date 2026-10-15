import {
  DEVICES_SHOWN,
  deviceDetail,
  deviceNameError,
  familyDeviceLabel,
  familyDevicesQuery,
  MAX_DEVICE_NAME,
  queryKeys,
  renameDevice,
  shownDevices,
  signOutDevice,
  signOutDeviceMessage,
  signOutThisDevice,
  type BabbleClient,
  type FamilyDevice,
} from '@babble/api';
import { useAsyncAction } from '@babble/api/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { MonitorSmartphone } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Button } from '#/components/ui/button';
import { Card, SectionLabel } from '#/components/ui/card';
import { ConfirmPanel } from '#/components/ui/confirm-panel';
import { TextField } from '#/components/ui/field';
import { useDeviceName } from '#/features/device-name-context';
import { useNow } from '#/lib/use-now';
import { cn } from '#/lib/cn';

export function FamilyDevices({ client, familyId, admin }: { client: BabbleClient; familyId: string; admin: boolean }) {
  const devices = useQuery(familyDevicesQuery(client, familyId)).data;
  const queryClient = useQueryClient();
  const current = useDeviceName();
  const now = useNow(60_000);
  const navigate = useNavigate();
  const [editing, setEditing] = useState<{ kind: 'rename' | 'sign-out'; sessionId: string } | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [name, setName] = useState('');
  const { run, busy, error, setError } = useAsyncAction();

  if (!devices || devices.length === 0) return null;
  const { shown, hidden } = shownDevices(devices, expanded);

  function open(kind: 'rename' | 'sign-out', device: FamilyDevice) {
    setError(null);
    setName(device.name ?? '');
    setEditing({ kind, sessionId: device.sessionId });
  }

  function signOut(device: FamilyDevice) {
    void run(async () => {
      if (device.current) {
        await signOutThisDevice(client, device.sessionId);
        await navigate({ to: '/sign-in', search: { invite: undefined } });
        return;
      }
      await signOutDevice(client, device.sessionId);
      await queryClient.invalidateQueries({ queryKey: queryKeys.familyDevices(familyId) });
    }).then((done) => done && setEditing(null));
  }

  function save(event: FormEvent, device: FamilyDevice) {
    event.preventDefault();
    const problem = deviceNameError(name);
    if (problem) {
      setError(problem);
      return;
    }
    void run(async () => {
      if (device.current) current.setName(name);
      await renameDevice(client, device.sessionId, name);
      await queryClient.invalidateQueries({ queryKey: queryKeys.familyDevices(familyId) });
    }).then((done) => done && setEditing(null));
  }

  return (
    <section className="flex flex-col gap-3" aria-labelledby="family-devices">
      <SectionLabel id="family-devices">{admin ? 'Signed-in devices' : 'Your devices'}</SectionLabel>
      <Card className="divide-y divide-line" role="list" aria-label="Devices">
        {shown.map((device) => {
          const label = familyDeviceLabel(device);
          const mode = editing?.sessionId === device.sessionId ? editing.kind : null;
          return (
            <div key={device.sessionId} role="listitem" className="flex flex-col gap-3 px-4 py-3">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface text-ink-2">
                  <MonitorSmartphone className="size-4" strokeWidth={2.75} />
                </span>
                <div className="min-w-[7rem] flex-1">
                  <div className={cn('truncate text-row-title', label.named ? 'font-semibold' : 'text-ink-2')}>
                    {label.text}
                  </div>
                  <div className="text-meta text-ink-2">{deviceDetail(device, now)}</div>
                </div>
                {!mode && (
                  <div className="ml-auto flex">
                    <Button
                      variant="ghost"
                      aria-label={`Rename ${label.text} (${device.memberName})`}
                      onClick={() => open('rename', device)}
                    >
                      Rename
                    </Button>
                    <Button
                      variant="ghost"
                      className="text-danger"
                      aria-label={`Sign out ${label.text} (${device.memberName})`}
                      onClick={() => open('sign-out', device)}
                    >
                      Sign out
                    </Button>
                  </div>
                )}
              </div>
              {mode === 'sign-out' && (
                <ConfirmPanel
                  message={signOutDeviceMessage(device)}
                  confirmLabel="Sign out"
                  loading={busy}
                  error={error}
                  onConfirm={() => signOut(device)}
                  onCancel={() => setEditing(null)}
                />
              )}
              {mode === 'rename' && (
                <form className="flex flex-col gap-3" onSubmit={(event) => save(event, device)}>
                  <TextField
                    label="Device name"
                    placeholder={familyDeviceLabel({ name: null, userAgent: device.userAgent }).text}
                    hint="Leave it blank to go back to the automatic name."
                    value={name}
                    maxLength={MAX_DEVICE_NAME}
                    autoFocus
                    error={error ?? undefined}
                    onChange={(event) => setName(event.target.value)}
                  />
                  <div className="flex gap-3">
                    <Button type="submit" loading={busy}>
                      Save
                    </Button>
                    <Button variant="ghost" onClick={() => setEditing(null)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
            </div>
          );
        })}
      </Card>
      {(hidden > 0 || expanded) && devices.length > DEVICES_SHOWN && (
        <Button variant="ghost" className="self-start" onClick={() => setExpanded(!expanded)}>
          {expanded ? 'Show fewer' : `Show ${hidden} more`}
        </Button>
      )}
    </section>
  );
}
