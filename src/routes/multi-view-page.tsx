import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { LayoutGrid, Plus, Search } from 'lucide-react'
import { MediaPlayer } from '@/components/media-player'
import { useAppStore } from '@/store/app-store'
import {
  buildXtreamStreamUrl,
  getXtreamStreams,
  type XtreamStream,
} from '@/xtream'

type MultiViewSlot = {
  id: number
  title: string
  url: string
}

type PickerMode = 'search' | 'direct'

function getProfileKey(
  profile: ReturnType<typeof useAppStore.getState>['connectedProfile'],
) {
  if (!profile) {
    return 'disconnected'
  }

  return `${profile.baseUrl}|${profile.username}|${profile.password}|${profile.output}`
}

function createEmptySlots(count: number): MultiViewSlot[] {
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    title: '',
    url: '',
  }))
}

function normalizeSlots(slots: MultiViewSlot[]) {
  return slots.map((slot, index) => ({
    ...slot,
    id: index + 1,
  }))
}

export function MultiViewPage() {
  const connectedProfile = useAppStore(state => state.connectedProfile)
  const [pickerSlotId, setPickerSlotId] = useState<number | null>(null)
  const [pickerMode, setPickerMode] = useState<PickerMode>('search')
  const [searchTerm, setSearchTerm] = useState('')
  const [directUrl, setDirectUrl] = useState('')
  const [directTitle, setDirectTitle] = useState('')
  const [slots, setSlots] = useState<MultiViewSlot[]>(() => createEmptySlots(2))
  const connectedProfileKey = useMemo(
    () => getProfileKey(connectedProfile),
    [connectedProfile],
  )

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
      const remaining = current.filter(slot => slot.id !== slotId)
      const nextSlots =
        remaining.length > 0 ? normalizeSlots(remaining) : createEmptySlots(1)

      setPickerSlotId(currentPicker => {
        if (currentPicker === null || currentPicker === slotId) {
          return null
        }

        return Math.min(currentPicker, nextSlots.length)
      })

      return nextSlots
    })
    setSearchTerm('')
    setDirectUrl('')
    setDirectTitle('')
  }

  const addSlot = () => {
    setSlots(current => {
      const nextId = (current.at(-1)?.id ?? 0) + 1
      setPickerSlotId(nextId)
      setPickerMode(connectedProfile ? 'search' : 'direct')
      return [
        ...current,
        {
          id: nextId,
          title: '',
          url: '',
        },
      ]
    })
    setSearchTerm('')
    setDirectUrl('')
    setDirectTitle('')
  }

  return (
    <section className="route-panel multi-view-page">
      <div className="multi-view-toolbar">
        <button type="button" className="tab multi-view-add-slot" onClick={addSlot}>
          <LayoutGrid size={16} />
          Add slot
        </button>
      </div>

      {!connectedProfile && (
        <section className="control-panel route-hint">
          <p className="empty-state">
            No Xtream provider is connected. Search is unavailable, but direct streams still work. Open{' '}
            <Link to="/settings" className="inline-link">
              Settings
            </Link>{' '}
            to configure Xtream access.
          </p>
        </section>
      )}

      <>
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

                {channelsQuery.isLoading && (
                  <p className="empty-state">Loading Xtream live channels...</p>
                )}

                {channelsQuery.isError && (
                  <p className="empty-state">
                    {channelsQuery.error instanceof Error
                      ? channelsQuery.error.message
                      : 'Failed to load channels'}
                  </p>
                )}

                {!channelsQuery.isLoading &&
                  !channelsQuery.isError &&
                  !searchTerm.trim() && (
                    <p className="empty-state">Start typing to find a channel.</p>
                  )}

                {!channelsQuery.isLoading &&
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

        <section className="multi-view-grid">
          {slots.map(slot => (
            <article
              key={slot.id}
              className={`multi-view-slot${pickerSlotId === slot.id ? ' is-picker' : ''}`}>
              <button
                type="button"
                className="multi-view-slot-add"
                onClick={() => {
                  setPickerSlotId(slot.id)
                  setPickerMode(connectedProfile ? 'search' : 'direct')
                }}
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
                  onClose={() => clearSlot(slot.id)}
                />
              ) : (
                <div className="multi-view-slot-empty">
                  <span>Slot {slot.id}</span>
                </div>
              )}
            </article>
          ))}
        </section>
      </>
    </section>
  )
}
