import { FormEvent, useEffect, useState, useRef } from 'react'
import Hls from 'hls.js'
import './App.css'
import {
  authenticateXtream,
  buildXtreamEpisodeUrl,
  buildXtreamStreamUrl,
  getSeriesEpisodes,
  getXtreamCategories,
  getXtreamSeriesInfo,
  getXtreamStreams,
  type XtreamCategory,
  type XtreamContentType,
  type XtreamEpisode,
  type XtreamProfile,
  type XtreamStream,
} from './xtream'

const DEFAULT_STREAM_URL = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'
const XTREAM_STORAGE_KEY = 'stream-tv.xtream-profile'

type SourceKind = 'hls' | 'mpegts' | 'native'

type MpegtsVideoElementLike = HTMLElement & {
  src: string
  load: () => Promise<void> | void
  play: () => Promise<void>
  pause: () => void
  removeAttribute: (qualifiedName: string) => void
}

function isHlsSource(url: string) {
  return /\.m3u8($|\?)/i.test(url)
}

function isMpegtsSource(url: string) {
  return /\.ts($|\?)/i.test(url)
}

function getSourceKind(url: string): SourceKind {
  if (isHlsSource(url)) {
    return 'hls'
  }

  if (isMpegtsSource(url)) {
    return 'mpegts'
  }

  return 'native'
}

