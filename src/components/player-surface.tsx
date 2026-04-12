import { useEffect, useRef, useState } from 'react'
import Hls from 'hls.js'
import { getSourceKind } from '@/lib/player'
import { useAppStore } from '@/store/app-store'

type MpegtsVideoElementLike = HTMLElement & {
  src: string
  load: () => Promise<void> | void
  play: () => Promise<void>
  pause: () => void
  removeAttribute: (qualifiedName: string) => void
}

export function PlayerSurface() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const mpegtsRef = useRef<MpegtsVideoElementLike | null>(null)
  const hlsRef = useRef<Hls | null>(null)
  const activeUrl = useAppStore(state => state.activeUrl)
  const activeTitle = useAppStore(state => state.activeTitle)
  const showVideoDebug = useAppStore(state => state.showVideoDebug)
  const [status, setStatus] = useState('Ready to load a stream')
  const [quality, setQuality] = useState('Auto')
  const [streamMode, setStreamMode] = useState('Native video')
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
      updateStatus('Enter a stream URL to begin')
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
    } else if (
      sourceKind === 'hls' &&
      videoRef.current?.canPlayType('application/vnd.apple.mpegurl')
    ) {
      setStreamMode('Native HLS')
      setQuality('Managed natively')
      updateStatus('Using native HLS playback')
      videoRef.current.src = activeUrl
      void videoRef.current.play().catch(() => {
        updateStatus('Stream loaded. Press play to start playback')
      })
    } else if (sourceKind === 'mpegts') {
      setStreamMode('MPEGTS.js')
      setQuality('Stream native')
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

  return (
    <section>
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
      {showVideoDebug && (
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
      )}
    </section>
  )
}
