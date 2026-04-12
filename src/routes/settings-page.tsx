import { XtreamSettingsForm } from '@/components/xtream-settings-form'
import { useAppStore } from '@/store/app-store'

export function SettingsPage() {
  const connectedProfile = useAppStore(state => state.connectedProfile)
  const connectionStatus = useAppStore(state => state.connectionStatus)

  return (
    <section className="route-panel">
      <div className="settings-grid">
        <XtreamSettingsForm />

        <section className="control-panel">
          <div className="info-grid stacked">
            <article className="info-card">
              <strong>Current provider</strong>
              <p>
                {connectedProfile
                  ? connectedProfile.baseUrl
                  : 'No Xtream provider connected'}
              </p>
            </article>
            <article className="info-card">
              <strong>Connection state</strong>
              <p>{connectionStatus}</p>
            </article>
          </div>
        </section>
      </div>
    </section>
  )
}
