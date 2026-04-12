import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import {
  buildXtreamEpisodeUrl,
  buildXtreamStreamUrl,
  type XtreamEpisode,
  type XtreamProfile,
  type XtreamStream,
} from '@/xtream'

const DEFAULT_STREAM_URL = ''

type AppStore = {
  streamUrl: string
  activeUrl: string
  activeTitle: string
  xtreamProfile: XtreamProfile
  connectedProfile: XtreamProfile | null
  connectionStatus: string
  setStreamUrl: (value: string) => void
  setXtreamProfile: (
    updater: XtreamProfile | ((current: XtreamProfile) => XtreamProfile),
  ) => void
  setConnectionStatus: (value: string) => void
  connectXtreamProfile: (profile: XtreamProfile, status?: string) => void
  disconnectXtream: () => void
  loadUrl: (url: string, title: string) => void
  loadManualUrl: () => void
  stopPlayback: () => void
  playXtreamStream: (contentType: 'live' | 'vod', item: XtreamStream) => void
  playEpisode: (episode: XtreamEpisode) => void
}

const defaultXtreamProfile: XtreamProfile = {
  baseUrl: '',
  username: '',
  password: '',
  output: 'm3u8',
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      streamUrl: DEFAULT_STREAM_URL,
      activeUrl: DEFAULT_STREAM_URL,
      activeTitle: 'Mux sample stream',
      xtreamProfile: defaultXtreamProfile,
      connectedProfile: null,
      connectionStatus: 'Not connected',
      setStreamUrl: value => set({ streamUrl: value }),
      setXtreamProfile: updater => {
        set(state => ({
          xtreamProfile:
            typeof updater === 'function'
              ? updater(state.xtreamProfile)
              : updater,
        }))
      },
      setConnectionStatus: value => set({ connectionStatus: value }),
      connectXtreamProfile: (profile, status = 'Connected') => {
        set({
          connectedProfile: profile,
          connectionStatus: status,
          xtreamProfile: profile,
        })
      },
      disconnectXtream: () =>
        set({
          connectedProfile: null,
          connectionStatus: 'Disconnected',
        }),
      loadUrl: (url, title) =>
        set({
          streamUrl: url,
          activeUrl: url,
          activeTitle: title,
        }),
      loadManualUrl: () => {
        const { streamUrl } = get()
        set({
          activeUrl: streamUrl.trim(),
          activeTitle: 'Manual stream',
        })
      },
      stopPlayback: () =>
        set({
          activeUrl: '',
          activeTitle: '',
        }),
      playXtreamStream: (contentType, item) => {
        const { connectedProfile } = get()
        if (!connectedProfile) {
          return
        }

        const url = buildXtreamStreamUrl(connectedProfile, contentType, item)
        set({
          streamUrl: url,
          activeUrl: url,
          activeTitle: item.name ?? item.title ?? 'Xtream stream',
        })
      },
      playEpisode: episode => {
        const { connectedProfile } = get()
        if (!connectedProfile) {
          return
        }

        const url = buildXtreamEpisodeUrl(connectedProfile, episode)
        set({
          streamUrl: url,
          activeUrl: url,
          activeTitle: episode.title,
        })
      },
    }),
    {
      name: 'stream-tv-settings',
      storage: createJSONStorage(() => window.localStorage),
      partialize: state => ({
        streamUrl: state.streamUrl,
        xtreamProfile: state.xtreamProfile,
      }),
    },
  ),
)
