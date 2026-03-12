import { createRouter, createRoute, createRootRoute, redirect } from '@tanstack/react-router';
import type { DashboardSearch } from './hooks/use-filters';
import { RootLayout } from './routes/__root';
import { DashboardLayout } from './routes/dashboard';
import { DashboardIndexPage } from './routes/dashboard/index-page';
import { SpendPage } from './routes/dashboard/spend';

const dashboardSearchValidation = {
  validateSearch: (search: Record<string, unknown>): DashboardSearch => ({
    range: (search.range as DashboardSearch['range']) ?? '30d',
    from: search.from as string | undefined,
    to: search.to as string | undefined,
    teams: search.teams as string | undefined,
    models: search.models as string | undefined,
  }),
};

const rootRoute = createRootRoute({
  component: RootLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/dashboard' });
  },
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard',
  component: DashboardLayout,
  ...dashboardSearchValidation,
});

const dashboardIndexRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: '/',
  component: DashboardIndexPage,
});

const spendRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: '/spend',
  component: SpendPage,
});

// Placeholder routes for stretch pages
const adoptionRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: '/adoption',
  component: () => null,
});

const qualityRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: '/quality',
  component: () => null,
});

const governanceRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: '/governance',
  component: () => null,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  dashboardRoute.addChildren([
    dashboardIndexRoute,
    spendRoute,
    adoptionRoute,
    qualityRoute,
    governanceRoute,
  ]),
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
