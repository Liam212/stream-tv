import {
  Link,
  Outlet,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  useRouterState,
} from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { PlayerPage } from '@/routes/player-page'
import { SettingsPage } from '@/routes/settings-page'
import { TvGuidePage } from '@/routes/tv-guide-page'
import { XtreamPage } from '@/routes/xtream-page'
import { useAppStore } from '@/store/app-store'
import { PlayerSurface } from './components/player-surface'

type RouterContext = {
  queryClient: QueryClient
}

function AppLayout() {
  const sidebarCollapsed = useAppStore(state => state.sidebarCollapsed)
  const toggleSidebar = useAppStore(state => state.toggleSidebar)
  const pathname = useRouterState({
    select: state => state.location.pathname,
  })
  const isSettingsRoute = pathname === '/settings'

  return (
    <main className={`shell${sidebarCollapsed ? ' shell-collapsed' : ''}`}>
      <aside className={`sidebar${sidebarCollapsed ? ' is-collapsed' : ''}`}>
        <button
          type="button"
          className="sidebar-toggle"
          onClick={toggleSidebar}
          aria-expanded={!sidebarCollapsed}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          {sidebarCollapsed ? '>' : '<'}
        </button>

        <nav className="side-nav">
          <Link
            to="/"
            className="nav-link"
            activeProps={{ className: 'nav-link active' }}
            aria-label="Direct Play"
            title="Direct Play">
            {sidebarCollapsed ? 'DP' : 'Direct Play'}
          </Link>
          <Link
            to="/guide"
            className="nav-link"
            activeProps={{ className: 'nav-link active' }}
            aria-label="TV Guide"
            title="TV Guide">
            {sidebarCollapsed ? 'TV' : 'TV Guide'}
          </Link>
          <Link
            to="/settings"
            className="nav-link"
            activeProps={{ className: 'nav-link active' }}
            aria-label="Settings"
            title="Settings">
            {sidebarCollapsed ? 'ST' : 'Settings'}
          </Link>
        </nav>
      </aside>

      <section className="content-shell">
        <PlayerSurface hidden={isSettingsRoute} muted={isSettingsRoute} />
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
