import tailwindcss from '@tailwindcss/vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import { nitro } from 'nitro/vite';
import { resolve } from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import { cacheVersionFor } from './src/lib/cache-version';
import { SECURITY_HEADERS } from './src/lib/security-headers';

export default defineConfig(({ mode }) => {
  // Server functions read process.env; in dev, fill it from .env without overriding real environment variables.
  if (mode === 'development') {
    process.env = { ...loadEnv(mode, process.cwd(), ''), ...process.env };
  }
  // Shared through process.env so every environment built in this run gets the same release id.
  process.env.BABBLE_RELEASE ??= new Date().toISOString();
  return {
    define: {
      __BABBLE_RELEASE__: JSON.stringify(process.env.BABBLE_RELEASE),
      __BABBLE_CACHE_VERSION__: JSON.stringify(cacheVersionFor(resolve(import.meta.dirname, '../..'))),
    },
    resolve: { tsconfigPaths: true, dedupe: ['react', 'react-dom', '@tanstack/react-query'] },
    // CommonJS dependencies only reached from lazily loaded routes; pre-bundling avoids 504 "Outdated Optimize Dep" reloads in dev.
    optimizeDeps: { include: ['qrcode'] },
    plugins: [
      nitro({ routeRules: { '/**': { headers: SECURITY_HEADERS } } }),
      tailwindcss(),
      tanstackStart(),
      viteReact(),
    ],
  };
});
