import { authorName, babyChoices, memberRole } from '@babble/api';
import { refreshFamilies } from '@babble/api/react';
import { canAddBaby, familyHasFeature, planSummary } from '@babble/config';
import { settingsGroups, settingsLockedNote, type SettingsGroup, type SettingsGroupId } from '@babble/domain';
import { createFileRoute, useRouter } from '@tanstack/react-router';
import { Lock } from 'lucide-react';
import type { ReactNode } from 'react';
import { AccountSection } from '#/components/settings/account-section';
import { BabySection } from '#/components/settings/baby-section';
import { InviteToggle } from '#/components/settings/invite-toggle';
import { CardLink } from '#/components/ui/card-link';
import { FamilyDevices } from '#/features/family-devices';
import { FamilyMembers } from '#/features/family-members';
import { MembersLabel, PendingInvites } from '#/features/pending-invites';
import { PlusBadge } from '#/features/plus-dialog';
import { PlusPlan } from '#/features/plus-plan';
import { BabyTrackingSettings, FamilyTrackingSettings } from '#/features/tracking-settings';
import { SettingsBabyPicker } from '#/features/settings-baby-picker';
import { ChairModeCard } from '#/features/chair/chair-mode-card';
import { ExportData } from '#/features/export-data';
import { InstallSection } from '#/features/install-app';
import { AppearanceSettings } from '#/features/appearance-settings';
import { DeviceNameSetting } from '#/features/device-name-setting';
import { AboutSection } from '#/features/legal/legal-links';
import { useSelectBaby } from '#/lib/use-select-baby';

export const Route = createFileRoute('/_app/settings')({ component: SettingsPage });

function SettingsPage() {
  const { family, families, session, babble, baby, queryClient, admin, canLog } = Route.useRouteContext();
  const router = useRouter();
  const selectBaby = useSelectBaby();
  const lockedNote = settingsLockedNote(memberRole(family, session.user.id));
  const plan = planSummary(babble.config.billingEnabled, family.plan);
  const groups = settingsGroups(baby.name, family.name);

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-4">
        <h1 className="text-title font-bold">Settings</h1>
        <nav aria-label="Settings sections" className="flex flex-wrap gap-2">
          {groups.map((group) => (
            <a
              key={group.id}
              href={`#settings-${group.id}`}
              className="min-h-tap-sm inline-flex items-center rounded-full bg-surface px-4 text-label font-semibold text-ink-2 hover:bg-line hover:text-ink"
            >
              {group.nav}
            </a>
          ))}
        </nav>
      </div>

      <SettingsGroupSection groups={groups} id="baby" note={lockedNote}>
        <SettingsBabyPicker
          choices={babyChoices(families)}
          activeId={baby.id}
          onSelect={selectBaby}
          addBabyLocked={!canAddBaby(babble.config.billingEnabled, family.plan, family.babies.length)}
          canAddBaby={admin}
        />
        <BabySection key={baby.id} client={babble.client} baby={baby} disabled={!admin} />
        <BabyTrackingSettings client={babble.client} babyId={baby.id} disabled={!admin} />
        {canLog && (
          <CardLink to="/import" title="Import data" description="From a babble export or a Huckleberry CSV" />
        )}
        <ExportData client={babble.client} family={family} baby={baby} scope="baby" />
      </SettingsGroupSection>

      <SettingsGroupSection groups={groups} id="family" badge={plan?.plus ? <PlusBadge /> : null} note={lockedNote}>
        <section className="flex flex-col gap-3">
          <MembersLabel client={babble.client} familyId={family.id} editable={admin} />
          <FamilyMembers
            client={babble.client}
            family={family}
            userId={session.user.id}
            onChanged={async () => {
              await refreshFamilies(queryClient);
              await router.invalidate();
            }}
          />
          {admin && <PendingInvites client={babble.client} family={family} />}
          {admin && (
            <InviteToggle
              client={babble.client}
              family={family}
              billingEnabled={babble.config.billingEnabled}
              publicUrl={babble.config.publicUrl}
            />
          )}
        </section>
        <FamilyDevices client={babble.client} familyId={family.id} admin={admin} />
        {plan && <PlusPlan summary={plan} />}
        <FamilyTrackingSettings client={babble.client} familyId={family.id} babyId={baby.id} disabled={!admin} />
        {family.babies.length > 1 && <ExportData client={babble.client} family={family} baby={baby} scope="family" />}
      </SettingsGroupSection>

      <SettingsGroupSection groups={groups} id="device">
        <DeviceNameSetting you={authorName(family, session.user.id) ?? 'you'} />
        <AppearanceSettings client={babble.client} baby={baby} />
        <ChairModeCard
          locked={!familyHasFeature(babble.config.billingEnabled, family.plan, 'chair_mode')}
          plusBadge={babble.config.billingEnabled}
        />
        <InstallSection />
      </SettingsGroupSection>

      <SettingsGroupSection groups={groups} id="account">
        <AccountSection client={babble.client} email={session.user.email ?? ''} />
        <AboutSection />
      </SettingsGroupSection>
    </div>
  );
}

function SettingsGroupSection({
  groups,
  id,
  badge,
  note,
  children,
}: {
  groups: SettingsGroup[];
  id: SettingsGroupId;
  badge?: ReactNode;
  note?: string | null;
  children: ReactNode;
}) {
  const group = groups.find((candidate) => candidate.id === id);
  if (!group) return null;
  return (
    <section
      id={`settings-${group.id}`}
      aria-labelledby={`settings-${group.id}-title`}
      className="flex scroll-mt-6 flex-col gap-4"
    >
      <div>
        <div className="flex items-center gap-2">
          <h2 id={`settings-${group.id}-title`} className="text-heading font-bold">
            {group.title}
          </h2>
          {badge}
        </div>
        <p className="text-meta text-ink-2">{group.description}</p>
        {note && (
          <p className="mt-2 flex items-start gap-2 text-meta text-ink-2">
            <Lock aria-hidden className="mt-0.5 size-4 shrink-0" strokeWidth={2.5} />
            {note}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}
