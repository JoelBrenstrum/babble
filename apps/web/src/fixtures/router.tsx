import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router';
import { createContext, useContext, useState, type ReactNode } from 'react';

const PATHS = ['/', '/timeline', '/stats', '/settings'] as const;
const FixtureContent = createContext<ReactNode>(null);

function RenderContent() {
  return <>{useContext(FixtureContent)}</>;
}

export function FixtureRouter({ children, initialPath = '/' }: { children: ReactNode; initialPath?: string }) {
  const [router] = useState(() => {
    const rootRoute = createRootRoute({ component: Outlet });
    const routes = PATHS.map((path) =>
      createRoute({ getParentRoute: () => rootRoute, path, component: RenderContent }),
    );
    return createRouter({
      routeTree: rootRoute.addChildren(routes),
      history: createMemoryHistory({ initialEntries: [initialPath] }),
    });
  });
  return (
    <FixtureContent.Provider value={children}>
      <RouterProvider router={router} />
    </FixtureContent.Provider>
  );
}
