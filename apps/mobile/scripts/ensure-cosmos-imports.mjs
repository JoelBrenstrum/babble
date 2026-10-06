import { existsSync, writeFileSync } from 'node:fs';

const target = new URL('../src/cosmos.imports.ts', import.meta.url);

if (!existsSync(target)) {
  writeFileSync(
    target,
    `// Placeholder until \`pnpm cosmos\` generates the real file.
import type { RendererConfig, UserModuleWrappers } from 'react-cosmos-core';

export const rendererConfig: RendererConfig = { webSocketUrl: null, rendererUrl: null };

export const moduleWrappers: UserModuleWrappers = { lazy: false, fixtures: {}, decorators: {} };
`,
  );
}
