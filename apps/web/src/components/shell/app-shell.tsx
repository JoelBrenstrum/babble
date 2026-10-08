import type { BabyChoice, BabyRow, Family } from '@babble/api';
import type { RunningIndicator } from '@babble/domain';
import { Link, useLocation } from '@tanstack/react-router';
import { ChartColumn, History, House, Settings, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Avatar } from '#/components/ui/avatar';
import { Wordmark } from '#/components/ui/wordmark';
import { BabySwitcher } from './baby-switcher';
import { RunningDot } from './running-dot';
import { cn } from '#/lib/cn';

interface NavItem {
  to: '/' | '/timeline' | '/stats' | '/settings';
  label: string;
  icon: LucideIcon;
}

const NAV: readonly NavItem[] = [
  { to: '/', label: 'Home', icon: House },
  { to: '/timeline', label: 'Timeline', icon: History },
  { to: '/stats', label: 'Stats', icon: ChartColumn },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function AppShell({
  family,
  baby,
  choices,
  onSelectBaby,
  running = null,
  children,
}: {
  family: Family;
  baby: BabyRow;
  choices: readonly BabyChoice[];
  onSelectBaby: (choice: BabyChoice) => void;
  running?: RunningIndicator | null;
  children: ReactNode;
}) {
  const pathname = useLocation({ select: (location) => location.pathname });
  const homeDot = pathname === '/' ? null : running;
  return (
    <div className="min-h-dvh bg-bg md:pl-[84px] xl:pl-[268px]">
      <aside className="fixed inset-y-0 left-0 hidden w-[84px] flex-col border-r border-line bg-raised md:flex xl:w-[268px]">
        <div className="flex h-20 items-center justify-center px-6 xl:justify-start">
          <Wordmark className="hidden text-[28px] xl:inline" />
          <span className="font-brand text-[28px] text-primary xl:hidden">b</span>
        </div>
        <div className="mx-3 mb-4 hidden xl:mx-4 xl:block">
          <BabySwitcher choices={choices} activeId={baby.id} onSelect={onSelectBaby} layout="sidebar" />
        </div>
        <div className="mx-3 mb-4 xl:hidden">
          <BabySwitcher choices={choices} activeId={baby.id} onSelect={onSelectBaby} layout="rail" />
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3 xl:px-4" aria-label="Main">
          {NAV.map((item) => {
            const dot = item.to === '/' ? homeDot : null;
            return (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.to === '/' }}
                aria-label={dot ? `${item.label}, ${dot.label.toLowerCase()}` : undefined}
                className="group flex h-tap items-center justify-center gap-3 rounded-button px-3 text-body font-medium text-ink-2 hover:bg-surface xl:justify-start"
                activeProps={{ className: 'bg-primary-soft font-bold text-on-primary-soft hover:bg-primary-soft' }}
              >
                <span className="relative">
                  <item.icon className="size-5 shrink-0" strokeWidth={2.75} />
                  {dot && <RunningDot indicator={dot} className="absolute -right-1.5 -top-1 xl:hidden" />}
                </span>
                <span className="hidden xl:inline">{item.label}</span>
                {dot && <RunningDot indicator={dot} className="ml-auto hidden xl:grid" />}
              </Link>
            );
          })}
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
        <BabySwitcher choices={choices} activeId={baby.id} onSelect={onSelectBaby} layout="header" />
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
        {NAV.map((item) => {
          const dot = item.to === '/' ? homeDot : null;
          return (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === '/' }}
              aria-label={dot ? `${item.label}, ${dot.label.toLowerCase()}` : undefined}
              className="group flex flex-col items-center justify-center gap-1 text-caption font-medium text-ink-3"
              activeProps={{ className: 'font-bold text-on-primary-soft' }}
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      'relative grid h-8 w-14 place-items-center rounded-chip',
                      isActive && 'bg-primary-soft',
                    )}
                  >
                    <item.icon className="size-5" strokeWidth={2.75} />
                    {dot && <RunningDot indicator={dot} className="absolute right-3 top-0.5" />}
                  </span>
                  {item.label}
                </>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
