import {
  Link,
  Outlet,
  createRootRouteWithContext,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { PlayerSurface } from '@/components/player-surface'
import { PlayerPage } from '@/routes/player-page'
import { SettingsPage } from '@/routes/settings-page'
import { XtreamPage } from '@/routes/xtream-page'

type RouterContext = {
  queryClient: QueryClient
}

function AppLayout() {
  return (
    <main className="shell">
      <PlayerSurface />

      <nav className="main-nav">
        <Link
          to="/"
          className="nav-link"
          activeProps={{ className: 'nav-link active' }}>
          Player
        </Link>
        <Link
          to="/xtream/live"
          className="nav-link"
          activeProps={{ className: 'nav-link active' }}
          activeOptions={{ exact: false }}>
          Xtream
        </Link>
        <Link
          to="/settings"
          className="nav-link"
          activeProps={{ className: 'nav-link active' }}>
          Settings
        </Link>
      </nav>

      <Outlet />
    </main>
  )
}

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: AppLayout,
})

const playerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: PlayerPage,
})

const xtreamLiveRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/xtream/live',
  component: () => <XtreamPage contentType="live" />,
})

const xtreamVodRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/xtream/vod',
  component: () => <XtreamPage contentType="vod" />,
})

const xtreamSeriesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/xtream/series',
  component: () => <XtreamPage contentType="series" />,
})

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: SettingsPage,
})

const routeTree = rootRoute.addChildren([
  playerRoute,
  xtreamLiveRoute,
  xtreamVodRoute,
  xtreamSeriesRoute,
  settingsRoute,
])

export const router = createRouter({
  routeTree,
  context: {
    queryClient: undefined!,
  },
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
