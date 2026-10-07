import { babySettingsQuery, queryKeys, toBabbleError, updateBabySettings, type BabbleClient } from '@babble/api';
import type { Units } from '@babble/domain';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Card, SectionLabel } from '#/components/ui/card';
import { Segmented } from '#/components/ui/segmented';
import { StatusMessage } from '#/components/ui/status';
import { Stepper } from '#/components/ui/stepper';

export function TrackingSettings({
  client,
  babyId,
  disabled,
}: {
  client: BabbleClient;
  babyId: string;
  disabled: boolean;
}) {
  const queryClient = useQueryClient();
  const settings = useQuery(babySettingsQuery(client, babyId)).data;
  const [error, setError] = useState<string | null>(null);

  async function save(patch: Parameters<typeof updateBabySettings>[2]) {
    setError(null);
    try {
      const next = await updateBabySettings(client, babyId, patch);
      queryClient.setQueryData(queryKeys.babySettings(babyId), next);
    } catch (caught) {
      setError(toBabbleError(caught).message);
    }
  }

  if (!settings) return null;

  return (
    <section className="flex flex-col gap-3">
      <SectionLabel>Tracking</SectionLabel>
      <Card className="flex flex-col gap-6 p-5">
        <fieldset disabled={disabled} className="flex flex-col gap-6 disabled:opacity-60">
          <div className="flex flex-col gap-2">
            <span className="text-label font-semibold">Units</span>
            <Segmented<Units>
              label="Units"
              value={settings.units}
              onChange={(units) => save({ units })}
              options={[
                { value: 'metric', label: 'Metric (ml, kg, cm)' },
                { value: 'imperial', label: 'Imperial (oz, lb, in)' },
              ]}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Stepper
              label="Ignore gaps shorter than"
              unit="sec"
              step={5}
              min={0}
              max={300}
              value={settings.downtime_merge_threshold_sec}
              onChange={(value) => value !== null && save({ downtime_merge_threshold_sec: value })}
            />
            <p className="text-meta text-ink-2">Short pauses, like switching sides, won't show as downtime.</p>
          </div>
          <div className="flex flex-col gap-1">
            <Stepper
              label="Finish paused feeds after"
              unit="min"
              step={5}
              min={5}
              max={240}
              value={settings.auto_end_paused_session_min}
              onChange={(value) => value !== null && save({ auto_end_paused_session_min: value })}
            />
            <p className="text-meta text-ink-2">
              A paused feed or pump that's been left this long is finished automatically.
            </p>
          </div>
        </fieldset>
        {error && <StatusMessage tone="danger">{error}</StatusMessage>}
      </Card>
    </section>
  );
}
