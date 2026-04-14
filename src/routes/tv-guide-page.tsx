import { useEffect, useMemo, useState } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useAppStore } from '@/store/app-store'
import {
  getXtreamCategories,
  getXtreamShortEpg,
  getXtreamSimpleEpg,
  getXtreamStreams,
  type XtreamEpgEntry,
  type XtreamStream,
} from '@/xtream'
import RouteLayout from '@/components/ui/layout'
import { Card, CardDescription } from '@/components/ui/card'

const ALL_GROUPS_ID = 'all'

function getProfileKey(
  profile: ReturnType<typeof useAppStore.getState>['connectedProfile'],
) {
  if (!profile) {
    return 'disconnected'
  }

  return `${profile.baseUrl}|${profile.username}|${profile.password}|${profile.output}`
}

function formatGuideTime(entry: XtreamEpgEntry) {
  const timestamp = entry.startTimestamp
  if (timestamp) {
    return new Date(timestamp * 1000).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return entry.start
}

export function TvGuidePage() {
  const connectedProfile = useAppStore(state => state.connectedProfile)
  const playXtreamStream = useAppStore(state => state.playXtreamStream)
  const [selectedCategoryId, setSelectedCategoryId] = useState(ALL_GROUPS_ID)
  const connectedProfileKey = useMemo(
    () => getProfileKey(connectedProfile),
    [connectedProfile],
  )

  const categoriesQuery = useQuery({
    queryKey: ['guide', 'categories', connectedProfileKey],
    queryFn: () => getXtreamCategories(connectedProfile!, 'live'),
    enabled: !!connectedProfile,
  })

  useEffect(() => {
    if (!connectedProfile) {
      setSelectedCategoryId(ALL_GROUPS_ID)
    }
  }, [connectedProfile])

  const groups = useMemo(() => {
    const categories = categoriesQuery.data ?? []

    return [
      {
        category_id: ALL_GROUPS_ID,
        category_name: 'All groups',
      },
      ...categories,
    ]
  }, [categoriesQuery.data])

  const channelsQuery = useQuery({
    queryKey: ['guide', 'channels', connectedProfileKey, selectedCategoryId],
    queryFn: () =>
      getXtreamStreams(
        connectedProfile!,
        'live',
        selectedCategoryId === ALL_GROUPS_ID ? undefined : selectedCategoryId,
      ),
    enabled: !!connectedProfile,
  })

  const channels = channelsQuery.data ?? []

  const epgQueries = useQueries({
    queries: channels.map(channel => ({
      queryKey: ['guide', 'epg', connectedProfileKey, channel.stream_id],
      queryFn: async () => {
        const streamId = channel.stream_id
        if (!streamId) {
          return [] as XtreamEpgEntry[]
        }

        const shortEpg = await getXtreamShortEpg(
          connectedProfile!,
          streamId,
          10,
        )
        if (shortEpg.length > 0) {
          return shortEpg
        }

        return getXtreamSimpleEpg(connectedProfile!, streamId)
      },
      enabled: !!connectedProfile && !!channel.stream_id,
      staleTime: 60_000,
    })),
  })

  const guideRows = channels.map((channel, index) => ({
    channel,
    epg: epgQueries[index]?.data ?? [],
    isLoading: epgQueries[index]?.isLoading ?? false,
    isError: epgQueries[index]?.isError ?? false,
  }))

  return (
    <RouteLayout>
      {!connectedProfile && (
        <Card className="bg-gray-900 p-4">
          <CardDescription className="text-white">
            No provider is connected. Open{' '}
            <Link to="/settings" className="inline-link">
              Settings
            </Link>{' '}
            to configure Xtream access.
          </CardDescription>
        </Card>
      )}

      {connectedProfile && (
        <>
          <section className="control-panel guide-filter-panel">
            <div className="guide-pill-row">
              {groups.map(group => (
                <button
                  key={group.category_id}
                  type="button"
                  className={
                    group.category_id === selectedCategoryId
                      ? 'tab active'
                      : 'tab'
                  }
                  onClick={() => setSelectedCategoryId(group.category_id)}>
                  {group.category_name}
                </button>
              ))}
            </div>
          </section>

          <section className="control-panel guide-table-panel">
            <div className="guide-table-header">
              <div className="guide-table-channel-head">Channel</div>
              <div className="guide-table-program-head">Programmes</div>
            </div>

            <div className="guide-table">
              {channelsQuery.isLoading && (
                <p className="empty-state">
                  Loading live channels and EPG data...
                </p>
              )}

              {channelsQuery.isError && (
                <p className="empty-state">
                  {channelsQuery.error instanceof Error
                    ? channelsQuery.error.message
                    : 'Failed to load channels'}
                </p>
              )}

              {guideRows.map(({ channel, epg, isLoading, isError }) => (
                <article
                  key={`${channel.stream_id ?? channel.name}`}
                  className="guide-table-row">
                  <button
                    type="button"
                    className="guide-table-channel"
                    onClick={() => playXtreamStream('live', channel)}>
                    <div className="guide-table-logo">
                      {channel.stream_icon ? (
                        <img
                          className="channel-logo"
                          src={channel.stream_icon}
                          alt={channel.name ?? channel.title ?? 'Channel logo'}
                        />
                      ) : (
                        <div className="channel-logo-fallback">
                          {(channel.name ?? channel.title ?? '?')
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="guide-table-channel-copy">
                      <strong>
                        {channel.name ?? channel.title ?? 'Untitled'}
                      </strong>
                    </div>
                  </button>

                  <div className="guide-table-programmes">
                    {isLoading && (
                      <p className="empty-state">Loading guide...</p>
                    )}
                    {isError && !isLoading && (
                      <p className="empty-state">
                        EPG unavailable for this channel.
                      </p>
                    )}

                    {!isLoading &&
                      !isError &&
                      epg.map((entry, index) => (
                        <article
                          key={entry.id}
                          className={
                            index === 0
                              ? 'guide-program-card active'
                              : 'guide-program-card'
                          }>
                          <span className="guide-program-time">
                            {formatGuideTime(entry)}
                          </span>
                          <strong>{entry.title || 'Untitled programme'}</strong>
                        </article>
                      ))}

                    {!isLoading && !isError && epg.length === 0 && (
                      <p className="empty-state">No EPG</p>
                    )}
                  </div>
                </article>
              ))}

              {!channelsQuery.isLoading && guideRows.length === 0 && (
                <p className="empty-state">
                  No live channels were returned for this selection.
                </p>
              )}
            </div>
          </section>
        </>
      )}
    </RouteLayout>
  )
}
