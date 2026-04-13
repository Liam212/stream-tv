import { useEffect, useRef, useState } from 'react'
import Hls from 'hls.js'
import {
  Maximize,
  Pause,
  Play,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'
import { getSourceKind } from '@/lib/player'

type MediaElementLike = HTMLElement & {
  src: string
  paused: boolean
  muted: boolean
  volume: number
  load: () => Promise<void> | void
  play: () => Promise<void>
  pause: () => void
  removeAttribute: (qualifiedName: string) => void
  addEventListener: HTMLElement['addEventListener']
  removeEventListener: HTMLElement['removeEventListener']
}

type MediaPlayerProps = {
  url: string
  title: string
  variant?: 'inline' | 'floating' | 'tile'
  hidden?: boolean
  muted?: boolean
  preferredVolume?: number
  preferredMuted?: boolean
  onAudioStateChange?: (state: { volume: number; muted: boolean }) => void
  onClose?: () => void
}

export function MediaPlayer({
  url,
  title,
  variant = 'inline',
  hidden = false,
  muted = false,
  preferredVolume = 1,
  preferredMuted = false,
  onAudioStateChange,
  onClose,
}: MediaPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const mpegtsRef = useRef<MediaElementLike | null>(null)
  const containerRef = useRef<HTMLElement | null>(null)
  const hlsRef = useRef<Hls | null>(null)
  const [status, setStatus] = useState('Ready to load a stream')
  const [quality, setQuality] = useState('Auto')
  const [streamMode, setStreamMode] = useState('Native video')
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(muted)
  const [volume, setVolume] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const sourceKind = getSourceKind(url)
  const hasActivePlayback = url.trim().length > 0
  const normalizedPreferredVolume = Math.max(0, Math.min(1, preferredVolume))

  const getMediaElement = () =>
    sourceKind === 'mpegts' ? mpegtsRef.current : videoRef.current

  useEffect(() => {
    const media = getMediaElement()
    if (!media) {
      return
    }

    media.volume = normalizedPreferredVolume
    media.muted = muted || preferredMuted
    setVolume(media.volume)
    setIsMuted(media.muted)
  }, [
    muted,
    preferredMuted,
    normalizedPreferredVolume,
    sourceKind,
    hasActivePlayback,
  ])

  useEffect(() => {
    const media = getMediaElement()
    if (!media || !hasActivePlayback) {
      setIsPlaying(false)
      setIsMuted(muted)
      return
    }

    const syncPlaybackState = () => {
      const nextVolume = media.volume
      const nextMuted = muted ? true : media.muted || nextVolume === 0

      setIsPlaying(!media.paused)
      setIsMuted(nextMuted)
      setVolume(nextVolume)

      if (!muted) {
        onAudioStateChange?.({
          volume: nextVolume,
          muted: nextMuted,
        })
      }
    }

    syncPlaybackState()

    media.addEventListener('play', syncPlaybackState)
    media.addEventListener('playing', syncPlaybackState)
    media.addEventListener('pause', syncPlaybackState)
    media.addEventListener('volumechange', syncPlaybackState)

    return () => {
      media.removeEventListener('play', syncPlaybackState)
      media.removeEventListener('playing', syncPlaybackState)
      media.removeEventListener('pause', syncPlaybackState)
      media.removeEventListener('volumechange', syncPlaybackState)
    }
  }, [url, muted, sourceKind, hasActivePlayback, onAudioStateChange])

  useEffect(() => {
    const syncFullscreenState = () => {
      setIsFullscreen(document.fullscreenElement === containerRef.current)
    }

    syncFullscreenState()
    document.addEventListener('fullscreenchange', syncFullscreenState)

    return () => {
      document.removeEventListener('fullscreenchange', syncFullscreenState)
    }
  }, [])

  useEffect(() => {
    const media = getMediaElement()

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

    if (!url.trim()) {
      updateStatus('Enter a stream URL to begin')
      setQuality('Auto')
      setIsPlaying(false)
      setVolume(1)
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

      hls.loadSource(url)
      hls.attachMedia(video)
    } else if (
      sourceKind === 'hls' &&
      videoRef.current?.canPlayType('application/vnd.apple.mpegurl')
    ) {
      setStreamMode('Native HLS')
      setQuality('Managed natively')
      updateStatus('Using native HLS playback')
      videoRef.current.src = url
      void videoRef.current.play().catch(() => {
        updateStatus('Stream loaded. Press play to start playback')
      })
    } else if (sourceKind === 'mpegts') {
      setStreamMode('MPEGTS.js')
      setQuality('Stream native')
      updateStatus('Loading MPEG-TS stream')
      mpegtsRef.current!.src = url
      void mpegtsRef.current!.load()
      void mpegtsRef.current!.play().catch(() => {
        updateStatus('Stream loaded. Press play to start playback')
      })
    } else {
      setStreamMode('Native video')
      setQuality('Source native')
      updateStatus('Loading media source')
      media.src = url
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
  }, [url, sourceKind])

  const togglePlayback = () => {
    const media = getMediaElement()
    if (!media) {
      return
    }

    if (media.paused) {
      void media.play()
      return
    }

    media.pause()
  }

  const toggleMute = () => {
    const media = getMediaElement()
    if (!media) {
      return
    }

    media.muted = !media.muted
    setIsMuted(media.muted)
  }

  const handleVolumeChange = (nextVolume: number) => {
    const media = getMediaElement()
    if (!media) {
      return
    }

    media.volume = nextVolume
    media.muted = nextVolume === 0
    setVolume(nextVolume)
    setIsMuted(media.muted)
  }

  const toggleFullscreen = async () => {
    const container = containerRef.current
    if (!container) {
      return
    }

    if (document.fullscreenElement === container) {
      await document.exitFullscreen()
      return
    }

    await container.requestFullscreen()
  }

  if (!hasActivePlayback) {
    return null
  }

  const playerClass =
    variant === 'floating'
      ? 'floating-player'
      : variant === 'tile'
        ? 'multi-player'
        : 'inline-player'

  return (
    <section
      ref={containerRef}
      className={`${playerClass}${hidden ? ' is-page-hidden' : ''}`}
      aria-hidden={hidden}>
      <div className="player-frame">
        {sourceKind === 'mpegts' ? (
          <mpegts-video ref={mpegtsRef} className="player" preload="auto" />
        ) : (
          <video
            ref={videoRef}
            className="player"
            playsInline
            preload="auto"
            muted={muted}
          />
        )}

        <div className="player-overlay">
          <div className="player-overlay-top">
            <div>
              <p className="floating-player-label">Now Playing</p>
              <strong className="floating-player-title">
                {title || 'Active stream'}
              </strong>
            </div>
            {onClose && (
              <button
                type="button"
                className="player-control player-close"
                onClick={onClose}
                aria-label="Close player">
                <X size={18} />
              </button>
            )}
          </div>

          <div className="player-overlay-center">
            <button
              type="button"
              className="player-control player-control-primary"
              onClick={togglePlayback}
              aria-label={isPlaying ? 'Pause stream' : 'Play stream'}>
              {isPlaying ? <Pause size={22} /> : <Play size={22} />}
            </button>
          </div>

          <div className="player-overlay-bottom">
            <div className="player-overlay-meta">
              <span>{status}</span>
              <span>{streamMode}</span>
              <span>{quality}</span>
            </div>

            <div className="player-overlay-actions">
              <button
                type="button"
                className="player-control"
                onClick={toggleMute}
                aria-label={isMuted ? 'Unmute stream' : 'Mute stream'}>
                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>

              <label className="player-volume" aria-label="Volume">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={Math.round(volume * 100)}
                  onChange={event =>
                    handleVolumeChange(Number(event.target.value) / 100)
                  }
                />
              </label>

              <button
                type="button"
                className="player-control"
                onClick={toggleFullscreen}
                aria-label={
                  isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'
                }>
                <Maximize size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
