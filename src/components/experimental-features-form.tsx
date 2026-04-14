import { useAppStore } from '@/store/app-store'

export function ExperimentalFeaturesForm() {
  const experimentalFeaturesEnabled = useAppStore(
    state => state.experimentalFeaturesEnabled,
  )
  const setExperimentalFeaturesEnabled = useAppStore(
    state => state.setExperimentalFeaturesEnabled,
  )

  return (
    <section className="w-full max-w-[420px] flex-1 rounded-md bg-gray-900 p-4 text-gray-100">
      <h3>Experimental Features</h3>
      <div className="mt-4 rounded-md border border-white/10 bg-slate-950/70 p-4">
        <label className="flex cursor-pointer items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="font-medium text-slate-50">Enable experimental features</p>
            <p className="mt-1 text-sm text-slate-400">
              Shows in-progress screens like Multi View in the sidebar.
            </p>
          </div>

          <span className="relative inline-flex shrink-0 items-center">
            <input
              type="checkbox"
              className="peer sr-only"
              checked={experimentalFeaturesEnabled}
              onChange={event =>
                setExperimentalFeaturesEnabled(event.target.checked)
              }
            />
            <span className="h-7 w-12 rounded-full bg-slate-700 transition-colors peer-checked:bg-amber-400" />
            <span className="pointer-events-none absolute left-1 h-5 w-5 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
          </span>
        </label>
      </div>
    </section>
  )
}
