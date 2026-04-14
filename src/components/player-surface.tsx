import { MediaPlayer } from '@/components/media-player'
import { useAppStore } from '@/store/app-store'

type PlayerSurfaceProps = {
  variant?: 'inline' | 'floating'
  hidden?: boolean
  muted?: boolean
}

export function PlayerSurface({
  variant = 'inline',
  hidden = false,
  muted = false,
}: PlayerSurfaceProps) {
  const activeUrl = useAppStore(state => state.activeUrl)
  const activeTitle = useAppStore(state => state.activeTitle)
  const playerVolume = useAppStore(state => state.playerVolume)
  const playerMuted = useAppStore(state => state.playerMuted)
  const setPlayerAudio = useAppStore(state => state.setPlayerAudio)
  const stopPlayback = useAppStore(state => state.stopPlayback)

  return (
    <MediaPlayer
      url={activeUrl}
      title={activeTitle}
      variant={variant}
      hidden={hidden}
      muted={muted}
      preferredVolume={playerVolume}
      preferredMuted={playerMuted}
      onAudioStateChange={setPlayerAudio}
      onClose={stopPlayback}
    />
  )
}
