import { RefreshCw, X } from 'lucide-react';
import { useState } from 'react';

export function UpdateBanner({ onRefresh }: { onRefresh: () => void }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+8px)] z-50 flex justify-center px-4">
      <div
        role="status"
        className="pointer-events-auto flex min-h-tap w-full max-w-md items-center gap-2 rounded-card bg-ink py-1 pr-1 pl-4 text-body text-bg shadow-toast"
      >
        <RefreshCw aria-hidden className="size-5 shrink-0 text-primary-soft" strokeWidth={2.5} />
        <span className="flex-1">A new version of babble is ready.</span>
        <button
          type="button"
          onClick={onRefresh}
          className="h-10 rounded-button px-3 font-bold text-primary-soft hover:bg-white/10"
        >
          Refresh
        </button>
        <button
          type="button"
          aria-label="Not now"
          onClick={() => setDismissed(true)}
          className="grid size-10 place-items-center rounded-button text-bg/70 hover:bg-white/10"
        >
          <X className="size-5" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
