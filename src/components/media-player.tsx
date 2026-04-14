import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from 'react'
import Hls from 'hls.js'
import { Maximize, Pause, Play, Volume2, VolumeX, X } from 'lucide-react'
import { getSourceKind } from '@/lib/player'
import { cn } from '@/lib/utils'

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
  compact?: boolean
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
  compact = false,
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
  const hideControlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  )
  const hlsRef = useRef<Hls | null>(null)
  const [status, setStatus] = useState('Ready to load a stream')
  const [quality, setQuality] = useState('Auto')
  const [streamMode, setStreamMode] = useState('Native video')
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(muted)
  const [volume, setVolume] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const sourceKind = getSourceKind(url)
  const hasActivePlayback = url.trim().length > 0
  const normalizedPreferredVolume = Math.max(0, Math.min(1, preferredVolume))

  const getMediaElement = () =>
    sourceKind === 'mpegts' ? mpegtsRef.current : videoRef.current

  const syncMediaLayout = () => {
    const media = getMediaElement()
    const container = containerRef.current

    if (!media || !container) {
      return
    }

    const { clientWidth, clientHeight } = container
    if (!clientWidth || !clientHeight) {
      return
    }

    media.style.width = `${clientWidth}px`
    media.style.height = `${clientHeight}px`
  }

  const clearHideControlsTimeout = () => {
    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current)
      hideControlsTimeoutRef.current = null
    }
  }

  const scheduleHideControls = () => {
    clearHideControlsTimeout()

    if (!isPlaying) {
      setShowControls(true)
      return
    }

    hideControlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false)
    }, 2200)
  }

  const revealControls = () => {
    setShowControls(true)
    scheduleHideControls()
  }

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
      requestAnimationFrame(() => {
        syncMediaLayout()
      })
    }

    syncFullscreenState()
    document.addEventListener('fullscreenchange', syncFullscreenState)

    return () => {
      document.removeEventListener('fullscreenchange', syncFullscreenState)
    }
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return
    }

    const handleResize = () => {
      requestAnimationFrame(() => {
        syncMediaLayout()
      })
    }

    handleResize()

    const resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(container)
    window.addEventListener('resize', handleResize)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', handleResize)
    }
  }, [sourceKind, url, variant, isFullscreen])

  useEffect(() => {
    if (!hasActivePlayback) {
      setShowControls(true)
      clearHideControlsTimeout()
      return
    }

    if (!isPlaying) {
      setShowControls(true)
      clearHideControlsTimeout()
      return
    }

    scheduleHideControls()

    return () => {
      clearHideControlsTimeout()
    }
  }, [hasActivePlayback, isPlaying])

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
    const handleResize = () => syncMediaLayout()

    media.addEventListener('loadedmetadata', handleLoadedMetadata)
    media.addEventListener('playing', handlePlaying)
    media.addEventListener('waiting', handleWaiting)
    media.addEventListener('pause', handlePause)
    media.addEventListener('loadeddata', handleResize)
    media.addEventListener('resize', handleResize)

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
        syncMediaLayout()
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
      syncMediaLayout()
      void videoRef.current.play().catch(() => {
        updateStatus('Stream loaded. Press play to start playback')
      })
    } else if (sourceKind === 'mpegts') {
      setStreamMode('MPEGTS.js')
      setQuality('Stream native')
      updateStatus('Loading MPEG-TS stream')
      mpegtsRef.current!.src = url
      syncMediaLayout()
      void mpegtsRef.current!.load()
      void mpegtsRef.current!.play().catch(() => {
        updateStatus('Stream loaded. Press play to start playback')
      })
    } else {
      setStreamMode('Native video')
      setQuality('Source native')
      updateStatus('Loading media source')
      media.src = url
      syncMediaLayout()
      void media.play().catch(() => {
        updateStatus('Media loaded. Press play to start playback')
      })
    }

    return () => {
      media.removeEventListener('loadedmetadata', handleLoadedMetadata)
      media.removeEventListener('playing', handlePlaying)
      media.removeEventListener('waiting', handleWaiting)
      media.removeEventListener('pause', handlePause)
      media.removeEventListener('loadeddata', handleResize)
      media.removeEventListener('resize', handleResize)

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

  const handlePlaybackKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== ' ' && event.key !== 'Enter') {
      return
    }

    const target = event.target as HTMLElement
    const playToggleTrigger = target.closest('[data-play-toggle="true"]')
    const interactiveControl = target.closest('button, input, textarea, select')

    if (interactiveControl && !playToggleTrigger) {
      return
    }

    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement
    ) {
      return
    }

    event.preventDefault()
    togglePlayback()
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

  const wrapperClassName = cn(
    variant === 'floating'
      ? 'fixed right-6 bottom-6 z-30 w-[min(680px,calc(100vw-48px))] shadow-[0_28px_80px_rgba(2,6,23,0.5)]'
      : variant === 'tile'
        ? 'grid h-full w-full border-0 bg-transparent p-0'
        : 'mb-4 border border-white/10 bg-slate-950/90 p-3',
    isFullscreen && 'inset-0 h-screen w-screen max-w-none p-0',
    hidden &&
      'pointer-events-none fixed top-0 left-[-10000px] h-px w-px overflow-hidden border-0 p-0 opacity-0',
  )

  const frameClassName = cn(
    'group/player relative isolate w-full overflow-hidden rounded-md bg-black',
    variant === 'tile' || isFullscreen
      ? 'h-full min-h-0'
      : 'aspect-video min-h-[220px]',
    isPlaying && !showControls && 'cursor-none',
  )

  const mediaClassName =
    'absolute inset-0 block h-full w-full bg-[#020617] object-cover'

  const shadowControlClassName =
    'inline-flex items-center justify-center rounded-full bg-black/70 text-white shadow-[0_18px_45px_rgba(0,0,0,0.6)] backdrop-blur-md transition-colors hover:bg-black/85'

  return (
    <section
      ref={containerRef}
      className={wrapperClassName}
      aria-hidden={hidden}>
      <div
        className={frameClassName}
        tabIndex={0}
        onKeyDown={handlePlaybackKeyDown}
        onMouseMove={revealControls}
        onMouseEnter={revealControls}
        onMouseLeave={() => {
          if (isPlaying) {
            clearHideControlsTimeout()
            setShowControls(false)
          }
        }}
        onFocus={revealControls}>
        {sourceKind === 'mpegts' ? (
          <mpegts-video
            ref={mpegtsRef}
            className={mediaClassName}
            style={{ '--media-object-fit': 'cover' } as CSSProperties}
            preload="auto"
          />
        ) : (
          <video
            ref={videoRef}
            className={mediaClassName}
            playsInline
            preload="auto"
            muted={muted}
          />
        )}

        <div
          className={cn(
            'absolute inset-0 grid grid-rows-[auto_1fr_auto] p-3 transition-[opacity,background] duration-200',
            showControls
              ? 'pointer-events-auto opacity-100 bg-[linear-gradient(180deg,rgba(2,6,23,0.88),transparent_30%),linear-gradient(0deg,rgba(2,6,23,0.96),transparent_34%)]'
              : 'pointer-events-none opacity-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.76),transparent_24%),linear-gradient(0deg,rgba(2,6,23,0.86),transparent_28%)]',
          )}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="mb-1 text-[0.72rem] uppercase tracking-[0.12em] text-slate-400">
                Now Playing
              </p>
              <strong
                className={cn(
                  'block truncate text-sm text-slate-50',
                  compact && 'max-w-[10rem] text-[0.82rem]',
                )}>
                {title || 'Active stream'}
              </strong>
            </div>
            {onClose && (
              <button
                type="button"
                className="ml-auto"
                onClick={onClose}
                aria-label="Close player">
                <X size={28} color="white" />
              </button>
            )}
          </div>

          <div className="grid place-items-center">
            <button
              type="button"
              data-play-toggle="true"
              className={cn(
                'inline-flex items-center justify-center rounded-full border border-white/10 bg-black/70 text-white shadow-[0_18px_45px_rgba(0,0,0,0.6)] backdrop-blur-md transition-colors hover:bg-black/85',
                compact ? 'hidden' : 'size-16',
              )}
              onClick={togglePlayback}
              onKeyDown={handlePlaybackKeyDown}
              aria-label={isPlaying ? 'Pause stream' : 'Play stream'}>
              {isPlaying ? (
                <Pause size={22} color="white" />
              ) : (
                <Play size={22} color="white" />
              )}
            </button>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className={cn('flex items-center gap-2', compact && 'hidden')}>
              <span className="border border-white/10 bg-slate-900/70 px-2 py-1 text-[0.82rem] text-blue-100">
                {status}
              </span>
              <span className="border border-white/10 bg-slate-900/70 px-2 py-1 text-[0.82rem] text-blue-100">
                {streamMode}
              </span>
              <span className="border border-white/10 bg-slate-900/70 px-2 py-1 text-[0.82rem] text-blue-100">
                {quality}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className={cn(shadowControlClassName, 'size-10')}
                onClick={toggleMute}
                aria-label={isMuted ? 'Unmute stream' : 'Mute stream'}>
                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>

              <label
                className={cn(
                  'inline-flex h-10 w-28 items-center rounded-full bg-black/55 px-3 text-white shadow-[0_18px_45px_rgba(0,0,0,0.45)] backdrop-blur-md',
                  compact && 'hidden',
                )}
                aria-label="Volume">
                <input
                  className="h-1 w-full accent-amber-400"
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
                className={cn(
                  shadowControlClassName,
                  'size-10',
                  compact && 'hidden',
                )}
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
