import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Grid2x2, LayoutTemplate, Plus, Search } from 'lucide-react'
import { MediaPlayer } from '@/components/media-player'
import { useAppStore } from '@/store/app-store'
import {
  buildXtreamStreamUrl,
  getXtreamProfileCacheKey,
  getXtreamStreams,
  type XtreamStream,
} from '@/xtream'

type PickerMode = 'search' | 'direct'

type MultiViewSlot = {
  id: number
  title: string
  url: string
  volume: number
  muted: boolean
}

type LayoutPreset = {
  id: string
  label: string
  slotCount: number
  icon: typeof Grid2x2
  cells: Array<{
    slotId: number
    className: string
  }>
}

const LAYOUT_PRESETS: LayoutPreset[] = [
  {
    id: 'focus-corners',
    label: 'Focus',
    slotCount: 5,
    icon: LayoutTemplate,
    cells: [
      { slotId: 1, className: 'slot-main' },
      { slotId: 2, className: 'slot-corner slot-top-left' },
      { slotId: 3, className: 'slot-corner slot-top-right' },
      { slotId: 4, className: 'slot-corner slot-bottom-left' },
      { slotId: 5, className: 'slot-corner slot-bottom-right' },
    ],
  },
  {
    id: 'quad-grid',
    label: 'Quad',
    slotCount: 4,
    icon: Grid2x2,
    cells: [
      { slotId: 1, className: 'slot-grid' },
      { slotId: 2, className: 'slot-grid' },
      { slotId: 3, className: 'slot-grid' },
      { slotId: 4, className: 'slot-grid' },
    ],
  },
  {
    id: 'duo',
    label: 'Duo',
    slotCount: 2,
    icon: Grid2x2,
    cells: [
      { slotId: 1, className: 'slot-duo' },
      { slotId: 2, className: 'slot-duo' },
    ],
  },
]

function createEmptySlot(id: number): MultiViewSlot {
  return {
    id,
    title: '',
    url: '',
    volume: 1,
    muted: false,
  }
}

function fitSlotsToCount(slots: MultiViewSlot[], count: number) {
  const next = slots
    .slice(0, count)
    .map((slot, index) => ({
      ...slot,
      id: index + 1,
    }))

  while (next.length < count) {
    next.push(createEmptySlot(next.length + 1))
  }

  return next
}

