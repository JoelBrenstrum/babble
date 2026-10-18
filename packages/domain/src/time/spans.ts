export interface Span {
  start: number;
  end: number;
}

export function joinSpans(spans: readonly Span[], joins: (gapMs: number) => boolean): Span[] {
  const joined: Span[] = [];
  for (const span of [...spans].sort((a, b) => a.start - b.start)) {
    const last = joined.at(-1);
    if (last && joins(span.start - last.end)) last.end = Math.max(last.end, span.end);
    else joined.push({ ...span });
  }
  return joined;
}
