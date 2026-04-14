import { Link } from '@tanstack/react-router'
import { useAppStore } from '@/store/app-store'
import RouteLayout from '@/components/ui/layout'

export function PlayerPage() {
  const activeUrl = useAppStore(state => state.activeUrl)
  const activeTitle = useAppStore(state => state.activeTitle)

  if (activeUrl) {
    return <RouteLayout direction="column" className="min-h-0 flex-1 p-0" />
  }

  return (
    <RouteLayout direction="column" className="items-center justify-center">
      <section className="route-panel max-w-xl text-center">
        <p className="eyebrow">Direct Play</p>
        <h2 className="text-2xl font-semibold text-slate-50">
          No active stream
        </h2>
        <p className="mt-3 text-sm text-slate-400">
          Start playback from the TV Guide, Multi View, Xtream library, or load
          a direct stream from{' '}
          <Link to="/settings" className="inline-link">
            Settings
          </Link>
          .
        </p>
        {activeTitle && (
          <p className="mt-4 text-xs text-slate-500">
            Last title: {activeTitle}
          </p>
        )}
      </section>
    </RouteLayout>
  )
}
