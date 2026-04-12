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
  const [searchTerm, setSearchTerm] = useState('')
  const [slots, setSlots] = useState<MultiViewSlot[]>(() => createEmptySlots(2))
  const connectedProfileKey = useMemo(
    () => getProfileKey(connectedProfile),
    [connectedProfile],
  )

  useEffect(() => {
    if (!connectedProfile) {
      setSlots(createEmptySlots(2))
      setPickerSlotId(null)
      setSearchTerm('')
    }
  }, [connectedProfile])

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
  }

  const addSlot = () => {
    setSlots(current => {
      const nextId = (current.at(-1)?.id ?? 0) + 1
      setPickerSlotId(nextId)
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
            No provider is connected. Open{' '}
            <Link to="/settings" className="inline-link">
              Settings
            </Link>{' '}
            to configure Xtream access.
          </p>
        </section>
      )}

      {connectedProfile && (
        <>
          {pickerSlotId && (
            <section className="multi-view-search-panel">
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
                  onClick={() => setPickerSlotId(slot.id)}
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
      )}
    </section>
  )
}
