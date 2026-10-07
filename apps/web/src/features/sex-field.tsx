import type { BabySex } from '@babble/domain';
import { Segmented } from '#/components/ui/segmented';

type Choice = BabySex | 'unset';

export function SexField({ value, onChange }: { value: BabySex | null; onChange: (sex: BabySex | null) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-label font-semibold">Sex</span>
      <Segmented<Choice>
        label="Sex"
        value={value ?? 'unset'}
        onChange={(choice) => onChange(choice === 'unset' ? null : choice)}
        options={[
          { value: 'female', label: 'Girl' },
          { value: 'male', label: 'Boy' },
          { value: 'unset', label: 'Not set' },
        ]}
      />
      <span className="text-meta text-ink-2">Used to compare growth with the WHO growth charts.</span>
    </div>
  );
}
