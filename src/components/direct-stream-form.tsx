import { FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/store/app-store'

export function DirectStreamForm() {
  const streamUrl = useAppStore(state => state.streamUrl)
  const setStreamUrl = useAppStore(state => state.setStreamUrl)
  const loadManualUrl = useAppStore(state => state.loadManualUrl)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    loadManualUrl()
  }

  return (
    <section className="w-full max-w-[420px] flex-1 rounded-md bg-gray-900 p-4 text-gray-100">
      <h3>Direct Stream</h3>
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
          <Button type="submit" size="lg">
            Load stream
          </Button>
        </div>
      </form>

      <div className="notes">
        <p>Use this for one-off direct streams outside of Xtream.</p>
        <p>`m3u8`, direct media URLs, and MPEG-TS streams are supported.</p>
      </div>
    </section>
  )
}