export function MultiViewPage() {
  const connectedProfile = useAppStore(state => state.connectedProfile)
  const experimentalFeaturesEnabled = useAppStore(
    state => state.experimentalFeaturesEnabled,
  )
  const [selectedPresetId, setSelectedPresetId] = useState('focus-corners')
  const [pickerSlotId, setPickerSlotId] = useState<number | null>(null)
  const [pickerMode, setPickerMode] = useState<PickerMode>('search')
  const [searchTerm, setSearchTerm] = useState('')
  const [directUrl, setDirectUrl] = useState('')
  const [directTitle, setDirectTitle] = useState('')
  const [slots, setSlots] = useState<MultiViewSlot[]>(() =>
    fitSlotsToCount([], LAYOUT_PRESETS[0].slotCount),
  )
  const connectedProfileKey = useMemo(
    () => getXtreamProfileCacheKey(connectedProfile),
    [connectedProfile],
  )
  const selectedPreset =
    LAYOUT_PRESETS.find(preset => preset.id === selectedPresetId) ??
    LAYOUT_PRESETS[0]

  useEffect(() => {
    setSlots(current => fitSlotsToCount(current, selectedPreset.slotCount))
    setPickerSlotId(current =>
      current ? Math.min(current, selectedPreset.slotCount) : null,
    )
  }, [selectedPreset.slotCount])

  useEffect(() => {
    if (!connectedProfile) {
      setSearchTerm('')
      if (pickerMode === 'search') {
        setPickerMode('direct')
      }
    }
  }, [connectedProfile, pickerMode])

  const channelsQuery = useQuery({
    queryKey: ['multiview', 'channels', connectedProfileKey],
    queryFn: () => getXtreamStreams(connectedProfile!, 'live'),
    enabled: !!connectedProfile,
  })

  const filteredChannels = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    if (!query) {
      return []
    }

    return (channelsQuery.data ?? [])
      .filter(channel =>
        `${channel.name ?? channel.title ?? ''}`.toLowerCase().includes(query),
      )
      .slice(0, 30)
  }, [channelsQuery.data, searchTerm])

  const assignChannelToSlot = (slotId: number, channel: XtreamStream) => {
    if (!connectedProfile) {
      return
    }

    const slotUrl = buildXtreamStreamUrl(connectedProfile, 'live', channel)
    const slotTitle = channel.name ?? channel.title ?? 'Untitled channel'

    setSlots(current =>
      current.map(slot =>
        slot.id === slotId
          ? {
              ...slot,
              title: slotTitle,
              url: slotUrl,
            }
          : slot,
      ),
    )

    setPickerSlotId(null)
    setSearchTerm('')
    setDirectUrl('')
    setDirectTitle('')
  }

  const assignDirectStreamToSlot = () => {
    if (!pickerSlotId) {
      return
    }

    const url = directUrl.trim()
    if (!url) {
      return
    }

    setSlots(current =>
      current.map(slot =>
        slot.id === pickerSlotId
          ? {
              ...slot,
              title: directTitle.trim() || 'Direct stream',
              url,
            }
          : slot,
      ),
    )

    setPickerSlotId(null)
    setDirectUrl('')
    setDirectTitle('')
    setSearchTerm('')
  }

  const clearSlot = (slotId: number) => {
    setSlots(current => {
      const remaining = current
        .filter(slot => slot.id !== slotId)
        .filter(slot => slot.url.trim().length > 0)
      return fitSlotsToCount(remaining, selectedPreset.slotCount)
    })

    setPickerSlotId(current => {
      if (current === null || current === slotId) {
        return null
      }

      return Math.min(current, selectedPreset.slotCount)
    })
    setSearchTerm('')
    setDirectUrl('')
    setDirectTitle('')
  }

  const openPickerForSlot = (slotId: number) => {
    setPickerSlotId(slotId)
    setPickerMode(connectedProfile ? 'search' : 'direct')
    setSearchTerm('')
    setDirectUrl('')
    setDirectTitle('')
  }

  const updateSlotAudio = (
    slotId: number,
    nextAudio: { volume: number; muted: boolean },
  ) => {
    setSlots(current =>
      current.map(slot =>
        slot.id === slotId
          ? {
              ...slot,
              volume: nextAudio.volume,
              muted: nextAudio.muted,
            }
          : slot,
      ),
    )
  }

  if (!experimentalFeaturesEnabled) {
    return (
      <section className="route-panel">
        <p className="eyebrow">Experimental</p>
        <h2 className="text-2xl font-semibold text-slate-50">
          Multi View is hidden
        </h2>
        <p className="mt-3 text-sm text-slate-400">
          Enable experimental features in{' '}
          <Link to="/settings" className="inline-link">
            Settings
          </Link>{' '}
          to access this screen.
        </p>
      </section>
    )
  }

  return (
    <section className="route-panel multi-view-page">
      <div className="multi-view-toolbar">
        <div className="multi-view-presets">
          {LAYOUT_PRESETS.map(preset => {
            const Icon = preset.icon
            return (
              <button
                key={preset.id}
                type="button"
                className={selectedPreset.id === preset.id ? 'tab active' : 'tab'}
                onClick={() => setSelectedPresetId(preset.id)}>
                <Icon size={16} />
                {preset.label}
              </button>
            )
          })}
        </div>
      </div>

      {!connectedProfile && (
        <section className="control-panel route-hint">
          <p className="empty-state">
            No Xtream provider is connected. Search is unavailable, but direct
            streams still work. Open{' '}
            <Link to="/settings" className="inline-link">
              Settings
            </Link>{' '}
            to configure Xtream access.
          </p>
        </section>
      )}

      {pickerSlotId && (
        <section className="multi-view-search-panel">
          <div className="multi-view-picker-actions">
            <button
              type="button"
              className={pickerMode === 'search' ? 'tab active' : 'tab'}
              onClick={() => setPickerMode('search')}
              disabled={!connectedProfile}>
              Search
            </button>
            <button
              type="button"
              className={pickerMode === 'direct' ? 'tab active' : 'tab'}
              onClick={() => setPickerMode('direct')}>
              Direct play
            </button>
          </div>

          {pickerMode === 'search' ? (
            <>
              <label className="multi-view-search-input">
                <Search size={16} />
                <input
                  type="search"
                  value={searchTerm}
                  onChange={event => setSearchTerm(event.target.value)}
                  placeholder="Search channel name"
                  autoFocus
                />
              </label>

              <div className="multi-view-search-results">
                {!connectedProfile && (
                  <p className="empty-state">
                    Connect Xtream in Settings to search channels here.
                  </p>
                )}

                {connectedProfile && channelsQuery.isLoading && (
                  <p className="empty-state">Loading Xtream live channels...</p>
                )}

                {connectedProfile && channelsQuery.isError && (
                  <p className="empty-state">
                    {channelsQuery.error instanceof Error
                      ? channelsQuery.error.message
                      : 'Failed to load channels'}
                  </p>
                )}

                {connectedProfile &&
                  !channelsQuery.isLoading &&
                  !channelsQuery.isError &&
                  !searchTerm.trim() && (
                    <p className="empty-state">Start typing to find a channel.</p>
                  )}

                {connectedProfile &&
                  !channelsQuery.isLoading &&
                  !channelsQuery.isError &&
                  !!searchTerm.trim() &&
                  filteredChannels.length === 0 && (
                    <p className="empty-state">No channels matched your search.</p>
                  )}

                {filteredChannels.map(channel => (
                  <button
                    key={`${channel.stream_id ?? channel.name}`}
                    type="button"
                    className="list-item multi-view-search-result"
                    onClick={() => assignChannelToSlot(pickerSlotId, channel)}>
                    <span>{channel.name ?? channel.title ?? 'Untitled'}</span>
                    <small>Add to slot {pickerSlotId}</small>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="multi-view-direct-panel">
              <label className="field">
                <span className="field-label">Stream URL</span>
                <input
                  type="url"
                  value={directUrl}
                  onChange={event => setDirectUrl(event.target.value)}
                  placeholder="https://example.com/live/stream.m3u8"
                  autoFocus
                />
              </label>

              <label className="field">
                <span className="field-label">Title</span>
                <input
                  type="text"
                  value={directTitle}
                  onChange={event => setDirectTitle(event.target.value)}
                  placeholder="Optional channel title"
                />
              </label>

              <div className="actions">
                <button
                  type="button"
                  disabled={!directUrl.trim()}
                  onClick={assignDirectStreamToSlot}>
                  Add stream
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      <section className={`multi-view-grid layout-${selectedPreset.id}`}>
        {selectedPreset.cells.map(cell => {
          const slot = slots[cell.slotId - 1] ?? createEmptySlot(cell.slotId)

          return (
            <article
              key={`${selectedPreset.id}-${cell.slotId}`}
              className={`multi-view-slot ${cell.className}${pickerSlotId === slot.id ? ' is-picker' : ''}`}>
              <button
                type="button"
                className="multi-view-slot-add"
                onClick={() => openPickerForSlot(slot.id)}
                aria-label={
                  slot.url
                    ? `Replace channel in slot ${slot.id}`
                    : `Add channel to slot ${slot.id}`
                }>
                <Plus size={22} />
              </button>

              {slot.url ? (
                <MediaPlayer
                  url={slot.url}
                  title={slot.title}
                  variant="tile"
                  compact={cell.className.includes('slot-corner')}
                  preferredVolume={slot.volume}
                  preferredMuted={slot.muted}
                  onAudioStateChange={nextAudio =>
                    updateSlotAudio(slot.id, nextAudio)
                  }
                  onClose={() => clearSlot(slot.id)}
                />
              ) : (
                <div className="multi-view-slot-empty">
                  <span>Slot {slot.id}</span>
                </div>
              )}
            </article>
          )
        })}
      </section>
    </section>
  )
}
