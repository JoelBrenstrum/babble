import { QueryClient } from '@tanstack/react-query';
import { createRouter } from '@tanstack/react-router';
import { createIsomorphicFn } from '@tanstack/react-start';
import { setResponseHeader } from '@tanstack/react-start/server';
import { PageSpinner } from './components/ui/spinner';
import { contentSecurityPolicy } from './lib/security-headers';
import { routeTree } from './routeTree.gen';

const requestNonce = createIsomorphicFn()
  .server(() => {
    if (import.meta.env.DEV || !process.env.SUPABASE_URL) return undefined;
    const nonce = crypto.randomUUID().replace(/-/g, '');
    setResponseHeader(
      'Content-Security-Policy',
      contentSecurityPolicy({ nonce, supabaseUrl: process.env.SUPABASE_URL }),
    );
    return nonce;
  })
  .client(() => undefined);

export function getRouter() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
  });
  return createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    defaultPendingComponent: () => <PageSpinner />,
    defaultPendingMs: 150,
    defaultPendingMinMs: 300,
    ssr: { nonce: requestNonce() },
  });
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
