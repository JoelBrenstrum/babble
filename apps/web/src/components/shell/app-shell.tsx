import type { BabyRow, Family } from '@babble/api';
import { babyAgeLabel, todayInTimeZone } from '@babble/domain';
import { Link } from '@tanstack/react-router';
import { ChartColumn, History, House, Settings, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Avatar } from '#/components/ui/avatar';
import { Wordmark } from '#/components/ui/wordmark';
import { cn } from '#/lib/cn';

interface NavItem {
  to: '/' | '/history' | '/stats' | '/settings';
  label: string;
  icon: LucideIcon;
}

const NAV: readonly NavItem[] = [
  { to: '/', label: 'Home', icon: House },
  { to: '/history', label: 'History', icon: History },
  { to: '/stats', label: 'Stats', icon: ChartColumn },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function AppShell({ family, baby, children }: { family: Family; baby: BabyRow; children: ReactNode }) {
  const age = babyAgeLabel(baby.birth_date, todayInTimeZone(baby.timezone));
  return (
    <div className="min-h-dvh bg-bg md:pl-[84px] xl:pl-[268px]">
      <aside className="fixed inset-y-0 left-0 hidden w-[84px] flex-col border-r border-line bg-raised md:flex xl:w-[268px]">
        <div className="flex h-20 items-center justify-center px-6 xl:justify-start">
          <Wordmark className="hidden text-[28px] xl:inline" />
          <span className="font-brand text-[28px] text-primary xl:hidden">b</span>
        </div>
        <div className="mx-3 mb-4 flex items-center gap-3 rounded-card bg-surface p-3 xl:mx-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-heading font-bold text-on-primary">
            {baby.name[0]}
          </span>
          <div className="hidden min-w-0 xl:block">
            <div className="truncate text-row-title font-bold">{baby.name}</div>
            <div className="text-meta text-ink-2">{age}</div>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3 xl:px-4" aria-label="Main">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === '/' }}
              className="group flex h-tap items-center justify-center gap-3 rounded-button px-3 text-body font-medium text-ink-2 hover:bg-surface xl:justify-start"
              activeProps={{ className: 'bg-primary-soft font-bold text-on-primary-soft hover:bg-primary-soft' }}
            >
              <item.icon className="size-5 shrink-0" strokeWidth={2.75} />
              <span className="hidden xl:inline">{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="flex flex-col items-center gap-2 border-t border-line p-4 xl:flex-row xl:items-center">
          <div className="flex -space-x-2">
            {family.members.map((member) => (
              <Avatar key={member.user_id} name={member.display_name} className="ring-2 ring-raised" />
            ))}
          </div>
          <span className="hidden truncate text-meta text-ink-2 xl:inline">{family.name}</span>
        </div>
      </aside>

      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-line bg-bg/95 px-4 py-3 backdrop-blur md:hidden">
        <span className="grid size-10 place-items-center rounded-full bg-primary text-heading font-bold text-on-primary">
          {baby.name[0]}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-row-title font-bold">{baby.name}</div>
          <div className="text-meta text-ink-2">{age}</div>
        </div>
        <div className="flex -space-x-2">
          {family.members.map((member) => (
            <Avatar key={member.user_id} name={member.display_name} className="ring-2 ring-bg" />
          ))}
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 pb-[calc(var(--spacing-tab-bar)+24px)] pt-6 md:px-8 md:pb-12 md:pt-10">
        {children}
      </main>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-10 grid h-tab-bar grid-cols-4 border-t border-line bg-raised px-2 pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {NAV.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            activeOptions={{ exact: item.to === '/' }}
            className="group flex flex-col items-center justify-center gap-1 text-caption font-medium text-ink-3"
            activeProps={{ className: 'font-bold text-on-primary-soft' }}
          >
            {({ isActive }) => (
              <>
                <span className={cn('grid h-8 w-14 place-items-center rounded-chip', isActive && 'bg-primary-soft')}>
                  <item.icon className="size-5" strokeWidth={2.75} />
                </span>
                {item.label}
              </>
            )}
          </Link>
        ))}
      </nav>
    </div>
  );
}
