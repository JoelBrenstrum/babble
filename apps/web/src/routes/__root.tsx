import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { HeadContent, Outlet, Scripts, createRootRouteWithContext, useRouter } from '@tanstack/react-router';
import { useEffect, type ReactNode } from 'react';
import { loadBabble } from '#/lib/babble';
import { themeBootScript } from '#/lib/theme';
import appCss from '../styles.css?url';

export interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
      { title: 'Babble' },
      { name: 'description', content: 'A calm, detailed baby tracker for sleep, feeds, nappies and more.' },
      { name: 'theme-color', content: '#f3f0e8' },
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-title', content: 'Babble' },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'manifest', href: '/manifest.webmanifest' },
      { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
      { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
    ],
    scripts: [{ children: themeBootScript }],
  }),
  beforeLoad: async () => ({ babble: await loadBabble() }),
  shellComponent: RootDocument,
  component: RootComponent,
  pendingComponent: () => null,
});

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient, babble } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    const { data } = babble.client.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        void queryClient.invalidateQueries();
        void router.invalidate();
      }
    });
    return () => data.subscription.unsubscribe();
  }, [babble, queryClient, router]);

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  );
}
