import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { accountChanged, syncClock, toBabbleError } from '@babble/api';
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  useLocation,
  useRouter,
  type ErrorComponentProps,
} from '@tanstack/react-router';
import { useEffect, type ReactNode } from 'react';
import { CenteredPage } from '#/components/shell/centered-page';
import { UpdateBanner } from '#/components/shell/update-banner';
import { Button } from '#/components/ui/button';
import { PageSpinner } from '#/components/ui/spinner';
import { StatusMessage } from '#/components/ui/status';
import { ToastProvider } from '#/components/ui/toast';
import { loadBabble } from '#/lib/babble';
import { configProblem } from '#/lib/config-problem';
import { themeBootScript, themeColorMeta } from '#/lib/theme';
import { reloadForRelease, useNewRelease } from '#/lib/release';
import { clearAccountStorage } from '#/lib/storage';
import appCss from '../styles.css?url';

export interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
      { title: 'babble' },
      { name: 'description', content: 'A calm, detailed baby tracker for sleep, feeds, nappies and more.' },
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-title', content: 'babble' },
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
  pendingComponent: () => <PageSpinner />,
  errorComponent: RootError,
});

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
        {themeColorMeta.map((tag) => (
          <meta key={tag.media} {...tag} />
        ))}
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
    const sync = () => void syncClock(babble.client);
    const onVisible = () => document.visibilityState === 'visible' && sync();
    sync();
    const id = setInterval(sync, 10 * 60_000);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [babble]);

  useEffect(() => {
    let userId: string | null | undefined;
    const { data } = babble.client.auth.onAuthStateChange((event, session) => {
      const nextUserId = session?.user.id ?? null;
      if (accountChanged(userId, nextUserId)) {
        clearAccountStorage();
        queryClient.clear();
      }
      userId = nextUserId;
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        void queryClient.invalidateQueries();
        void router.invalidate();
      }
    });
    return () => data.subscription.unsubscribe();
  }, [babble, queryClient, router]);

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <Outlet />
        <ReleaseBanner />
      </ToastProvider>
    </QueryClientProvider>
  );
}

function ReleaseBanner() {
  const pathname = useLocation({ select: (location) => location.pathname });
  const newRelease = useNewRelease();
  if (!newRelease || pathname === '/chair') return null;
  return <UpdateBanner onRefresh={reloadForRelease} />;
}

function RootError({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  const problem = configProblem(error);
  if (problem) {
    return (
      <CenteredPage>
        <h1 className="mb-4 text-title font-bold">babble isn't configured yet</h1>
        <StatusMessage tone="info">{problem}.</StatusMessage>
        <p className="mt-4 text-body text-ink-2">
          Whoever runs this server needs to set the missing setting (see <code>.env.example</code>), then restart the
          app.
        </p>
      </CenteredPage>
    );
  }
  const message = toBabbleError(error).message;
  return (
    <CenteredPage>
      <h1 className="mb-4 text-title font-bold">Something's not right</h1>
      <StatusMessage tone="danger">{message}</StatusMessage>
      <Button
        className="mt-6 self-start"
        onClick={() => {
          reset();
          void router.invalidate();
        }}
      >
        Try again
      </Button>
    </CenteredPage>
  );
}
