import {
  Link,
  Outlet,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  useRouterState,
} from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { Grid2x2, Play, SettingsIcon, Tv } from 'lucide-react'
import { PlayerSurface } from './components/player-surface'
import { MultiViewPage } from '@/routes/multi-view-page'
import { PlayerPage } from '@/routes/player-page'
import { SettingsPage } from '@/routes/settings-page'
import { TvGuidePage } from '@/routes/tv-guide-page'
import { XtreamPage } from '@/routes/xtream-page'
import { NavBar } from './components/nav-bar'

type RouterContext = {
  queryClient: QueryClient
}

function AppLayout() {
  const pathname = useRouterState({
    select: state => state.location.pathname,
  })
  const hideShellPlayer = pathname === '/settings' || pathname === '/multiview'

  return (
    <main className="flex h-dvh w-dvw overflow-hidden">
      <NavBar />
      <section className="flex-1 min-h-0 w-full overflow-auto bg-gray-800">
        <PlayerSurface hidden={hideShellPlayer} muted={hideShellPlayer} />
        <Outlet />
      </section>
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

const guideRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/guide',
  component: TvGuidePage,
})

const multiViewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/multiview',
  component: MultiViewPage,
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
  guideRoute,
  multiViewRoute,
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
