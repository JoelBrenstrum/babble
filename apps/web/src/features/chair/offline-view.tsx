export function OfflineView() {
  return (
    <div role="status" className="flex flex-1 flex-col items-center justify-center gap-[3cqmin] text-center">
      <span
        data-spin
        className="box-border size-[13cqmin] animate-spin rounded-full border-[1.6cqmin] border-line border-t-primary"
      />
      <span className="text-[length:8cqmin] leading-tight font-bold">Can't reach babble.</span>
      <span className="text-[length:5.4cqmin] text-ink-2">Retrying…</span>
    </div>
  );
}
