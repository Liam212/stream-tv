import RouteLayout from '@/components/ui/layout'
import { XtreamSettingsForm } from '@/components/xtream-settings-form'

export function SettingsPage() {
  return (
    <RouteLayout direction="row">
      <XtreamSettingsForm />
    </RouteLayout>
  )
}
