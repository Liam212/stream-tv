import { useEffect, useRef, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import './App.css'
import { router } from '@/router'
import { useAppStore } from '@/store/app-store'
import { authenticateXtream, type XtreamProfile } from '@/xtream'

function hasSavedXtreamCredentials(profile: XtreamProfile) {
  return Boolean(profile.baseUrl.trim() && profile.username.trim() && profile.password.trim())
}

function XtreamAutoConnect() {
  const xtreamProfile = useAppStore(state => state.xtreamProfile)
  const connectedProfile = useAppStore(state => state.connectedProfile)
  const setConnectionStatus = useAppStore(state => state.setConnectionStatus)
  const connectXtreamProfile = useAppStore(state => state.connectXtreamProfile)
  const hasAttemptedAutoConnect = useRef(false)

  useEffect(() => {
    if (hasAttemptedAutoConnect.current || connectedProfile || !hasSavedXtreamCredentials(xtreamProfile)) {
      return
    }

    hasAttemptedAutoConnect.current = true

    void (async () => {
      setConnectionStatus('Connecting to Xtream provider')

      try {
        const auth = await authenticateXtream(xtreamProfile)

        if (auth.user_info?.auth !== 1) {
          throw new Error('Provider rejected the supplied credentials')
        }

        connectXtreamProfile(
          xtreamProfile,
          auth.user_info?.status ? `Connected (${auth.user_info.status})` : 'Connected',
        )
      } catch (error) {
        setConnectionStatus(error instanceof Error ? error.message : 'Unable to connect')
      }
    })()
  }, [connectXtreamProfile, connectedProfile, setConnectionStatus, xtreamProfile])

  return null
}

function App() {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      <XtreamAutoConnect />
      <RouterProvider router={router} context={{ queryClient }} />
    </QueryClientProvider>
  )
}

export default App
