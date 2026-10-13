export async function paginate<T, C>(
  fetchPage: (cursor: C | null) => Promise<T[]>,
  cursorOf: (last: T) => C,
  pageSize: number,
): Promise<T[]> {
  const all: T[] = [];
  let cursor: C | null = null;
  for (;;) {
    const page: T[] = await fetchPage(cursor);
    all.push(...page);
    const last = page[page.length - 1];
    if (page.length < pageSize || !last) return all;
    cursor = cursorOf(last);
  }
}
