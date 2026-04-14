import { FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useAppStore } from '@/store/app-store'
import { authenticateXtream } from '@/xtream'

export function XtreamSettingsForm() {
  const xtreamProfile = useAppStore(state => state.xtreamProfile)
  const connectionStatus = useAppStore(state => state.connectionStatus)
  const setXtreamProfile = useAppStore(state => state.setXtreamProfile)
  const setConnectionStatus = useAppStore(state => state.setConnectionStatus)
  const connectXtreamProfile = useAppStore(state => state.connectXtreamProfile)
  const disconnectXtream = useAppStore(state => state.disconnectXtream)

  const connectMutation = useMutation({
    mutationFn: async () => {
      const auth = await authenticateXtream(xtreamProfile)
      if (auth.user_info?.auth !== 1) {
        throw new Error('Provider rejected the supplied credentials')
      }
      return auth
    },
    onMutate: () => {
      setConnectionStatus('Connecting to Xtream provider')
    },
    onSuccess: auth => {
      connectXtreamProfile(
        xtreamProfile,
        auth.user_info?.status
          ? `Connected (${auth.user_info.status})`
          : 'Connected',
      )
    },
    onError: error => {
      setConnectionStatus(
        error instanceof Error ? error.message : 'Unable to connect',
      )
    },
  })

  const handleConnect = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    connectMutation.mutate()
  }

  return (
    <section className="bg-gray-900 p-4 rounded-md text-gray-100">
      <h3>Xtream Connection</h3>
      <form className="stream-form" onSubmit={handleConnect}>
        <label className="field">
          <span className="field-label">Server URL</span>
          <input
            type="url"
            value={xtreamProfile.baseUrl}
            onChange={event =>
              setXtreamProfile(current => ({
                ...current,
                baseUrl: event.target.value,
              }))
            }
            placeholder="http://provider.example:8080"
          />
        </label>

        <label className="field">
          <span className="field-label">Username</span>
          <input
            type="text"
            value={xtreamProfile.username}
            onChange={event =>
              setXtreamProfile(current => ({
                ...current,
                username: event.target.value,
              }))
            }
            placeholder="subscriber username"
          />
        </label>

        <label className="field">
          <span className="field-label">Password</span>
          <input
            type="password"
            value={xtreamProfile.password}
            onChange={event =>
              setXtreamProfile(current => ({
                ...current,
                password: event.target.value,
              }))
            }
            placeholder="subscriber password"
          />
        </label>

        <label className="field">
          <span className="field-label">Live output</span>
          <select
            value={xtreamProfile.output}
            onChange={event =>
              setXtreamProfile(current => ({
                ...current,
                output: event.target.value as typeof current.output,
              }))
            }>
            <option value="m3u8">m3u8</option>
            <option value="ts">ts</option>
          </select>
        </label>

        <div className="actions">
          <button type="submit" disabled={connectMutation.isPending}>
            {connectMutation.isPending ? 'Connecting...' : 'Connect'}
          </button>
          <button
            type="button"
            className="secondary"
            onClick={disconnectXtream}>
            Disconnect
          </button>
        </div>
      </form>

      <div className="notes">
        <p>{connectionStatus}</p>
        <p>
          Settings persist in local storage. Credentials are still plain-text in
          the renderer.
        </p>
      </div>
    </section>
  )
}
