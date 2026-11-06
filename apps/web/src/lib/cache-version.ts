import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Bump when cached data changes shape in a way the files below don't capture.
const REVISION = 1;

const SHAPE_FILES = [
  'packages/api/src/database.types.ts',
  'packages/api/src/types.ts',
  'packages/domain/src/events/types.ts',
];

export function cacheVersion(sources: readonly string[], revision = REVISION): string {
  const hash = createHash('sha256').update(String(revision));
  for (const source of sources) hash.update('\0').update(source);
  return hash.digest('hex').slice(0, 12);
}

export function cacheVersionFor(repoRoot: string): string {
  return cacheVersion(SHAPE_FILES.map((file) => readFileSync(resolve(repoRoot, file), 'utf8')));
}
