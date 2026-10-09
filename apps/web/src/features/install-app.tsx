import { Check, ChevronDown, Compass, Download, Share, SquarePlus, X } from 'lucide-react';
import { useState, type ComponentType } from 'react';
import { Button } from '#/components/ui/button';
import { Card, SectionLabel } from '#/components/ui/card';
import { showInstallCard, type InstallMode } from '#/lib/install';
import { useInstall, type Install } from '#/lib/install-prompt';
import { readStorage, storageKeys, writeStorage } from '#/lib/storage';

const WHY = 'Add babble to your home screen so it opens full screen and can send feed reminders.';

function AppIcon({ className = 'size-12' }: { className?: string }) {
  return <img src="/icons/icon-192.png" alt="" className={`${className} shrink-0 rounded-tile`} />;
}

const IOS_STEPS: { pre: string; bold: string; Icon: ComponentType<{ className?: string; strokeWidth?: number }> }[] = [
  { pre: 'Tap', bold: 'Share', Icon: Share },
  { pre: 'Choose', bold: 'Add to Home Screen', Icon: SquarePlus },
  { pre: 'Tap', bold: 'Add', Icon: Check },
];

export function InstallInstructions({ mode, onInstall }: { mode: InstallMode; onInstall: () => void }) {
  if (mode === 'ios-safari') {
    return (
      <ol className="flex flex-col gap-3">
        {IOS_STEPS.map(({ pre, bold, Icon }, index) => (
          <li key={bold} className="flex items-center gap-3 text-body">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary-soft text-caption font-bold text-on-primary-soft">
              {index + 1}
            </span>
            <span className="flex-1">
              {pre} <b>{bold}</b>
            </span>
            <Icon aria-hidden className="size-5 text-primary" strokeWidth={2.5} />
          </li>
        ))}
      </ol>
    );
  }
  if (mode === 'ios-other') {
    return (
      <p className="flex items-start gap-3 text-body">
        <Compass aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" strokeWidth={2.5} />
        <span>
          Open babble in <b>Safari</b> to install it, then tap <b>Share</b> and <b>Add to Home Screen</b>.
        </span>
      </p>
    );
  }
  if (mode === 'prompt') {
    return (
      <Button className="self-start" onClick={onInstall}>
        <Download className="size-5" strokeWidth={2.75} />
        Install
      </Button>
    );
  }
  if (mode === 'none') {
    return (
      <p className="text-body text-ink-2">Use your browser's menu to install babble or add it to your home screen.</p>
    );
  }
  return null;
}

export function InstallCard({ install, now = () => new Date() }: { install: Install; now?: () => Date }) {
  const [dismissedAt, setDismissedAt] = useState(() => readStorage(storageKeys.installDismissedAt));
  if (!showInstallCard(install.mode, dismissedAt, now())) return null;

  function dismiss() {
    const at = now().toISOString();
    writeStorage(storageKeys.installDismissedAt, at);
    setDismissedAt(at);
  }

  async function installNow() {
    if ((await install.prompt()) === 'dismissed') dismiss();
  }

  const prompting = install.mode === 'prompt';
  return (
    <Card role="region" aria-label="Install babble" className="flex flex-col gap-4 p-5">
      <div className="flex items-center gap-3">
        <AppIcon />
        <div className="flex-1">
          <div className="text-row-title font-bold">Install babble</div>
          <p className="text-meta text-ink-2">{WHY}</p>
        </div>
        {!prompting && (
          <Button variant="ghost" size="icon" aria-label="Not now" className="self-start" onClick={dismiss}>
            <X className="size-5" strokeWidth={2.75} />
          </Button>
        )}
      </div>
      {prompting ? (
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={dismiss}>
            Not now
          </Button>
          <Button className="flex-1" onClick={() => void installNow()}>
            <Download className="size-5" strokeWidth={2.75} />
            Install
          </Button>
        </div>
      ) : (
        <InstallInstructions mode={install.mode} onInstall={() => void installNow()} />
      )}
    </Card>
  );
}

export function InstallSettings({ install }: { install: Install }) {
  const [open, setOpen] = useState(false);
  const installed = install.mode === 'installed';

  return (
    <section className="flex flex-col gap-3">
      <SectionLabel>App</SectionLabel>
      <Card className="flex flex-col">
        <button
          type="button"
          disabled={installed}
          aria-expanded={installed ? undefined : open}
          onClick={() => setOpen((value) => !value)}
          className="flex min-h-tap items-center gap-4 rounded-card px-5 py-4 text-left enabled:hover:bg-surface"
        >
          <AppIcon className="size-10" />
          <span className="flex-1">
            <span className="block text-row-title font-semibold">Install app</span>
            <span className="block text-meta text-ink-2">
              {installed ? 'babble opens full screen from your home screen' : 'Add babble to your home screen'}
            </span>
          </span>
          {installed ? (
            <span className="flex items-center gap-1 text-meta font-semibold text-primary">
              <Check aria-hidden className="size-4" strokeWidth={2.75} />
              Installed
            </span>
          ) : (
            <ChevronDown
              aria-hidden
              className={`size-5 text-ink-3 transition-transform ${open ? 'rotate-180' : ''}`}
              strokeWidth={2.75}
            />
          )}
        </button>
        {open && !installed && (
          <div className="flex flex-col gap-4 border-t border-line px-5 py-4">
            <p className="text-meta text-ink-2">{WHY}</p>
            <InstallInstructions mode={install.mode} onInstall={() => void install.prompt()} />
          </div>
        )}
      </Card>
    </section>
  );
}

export function InstallSection() {
  return <InstallSettings install={useInstall()} />;
}
