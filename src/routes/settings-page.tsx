import { useAppStore } from '@/store/app-store'

export function SettingsPage() {
  const connectedProfile = useAppStore(state => state.connectedProfile)
  const connectionStatus = useAppStore(state => state.connectionStatus)
  const showVideoDebug = useAppStore(state => state.showVideoDebug)
  const toggleVideoDebug = useAppStore(state => state.toggleVideoDebug)

  return (
    <section className="route-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Settings</p>
          <h2>Runtime Notes</h2>
        </div>
      </div>

      <div className="info-grid">
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
        <article className="info-card">
          <strong>Video Debug</strong>
          <p>{showVideoDebug ? 'Enabled' : 'Disabled'}</p>
          <button onClick={toggleVideoDebug}>Toggle</button>
        </article>
      </div>
    </section>
  )
}
