import tailwindcss from '@tailwindcss/vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import { nitro } from 'nitro/vite';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // Server functions read process.env; in dev, fill it from .env without overriding real environment variables.
  if (mode === 'development') {
    process.env = { ...loadEnv(mode, process.cwd(), ''), ...process.env };
  }
  return {
    resolve: { tsconfigPaths: true },
    // CommonJS dependencies only reached from lazily loaded routes; pre-bundling avoids 504 "Outdated Optimize Dep" reloads in dev.
    optimizeDeps: { include: ['qrcode'] },
    plugins: [nitro(), tailwindcss(), tanstackStart(), viteReact()],
  };
});