function App() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const mpegtsRef = useRef<MpegtsVideoElementLike | null>(null)
  const hlsRef = useRef<Hls | null>(null)
  const [streamUrl, setStreamUrl] = useState(DEFAULT_STREAM_URL)
  const [activeUrl, setActiveUrl] = useState(DEFAULT_STREAM_URL)
  const [status, setStatus] = useState('Ready to load a stream')
  const [quality, setQuality] = useState('Auto')
  const [streamMode, setStreamMode] = useState('Native video')
  const [activeTitle, setActiveTitle] = useState('Mux sample stream')
  const [xtreamProfile, setXtreamProfile] = useState<XtreamProfile>(() => {
    if (typeof window === 'undefined') {
      return { baseUrl: '', username: '', password: '', output: 'm3u8' }
    }

    const saved = window.localStorage.getItem(XTREAM_STORAGE_KEY)
    if (!saved) {
      return { baseUrl: '', username: '', password: '', output: 'm3u8' }
    }

    try {
      return JSON.parse(saved) as XtreamProfile
    } catch {
      return { baseUrl: '', username: '', password: '', output: 'm3u8' }
    }
  })
  const [connectedProfile, setConnectedProfile] = useState<XtreamProfile | null>(null)
  const [connectionStatus, setConnectionStatus] = useState('Not connected')
  const [contentType, setContentType] = useState<XtreamContentType>('live')
  const [categories, setCategories] = useState<XtreamCategory[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [items, setItems] = useState<XtreamStream[]>([])
  const [selectedItem, setSelectedItem] = useState<XtreamStream | null>(null)
  const [episodes, setEpisodes] = useState<XtreamEpisode[]>([])
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<number | null>(null)
  const [loadingLibrary, setLoadingLibrary] = useState(false)
  const [loadingSeries, setLoadingSeries] = useState(false)
  const sourceKind = getSourceKind(activeUrl)

  useEffect(() => {
    const media = sourceKind === 'mpegts' ? mpegtsRef.current : videoRef.current

    if (!media) {
      return
    }

    const updateStatus = (nextStatus: string) => setStatus(nextStatus)

    media.pause()
    media.removeAttribute('src')
    void media.load()

    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }

    if (!activeUrl.trim()) {
      updateStatus('Enter an .m3u8 stream URL to begin')
      setQuality('Auto')
      return
    }

    setQuality('Auto')

    const handleLoadedMetadata = () => updateStatus('Metadata loaded')
    const handlePlaying = () => updateStatus('Playing')
    const handleWaiting = () => updateStatus('Buffering')
    const handlePause = () => updateStatus('Paused')

    media.addEventListener('loadedmetadata', handleLoadedMetadata)
    media.addEventListener('playing', handlePlaying)
    media.addEventListener('waiting', handleWaiting)
    media.addEventListener('pause', handlePause)

    if (sourceKind === 'hls' && Hls.isSupported()) {
      const video = videoRef.current
      if (!video) {
        return
      }

      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      })

      hlsRef.current = hls
      setStreamMode('HLS.js')
      updateStatus('Loading manifest')

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        updateStatus(
          `Manifest ready with ${data.levels.length} quality level${data.levels.length === 1 ? '' : 's'}`,
        )
        void video.play().catch(() => {
          updateStatus('Stream loaded. Press play to start playback')
        })
      })

      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
        const currentLevel = hls.levels[data.level]
        setQuality(currentLevel?.height ? `${currentLevel.height}p` : 'Auto')
      })

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (!data.fatal) {
          return
        }

        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          updateStatus('Network error. Retrying stream')
          hls.startLoad()
          return
        }

        if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          updateStatus('Media error. Attempting recovery')
          hls.recoverMediaError()
          return
        }

        updateStatus(`Fatal playback error: ${data.details}`)
        hls.destroy()
        hlsRef.current = null
      })

      hls.loadSource(activeUrl)
      hls.attachMedia(video)
    } else if (sourceKind === 'hls' && videoRef.current?.canPlayType('application/vnd.apple.mpegurl')) {
      setStreamMode('Native HLS')
      setQuality('Managed natively')
      updateStatus('Using native HLS playback')
      videoRef.current.src = activeUrl
      void videoRef.current.play().catch(() => {
        updateStatus('Stream loaded. Press play to start playback')
      })
    } else if (sourceKind === 'mpegts') {
      setStreamMode('MPEG-TS.js')
      setQuality('Source native')
      updateStatus('Loading MPEG-TS stream')
      mpegtsRef.current!.src = activeUrl
      void mpegtsRef.current!.load()
      void mpegtsRef.current!.play().catch(() => {
        updateStatus('Stream loaded. Press play to start playback')
      })
    } else {
      setStreamMode('Native video')
      setQuality('Source native')
      updateStatus('Loading media source')
      media.src = activeUrl
      void media.play().catch(() => {
        updateStatus('Media loaded. Press play to start playback')
      })
    }

    return () => {
      media.removeEventListener('loadedmetadata', handleLoadedMetadata)
      media.removeEventListener('playing', handlePlaying)
      media.removeEventListener('waiting', handleWaiting)
      media.removeEventListener('pause', handlePause)

      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
    }
  }, [activeUrl, sourceKind])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setActiveTitle('Manual stream')
    setActiveUrl(streamUrl.trim())
  }

  const handleXtreamConnect = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setConnectionStatus('Connecting to Xtream provider')

    try {
      const auth = await authenticateXtream(xtreamProfile)
      if (auth.user_info?.auth !== 1) {
        throw new Error('Provider rejected the supplied credentials')
      }

      setConnectedProfile(xtreamProfile)
      window.localStorage.setItem(XTREAM_STORAGE_KEY, JSON.stringify(xtreamProfile))
      setConnectionStatus(
        auth.user_info?.status
          ? `Connected (${auth.user_info.status})`
          : 'Connected',
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to connect'
      setConnectionStatus(message)
    }
  }

  useEffect(() => {
    if (!connectedProfile) {
      return
    }

    let cancelled = false

    const loadLibrary = async () => {
      setLoadingLibrary(true)

      try {
        const nextCategories = await getXtreamCategories(connectedProfile, contentType)
        if (cancelled) {
          return
        }

        setCategories(nextCategories)
        setSelectedCategoryId(current => {
          if (current && nextCategories.some(category => category.category_id === current)) {
            return current
          }

          return nextCategories[0]?.category_id ?? ''
        })
      } catch (error) {
        if (!cancelled) {
          setConnectionStatus(
            error instanceof Error ? error.message : 'Failed to load Xtream categories',
          )
          setCategories([])
          setItems([])
        }
      } finally {
        if (!cancelled) {
          setLoadingLibrary(false)
        }
      }
    }

    void loadLibrary()

    return () => {
      cancelled = true
    }
  }, [connectedProfile, contentType])

  useEffect(() => {
    if (!connectedProfile || !selectedCategoryId) {
      setItems([])
      setSelectedItem(null)
      setEpisodes([])
      return
    }

    let cancelled = false

    const loadItems = async () => {
      setLoadingLibrary(true)

      try {
        const nextItems = await getXtreamStreams(
          connectedProfile,
          contentType,
          selectedCategoryId,
        )

        if (cancelled) {
          return
        }

        setItems(nextItems)
        setSelectedItem(null)
        setEpisodes([])
        setSelectedEpisodeId(null)
      } catch (error) {
        if (!cancelled) {
          setConnectionStatus(
            error instanceof Error ? error.message : 'Failed to load Xtream content',
          )
          setItems([])
        }
      } finally {
        if (!cancelled) {
          setLoadingLibrary(false)
        }
      }
    }

    void loadItems()

    return () => {
      cancelled = true
    }
  }, [connectedProfile, contentType, selectedCategoryId])

  const playXtreamItem = async (item: XtreamStream) => {
    if (!connectedProfile) {
      return
    }

    setSelectedItem(item)
    setSelectedEpisodeId(null)
    setEpisodes([])

    if (contentType === 'series') {
      if (!item.series_id) {
        setConnectionStatus('Series entry is missing a series id')
        return
      }

      setLoadingSeries(true)

      try {
        const seriesInfo = await getXtreamSeriesInfo(connectedProfile, item.series_id)
        const nextEpisodes = getSeriesEpisodes(seriesInfo)
        setEpisodes(nextEpisodes)
        setConnectionStatus(`Loaded ${nextEpisodes.length} episode${nextEpisodes.length === 1 ? '' : 's'}`)
      } catch (error) {
        setConnectionStatus(
          error instanceof Error ? error.message : 'Failed to load series episodes',
        )
      } finally {
        setLoadingSeries(false)
      }

      return
    }

    const url = buildXtreamStreamUrl(connectedProfile, contentType, item)
    setStreamUrl(url)
    setActiveTitle(item.name ?? item.title ?? 'Xtream stream')
    setActiveUrl(url)
  }

  const playEpisode = (episode: XtreamEpisode) => {
    if (!connectedProfile) {
      return
    }

    const url = buildXtreamEpisodeUrl(connectedProfile, episode)
    setSelectedEpisodeId(episode.id)
    setStreamUrl(url)
    setActiveTitle(episode.title)
    setActiveUrl(url)
  }

  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">Electron + Vite + React + HLS.js</p>
        <h1>Stream TV</h1>
        <p className="lede">
          Desktop HLS playback with Electron for the shell, React for the UI,
          and HLS.js for adaptive streaming.
        </p>
      </section>

      <section className="player-panel">
        <div className="player-frame">
          {sourceKind === 'mpegts' ? (
            <mpegts-video
              ref={mpegtsRef}
              className="player"
              controls={true}
              preload="auto"
            />
          ) : (
            <video
              ref={videoRef}
              className="player"
              controls
              playsInline
              preload="auto"
            />
          )}
        </div>

        <div className="meta-grid">
          <article className="meta-card">
            <span className="meta-label">Status</span>
            <strong data-testid="player-status">{status}</strong>
          </article>
          <article className="meta-card">
            <span className="meta-label">Now playing</span>
            <strong>{activeTitle}</strong>
          </article>
          <article className="meta-card">
            <span className="meta-label">Playback</span>
            <strong>{streamMode}</strong>
          </article>
          <article className="meta-card">
            <span className="meta-label">Quality</span>
            <strong>{quality}</strong>
          </article>
        </div>
      </section>

      <section className="control-grid">
        <section className="control-panel">
          <h2>Xtream API</h2>
          <form className="stream-form" onSubmit={handleXtreamConnect}>
            <label className="field">
              <span className="field-label">Server URL</span>
              <input
                type="url"
                value={xtreamProfile.baseUrl}
                onChange={event =>
                  setXtreamProfile(current => ({ ...current, baseUrl: event.target.value }))
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
                  setXtreamProfile(current => ({ ...current, username: event.target.value }))
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
                  setXtreamProfile(current => ({ ...current, password: event.target.value }))
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
                    output: event.target.value as XtreamProfile['output'],
                  }))
                }>
                <option value="m3u8">m3u8</option>
                <option value="ts">ts</option>
              </select>
            </label>

            <div className="actions">
              <button type="submit">Connect provider</button>
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setConnectedProfile(null)
                  setCategories([])
                  setItems([])
                  setEpisodes([])
                  setConnectionStatus('Disconnected')
                  window.localStorage.removeItem(XTREAM_STORAGE_KEY)
                }}>
                Clear saved login
              </button>
            </div>
          </form>

          <div className="notes">
            <p>{connectionStatus}</p>
            <p>Credentials are stored locally in this app after a successful connection.</p>
          </div>
        </section>

        <section className="control-panel">
          <h2>Direct URL</h2>
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
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setStreamUrl(DEFAULT_STREAM_URL)
                  setActiveTitle('Mux sample stream')
                  setActiveUrl(DEFAULT_STREAM_URL)
                }}>
                Load sample
              </button>
            </div>
          </form>

          <div className="notes">
            <p>Use this for raw HLS manifests or direct media URLs outside Xtream.</p>
          </div>
        </section>
      </section>

      <section className="library-panel">
        <div className="library-header">
          <div className="tab-row">
            {(['live', 'vod', 'series'] as XtreamContentType[]).map(type => (
              <button
                key={type}
                type="button"
                className={type === contentType ? 'tab active' : 'tab'}
                onClick={() => setContentType(type)}>
                {type.toUpperCase()}
              </button>
            ))}
          </div>
          <span className="library-status">
            {loadingLibrary ? 'Loading library...' : connectedProfile ? 'Library ready' : 'Connect a provider to browse'}
          </span>
        </div>

        <div className="library-grid">
          <div className="library-column">
            <h3>Categories</h3>
            <div className="list-panel">
              {categories.map(category => (
                <button
                  key={category.category_id}
                  type="button"
                  className={category.category_id === selectedCategoryId ? 'list-item active' : 'list-item'}
                  onClick={() => setSelectedCategoryId(category.category_id)}>
                  {category.category_name}
                </button>
              ))}
            </div>
          </div>

          <div className="library-column">
            <h3>{contentType === 'series' ? 'Series' : 'Streams'}</h3>
            <div className="list-panel">
              {items.map(item => (
                <button
                  key={`${item.stream_id ?? item.series_id ?? item.name}`}
                  type="button"
                  className={selectedItem === item ? 'list-item active' : 'list-item'}
                  onClick={() => void playXtreamItem(item)}>
                  <span>{item.name ?? item.title ?? 'Untitled'}</span>
                  <small>{item.container_extension ?? 'stream'}</small>
                </button>
              ))}
            </div>
          </div>

          <div className="library-column">
            <h3>{contentType === 'series' ? 'Episodes' : 'Details'}</h3>
            <div className="list-panel detail-panel">
              {contentType !== 'series' && selectedItem && (
                <>
                  <strong>{selectedItem.name ?? selectedItem.title}</strong>
                  <p>{selectedItem.plot ?? 'No metadata available from the provider.'}</p>
                </>
              )}

              {contentType === 'series' && loadingSeries && <p>Loading episodes...</p>}

              {contentType === 'series' && !loadingSeries && episodes.map(episode => (
                <button
                  key={episode.id}
                  type="button"
                  className={episode.id === selectedEpisodeId ? 'list-item active' : 'list-item'}
                  onClick={() => playEpisode(episode)}>
                  <span>{episode.title}</span>
                  <small>{episode.info?.duration ?? episode.containerExtension}</small>
                </button>
              ))}

              {contentType === 'series' && !loadingSeries && selectedItem && episodes.length === 0 && (
                <p>Select a series to load its episodes.</p>
              )}

              {!selectedItem && contentType !== 'series' && (
                <p>Select a stream to load it in the player.</p>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

export default App
