import { FormEvent } from 'react'
import { useAppStore } from '@/store/app-store'

export function PlayerPage() {
  const streamUrl = useAppStore((state) => state.streamUrl)
  const setStreamUrl = useAppStore((state) => state.setStreamUrl)
  const loadManualUrl = useAppStore((state) => state.loadManualUrl)
  const loadSample = useAppStore((state) => state.loadSample)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    loadManualUrl()
  }

  return (
    <section className="route-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Player</p>
          <h2>Direct Playback</h2>
        </div>
      </div>

      <form className="stream-form" onSubmit={handleSubmit}>
        <label className="field">
          <span className="field-label">Stream URL</span>
          <input
            data-testid="stream-url-input"
            type="url"
            value={streamUrl}
            onChange={event => setStreamUrl(event.target.value)}
            placeholder="https://example.com/live/stream.m3u8"
          />
        </label>

        <div className="actions">
          <button type="submit">Load stream</button>
          <button type="button" className="secondary" onClick={loadSample}>
            Load sample
          </button>
        </div>
      </form>

      <div className="info-grid">
        <article className="info-card">
          <strong>HLS</strong>
          <p>`.m3u8` manifests use `hls.js` when Media Source Extensions are available.</p>
        </article>
        <article className="info-card">
          <strong>MPEG-TS</strong>
          <p>Direct `.ts` streams use `mpegts-video-element`.</p>
        </article>
        <article className="info-card">
          <strong>Fallback</strong>
          <p>Other direct media URLs fall back to the native HTML media element.</p>
        </article>
      </div>
    </section>
  )
}
