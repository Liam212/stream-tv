import { FormEvent } from 'react'
import { useAppStore } from '@/store/app-store'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card'
import RouteLayout from '@/components/ui/layout'

export function PlayerPage() {
  const streamUrl = useAppStore(state => state.streamUrl)
  const setStreamUrl = useAppStore(state => state.setStreamUrl)
  const loadManualUrl = useAppStore(state => state.loadManualUrl)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    loadManualUrl()
  }

  return (
    <RouteLayout direction="column">
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
        </div>
      </form>

      <div className="flex items-center gap-2 mt-4">
        <Card className="mt-6 bg-gray-700 text-gray-100">
          <CardHeader>
            <CardTitle>HLS</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              `.m3u8` manifests use `hls.js` when Media Source Extensions are
              available.
            </CardDescription>
          </CardContent>
        </Card>

        <Card className="mt-6 bg-gray-700 text-gray-100">
          <CardHeader>
            <CardTitle>MPEG-TS</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              `.m3u8` manifests use `hls.js` when Media Source Extensions are
              available.
            </CardDescription>
          </CardContent>
        </Card>

        <Card className="mt-6 bg-gray-700 text-gray-100">
          <CardHeader>
            <CardTitle>Fallback.</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Other direct media URLs fall back to the native HTML media
              element.
            </CardDescription>
          </CardContent>
        </Card>
      </div>
    </RouteLayout>
  )
}
