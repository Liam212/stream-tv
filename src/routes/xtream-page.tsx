import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useAppStore } from '@/store/app-store'
import {
  authenticateXtream,
  getSeriesEpisodes,
  getXtreamCategories,
  getXtreamSeriesInfo,
  getXtreamStreams,
  type XtreamContentType,
  type XtreamStream,
} from '@/xtream'

type XtreamPageProps = {
  contentType: XtreamContentType
}

function getProfileKey(profile: ReturnType<typeof useAppStore.getState>['connectedProfile']) {
  if (!profile) {
    return 'disconnected'
  }

  return `${profile.baseUrl}|${profile.username}|${profile.password}|${profile.output}`
}

export function XtreamPage({ contentType }: XtreamPageProps) {
  const xtreamProfile = useAppStore((state) => state.xtreamProfile)
  const connectedProfile = useAppStore((state) => state.connectedProfile)
  const connectionStatus = useAppStore((state) => state.connectionStatus)
  const setXtreamProfile = useAppStore((state) => state.setXtreamProfile)
  const setConnectionStatus = useAppStore((state) => state.setConnectionStatus)
  const connectXtreamProfile = useAppStore((state) => state.connectXtreamProfile)
  const disconnectXtream = useAppStore((state) => state.disconnectXtream)
  const playXtreamStream = useAppStore((state) => state.playXtreamStream)
  const playEpisode = useAppStore((state) => state.playEpisode)

  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [selectedItem, setSelectedItem] = useState<XtreamStream | null>(null)
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<number | null>(null)

  const connectedProfileKey = useMemo(() => getProfileKey(connectedProfile), [connectedProfile])

  const connectMutation = useMutation({
    mutationFn: async () => {
      const auth = await authenticateXtream(xtreamProfile)
      if (auth.user_info?.auth !== 1) {
        throw new Error('Provider rejected the supplied credentials')
      }
      return auth
    },
    onMutate: () => {
      setConnectionStatus('Connecting to Xtream provider')
    },
    onSuccess: (auth) => {
      connectXtreamProfile(
        xtreamProfile,
        auth.user_info?.status ? `Connected (${auth.user_info.status})` : 'Connected',
      )
    },
    onError: (error) => {
      setConnectionStatus(error instanceof Error ? error.message : 'Unable to connect')
    },
  })

  const categoriesQuery = useQuery({
    queryKey: ['xtream', 'categories', contentType, connectedProfileKey],
    queryFn: () => getXtreamCategories(connectedProfile!, contentType),
    enabled: !!connectedProfile,
  })

  useEffect(() => {
    const categories = categoriesQuery.data ?? []
    if (!categories.length) {
      setSelectedCategoryId('')
      return
    }

    if (!categories.some(category => category.category_id === selectedCategoryId)) {
      setSelectedCategoryId(categories[0].category_id)
    }
  }, [categoriesQuery.data, selectedCategoryId])

  const itemsQuery = useQuery({
    queryKey: ['xtream', 'items', contentType, connectedProfileKey, selectedCategoryId],
    queryFn: () => getXtreamStreams(connectedProfile!, contentType, selectedCategoryId),
    enabled: !!connectedProfile && !!selectedCategoryId,
  })

  useEffect(() => {
    setSelectedItem(null)
    setSelectedEpisodeId(null)
  }, [contentType, selectedCategoryId])

  const seriesEpisodesQuery = useQuery({
    queryKey: ['xtream', 'series', connectedProfileKey, selectedItem?.series_id],
    queryFn: async () => {
      const seriesInfo = await getXtreamSeriesInfo(connectedProfile!, selectedItem!.series_id!)
      return getSeriesEpisodes(seriesInfo)
    },
    enabled: !!connectedProfile && contentType === 'series' && !!selectedItem?.series_id,
  })

  const handleConnect = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    connectMutation.mutate()
  }

  const handleSelectItem = (item: XtreamStream) => {
    setSelectedItem(item)
    setSelectedEpisodeId(null)

    if (contentType === 'series') {
      return
    }

    playXtreamStream(contentType, item)
  }

  useEffect(() => {
    if (!connectedProfile) {
      setSelectedCategoryId('')
      setSelectedItem(null)
      setSelectedEpisodeId(null)
    }
  }, [connectedProfile])

  return (
    <section className="route-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Xtream</p>
          <h2>Provider Browser</h2>
        </div>
        <div className="tab-row">
          <Link to="/xtream/live" className="tab" activeProps={{ className: 'tab active' }}>
            LIVE
          </Link>
          <Link to="/xtream/vod" className="tab" activeProps={{ className: 'tab active' }}>
            VOD
          </Link>
          <Link to="/xtream/series" className="tab" activeProps={{ className: 'tab active' }}>
            SERIES
          </Link>
        </div>
      </div>

      <div className="control-grid">
        <section className="control-panel inset-panel">
          <h3>Provider Access</h3>
          <form className="stream-form" onSubmit={handleConnect}>
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
                    output: event.target.value as typeof current.output,
                  }))
                }>
                <option value="m3u8">m3u8</option>
                <option value="ts">ts</option>
              </select>
            </label>

            <div className="actions">
              <button type="submit" disabled={connectMutation.isPending}>
                {connectMutation.isPending ? 'Connecting...' : 'Connect provider'}
              </button>
              <button type="button" className="secondary" onClick={disconnectXtream}>
                Disconnect
              </button>
            </div>
          </form>

          <div className="notes">
            <p>{connectionStatus}</p>
            <p>Settings persist in local storage. Credentials are still plain-text in the renderer.</p>
          </div>
        </section>

        <section className="control-panel inset-panel">
          <h3>{contentType.toUpperCase()} Library</h3>
          <div className="library-grid">
            <div className="library-column">
              <h4>Categories</h4>
              <div className="list-panel">
                {categoriesQuery.isLoading && <p className="empty-state">Loading categories...</p>}
                {categoriesQuery.isError && (
                  <p className="empty-state">{categoriesQuery.error instanceof Error ? categoriesQuery.error.message : 'Failed to load categories'}</p>
                )}
                {(categoriesQuery.data ?? []).map(category => (
                  <button
                    key={category.category_id}
                    type="button"
                    className={category.category_id === selectedCategoryId ? 'list-item active' : 'list-item'}
                    onClick={() => setSelectedCategoryId(category.category_id)}>
                    <span>{category.category_name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="library-column">
              <h4>{contentType === 'series' ? 'Series' : 'Streams'}</h4>
              <div className="list-panel">
                {itemsQuery.isLoading && <p className="empty-state">Loading items...</p>}
                {itemsQuery.isError && (
                  <p className="empty-state">{itemsQuery.error instanceof Error ? itemsQuery.error.message : 'Failed to load content'}</p>
                )}
                {(itemsQuery.data ?? []).map(item => (
                  <button
                    key={`${item.stream_id ?? item.series_id ?? item.name}`}
                    type="button"
                    className={selectedItem === item ? 'list-item active' : 'list-item'}
                    onClick={() => handleSelectItem(item)}>
                    <span>{item.name ?? item.title ?? 'Untitled'}</span>
                    <small>{item.container_extension ?? 'stream'}</small>
                  </button>
                ))}
              </div>
            </div>

            <div className="library-column">
              <h4>{contentType === 'series' ? 'Episodes' : 'Details'}</h4>
              <div className="list-panel detail-panel">
                {!connectedProfile && (
                  <p className="empty-state">Connect a provider to browse the library.</p>
                )}

                {connectedProfile && contentType !== 'series' && !selectedItem && (
                  <p className="empty-state">Select a stream to load it in the player.</p>
                )}

                {contentType !== 'series' && selectedItem && (
                  <>
                    <strong>{selectedItem.name ?? selectedItem.title}</strong>
                    <p>{selectedItem.plot ?? 'No metadata available from the provider.'}</p>
                  </>
                )}

                {contentType === 'series' && seriesEpisodesQuery.isLoading && (
                  <p className="empty-state">Loading episodes...</p>
                )}

                {contentType === 'series' && seriesEpisodesQuery.isError && (
                  <p className="empty-state">{seriesEpisodesQuery.error instanceof Error ? seriesEpisodesQuery.error.message : 'Failed to load episodes'}</p>
                )}

                {contentType === 'series' && (seriesEpisodesQuery.data ?? []).map(episode => (
                  <button
                    key={episode.id}
                    type="button"
                    className={episode.id === selectedEpisodeId ? 'list-item active' : 'list-item'}
                    onClick={() => {
                      setSelectedEpisodeId(episode.id)
                      playEpisode(episode)
                    }}>
                    <span>{episode.title}</span>
                    <small>{episode.info?.duration ?? episode.containerExtension}</small>
                  </button>
                ))}

                {contentType === 'series' && selectedItem && !seriesEpisodesQuery.isLoading && (seriesEpisodesQuery.data?.length ?? 0) === 0 && (
                  <p className="empty-state">No episodes were returned for this series.</p>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </section>
  )
}
