import { babySettingsQuery, queryKeys, updateBaby, type BabbleClient, type BabyRow } from '@babble/api';
import { refreshFamilies, useAsyncAction } from '@babble/api/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState, type FormEvent } from 'react';
import { Button } from '#/components/ui/button';
import { Card } from '#/components/ui/card';
import { SelectField, TextField } from '#/components/ui/field';
import { StatusMessage } from '#/components/ui/status';
import { DayStartPicker } from '#/features/day-start-picker';
import { SexField } from '#/features/sex-field';
import { listTimeZones } from '#/lib/timezones';

export function BabySection({ client, baby, disabled }: { client: BabbleClient; baby: BabyRow; disabled: boolean }) {
  const queryClient = useQueryClient();
  const timeZones = useMemo(listTimeZones, []);
  const [name, setName] = useState(baby.name);
  const [birthDate, setBirthDate] = useState(baby.birth_date);
  const [timezone, setTimezone] = useState(baby.timezone);
  const [dayStart, setDayStart] = useState<number | null>(null);
  const nightEnd = useQuery(babySettingsQuery(client, baby.id)).data?.night_end_minutes;
  const [sex, setSex] = useState(baby.sex);
  const [saved, setSaved] = useState(false);
  const { run, error } = useAsyncAction();

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaved(false);
    const ok = await run(async () => {
      await updateBaby(client, baby.id, {
        name: name.trim(),
        birth_date: birthDate,
        timezone,
        ...(dayStart === null ? {} : { day_start_minutes: dayStart }),
        sex,
      });
      setDayStart(null);
      await Promise.all([
        refreshFamilies(queryClient),
        queryClient.invalidateQueries({ queryKey: queryKeys.babySettings(baby.id) }),
      ]);
    });
    setSaved(ok);
  }

  return (
    <Card className="p-5">
      <form onSubmit={save} className="flex flex-col gap-5">
        <h3 className="text-row-title font-semibold">Profile</h3>
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
            <DayStartPicker value={dayStart ?? baby.day_start_minutes} nightEnd={nightEnd} onChange={setDayStart} />
          </div>
        </fieldset>
        {error && <StatusMessage tone="danger">{error}</StatusMessage>}
        {saved && <StatusMessage tone="success">Saved.</StatusMessage>}
        {!disabled && (
          <Button type="submit" className="self-start" disabled={!name.trim() || !birthDate}>
            Save changes
          </Button>
        )}
      </form>
    </Card>
  );
}
