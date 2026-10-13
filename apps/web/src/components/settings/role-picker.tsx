import { MEMBER_ROLES, roleDescription, roleLabel, type MemberRole } from '@babble/domain';
import { Segmented } from '#/components/ui/segmented';

const OPTIONS = MEMBER_ROLES.map((role) => ({ value: role, label: roleLabel(role) }));

export function RolePicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: MemberRole;
  onChange: (role: MemberRole) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Segmented label={label} value={value} options={OPTIONS} onChange={onChange} />
      <p className="text-meta text-ink-2">{roleDescription(value)}</p>
    </div>
  );
}
