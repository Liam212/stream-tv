import { DirectStreamForm } from '@/components/direct-stream-form'
import { ExperimentalFeaturesForm } from '@/components/experimental-features-form'
import RouteLayout from '@/components/ui/layout'
import { XtreamSettingsForm } from '@/components/xtream-settings-form'

export function SettingsPage() {
  return (
    <RouteLayout direction="row" className="items-start gap-4 flex-wrap">
      <XtreamSettingsForm />
      <DirectStreamForm />
      <ExperimentalFeaturesForm />
    </RouteLayout>
  )
}
