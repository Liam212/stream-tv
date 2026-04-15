import { memo, useEffect, useMemo, useState } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Card, CardDescription } from '@/components/ui/card'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import RouteLayout from '@/components/ui/layout'
import { cn } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAppStore } from '@/store/app-store'
import {
  buildXtreamStreamUrl,
  getXtreamCategories,
  getXtreamShortEpg,
  getXtreamSimpleEpg,
  getXtreamStreams,
  type XtreamEpgEntry,
  type XtreamStream,
} from '@/xtream'

const ALL_GROUPS_ID = 'all'
const GUIDE_WINDOW_HOURS = 4
const GUIDE_SLOT_MINUTES = 30
const GUIDE_SLOT_WIDTH = 168
const GUIDE_CHANNEL_LIMIT = 40
const CHANNEL_COLUMN_WIDTH = 220

type TimelineSlot = {
  id: string
  label: string
  startMs: number
}

type GuideBlock = {
  id: string
  title: string
  startLabel: string
  endLabel: string
  description: string
  left: number
  width: number
  isCurrent: boolean
}

type GuideRow = {
  channel: XtreamStream
  epg: XtreamEpgEntry[]
  isLoading: boolean
  isError: boolean
}

function getProfileKey(
  profile: ReturnType<typeof useAppStore.getState>['connectedProfile'],
) {
  if (!profile) {
    return 'disconnected'
  }

  return `${profile.baseUrl}|${profile.username}|${profile.password}|${profile.output}`
}

function startOfTimelineWindow(date = new Date()) {
  const next = new Date(date)
  next.setSeconds(0, 0)
  next.setMinutes(next.getMinutes() - (next.getMinutes() % GUIDE_SLOT_MINUTES))
  return next.getTime()
}

function createTimelineSlots(windowStartMs: number) {
  return Array.from(
    { length: (GUIDE_WINDOW_HOURS * 60) / GUIDE_SLOT_MINUTES },
    (_, index): TimelineSlot => {
      const slotStartMs = windowStartMs + index * GUIDE_SLOT_MINUTES * 60 * 1000

      return {
        id: `${slotStartMs}`,
        label: new Date(slotStartMs).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        startMs: slotStartMs,
      }
    },
  )
}

function getEntryStartMs(entry: XtreamEpgEntry) {
  if (entry.startTimestamp) {
    return entry.startTimestamp * 1000
  }

  const parsed = Date.parse(entry.start)
  return Number.isNaN(parsed) ? null : parsed
}

function getEntryEndMs(entry: XtreamEpgEntry) {
  if (entry.endTimestamp) {
    return entry.endTimestamp * 1000
  }

  const parsed = Date.parse(entry.end)
  return Number.isNaN(parsed) ? null : parsed
}

function formatGuideTime(entry: XtreamEpgEntry) {
  const startMs = getEntryStartMs(entry)
  if (startMs) {
    return new Date(startMs).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return entry.start
}

function formatGuideTimeLabel(timestampMs: number | null, fallback: string) {
  if (timestampMs) {
    return new Date(timestampMs).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return fallback
}

function buildGuideBlocks(
  epg: XtreamEpgEntry[],
  windowStartMs: number,
  windowEndMs: number,
) {
  const windowDuration = windowEndMs - windowStartMs
  const now = Date.now()

  return epg
    .map((entry): GuideBlock | null => {
      const startMs = getEntryStartMs(entry)
      const endMs = getEntryEndMs(entry)
      if (
        !startMs ||
        !endMs ||
        endMs <= windowStartMs ||
        startMs >= windowEndMs
      ) {
        return null
      }

      const clippedStartMs = Math.max(startMs, windowStartMs)
      const clippedEndMs = Math.min(endMs, windowEndMs)
      console.log('Entry:', entry.title, {
        startMs,
        endMs,
        clippedStartMs,
        clippedEndMs,
      })

      const left = ((clippedStartMs - windowStartMs) / windowDuration) * 100
      const width = Math.max(
        ((clippedEndMs - clippedStartMs) / windowDuration) * 100,
        1,
      )

      return {
        id: entry.id,
        title: entry.title || 'Untitled programme',
        startLabel: formatGuideTime(entry),
        endLabel: formatGuideTimeLabel(endMs, entry.end),
        description: entry.description || '',
        left,
        width,
        isCurrent: now >= startMs && now < endMs,
      }
    })
    .filter((block): block is GuideBlock => block !== null)
}

const GuideTimelineRow = memo(function GuideTimelineRow({
  row,
  timelineWidth,
  windowStartMs,
  windowEndMs,
  isActive,
  onPlay,
}: {
  row: GuideRow
  timelineWidth: number
  windowStartMs: number
  windowEndMs: number
  isActive: boolean
  onPlay: (channel: XtreamStream) => void
}) {
  const blocks = useMemo(
    () => buildGuideBlocks(row.epg, windowStartMs, windowEndMs),
    [row.epg, windowStartMs, windowEndMs],
  )

  return (
    <TableRow
      className={cn(
        'border-border/60 hover:bg-transparent',
        isActive && 'bg-amber-400/5',
      )}>
      <TableCell
        className={cn(
          'sticky left-0 z-10 border-r border-border/60 bg-slate-950 p-0',
          isActive && 'bg-amber-400/10',
        )}
        style={{ width: CHANNEL_COLUMN_WIDTH, minWidth: CHANNEL_COLUMN_WIDTH }}>
        <button
          type="button"
          className={cn(
            'flex w-full items-center gap-3 px-3 py-3 text-left hover:cursor-pointer hover:bg-muted/40',
            isActive && 'border-l-2 border-amber-400 bg-amber-400/10',
          )}
          onClick={() => onPlay(row.channel)}>
          {row.channel.stream_icon ? (
            <img
              className="size-10 shrink-0 rounded-md bg-muted/40 object-contain p-1 bg-gray-100"
              src={row.channel.stream_icon}
              alt={row.channel.name ?? row.channel.title ?? 'Channel logo'}
            />
          ) : (
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold text-muted-foreground">
              {(row.channel.name ?? row.channel.title ?? '?')
                .slice(0, 2)
                .toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">
              {row.channel.name ?? row.channel.title ?? 'Untitled'}
            </p>
          </div>
        </button>
      </TableCell>

      <TableCell className="p-0">
        <div
          className={cn(
            'relative h-20 bg-slate-950/70',
            isActive && 'bg-amber-400/5',
          )}
          style={{ width: timelineWidth, minWidth: timelineWidth }}>
          {Array.from({ length: GUIDE_WINDOW_HOURS * 2 - 1 }, (_, index) => (
            <div
              key={index}
              className="pointer-events-none absolute inset-y-0 border-r border-border/40"
              style={{ left: `${(index + 1) * GUIDE_SLOT_WIDTH}px` }}
            />
          ))}

          {row.isLoading && (
            <div className="flex h-full items-center px-4 text-sm text-muted-foreground">
              Loading guide...
            </div>
          )}

          {!row.isLoading && row.isError && (
            <div className="flex h-full items-center px-4 text-sm text-muted-foreground">
              EPG unavailable
            </div>
          )}

          {!row.isLoading && !row.isError && blocks.length === 0 && (
            <div className="flex h-full items-center px-4 text-sm text-muted-foreground">
              No programme data in this window
            </div>
          )}

          {!row.isLoading &&
            !row.isError &&
            blocks.map(block => (
              <HoverCard key={block.id} openDelay={120} closeDelay={80}>
                <HoverCardTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      'absolute top-2 bottom-2 overflow-hidden rounded-md border px-3 py-2 text-left',
                      block.isCurrent
                        ? 'border-primary/50 bg-primary/20 text-primary-foreground'
                        : 'border-border bg-card/90 text-card-foreground',
                    )}
                    style={{
                      left: `${block.left}%`,
                      width: `${block.width}%`,
                    }}
                    title={`${block.title} (${block.startLabel} - ${block.endLabel})`}>
                    <p className="truncate text-xs font-medium text-muted-foreground">
                      {block.startLabel}
                    </p>
                    <p className="truncate text-sm font-semibold">
                      {block.title}
                    </p>
                  </button>
                </HoverCardTrigger>
                <HoverCardContent
                  align="start"
                  className="w-80 border-border/80 bg-slate-950/98 text-slate-100">
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                        Programme
                      </p>
                      <p className="text-sm font-semibold text-slate-50">
                        {block.title}
                      </p>
                    </div>
                    <div className="text-sm text-slate-300">
                      {block.startLabel} - {block.endLabel}
                    </div>
                    {block.description && (
                      <p className="text-sm leading-6 text-slate-300">
                        {block.description}
                      </p>
                    )}
                  </div>
                </HoverCardContent>
              </HoverCard>
            ))}
        </div>
      </TableCell>
    </TableRow>
  )
})

export function TvGuidePage() {
  const connectedProfile = useAppStore(state => state.connectedProfile)
  const activeUrl = useAppStore(state => state.activeUrl)
  const playXtreamStream = useAppStore(state => state.playXtreamStream)
  const [selectedCategoryId, setSelectedCategoryId] = useState(ALL_GROUPS_ID)
  const connectedProfileKey = useMemo(
    () => getProfileKey(connectedProfile),
    [connectedProfile],
  )
  const windowStartMs = useMemo(() => startOfTimelineWindow(), [])
  const windowEndMs = windowStartMs + GUIDE_WINDOW_HOURS * 60 * 60 * 1000
  const timelineSlots = useMemo(
    () => createTimelineSlots(windowStartMs),
    [windowStartMs],
  )
  const timelineWidth = timelineSlots.length * GUIDE_SLOT_WIDTH

  const categoriesQuery = useQuery({
    queryKey: ['guide', 'categories', connectedProfileKey],
    queryFn: () => getXtreamCategories(connectedProfile!, 'live'),
    enabled: !!connectedProfile,
  })

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

  const visibleChannels = useMemo(
    () => (channelsQuery.data ?? []).slice(0, GUIDE_CHANNEL_LIMIT),
    [channelsQuery.data],
  )

  const epgQueries = useQueries({
    queries: visibleChannels.map(channel => ({
      queryKey: ['guide', 'epg', connectedProfileKey, channel.stream_id],
      queryFn: async () => {
        const streamId = channel.stream_id
        if (!streamId) {
          return [] as XtreamEpgEntry[]
        }

        const shortEpg = await getXtreamShortEpg(
          connectedProfile!,
          streamId,
          12,
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

  const guideRows = useMemo<GuideRow[]>(
    () =>
      visibleChannels.map((channel, index) => ({
        channel,
        epg: epgQueries[index]?.data ?? [],
        isLoading: epgQueries[index]?.isLoading ?? false,
        isError: epgQueries[index]?.isError ?? false,
      })),
    [visibleChannels, epgQueries],
  )

  const activeStreamId = useMemo(() => {
    if (!connectedProfile || !activeUrl) {
      return null
    }

    const activeChannel = visibleChannels.find(channel => {
      const streamUrl = buildXtreamStreamUrl(connectedProfile, 'live', channel)
      return streamUrl === activeUrl
    })

    return activeChannel?.stream_id ?? null
  }, [activeUrl, connectedProfile, visibleChannels])

  return (
    <RouteLayout direction="column" className="gap-4 bg-transparent p-4">
      {!connectedProfile && (
        <Card className="border-border/60 bg-card/80">
          <CardDescription className="px-4 text-sm">
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
          <div className="flex flex-wrap gap-2">
            {groups.map(group => (
              <Button
                key={group.category_id}
                type="button"
                size="sm"
                variant={
                  group.category_id === selectedCategoryId
                    ? 'default'
                    : 'outline'
                }
                onClick={() => setSelectedCategoryId(group.category_id)}>
                {group.category_name}
              </Button>
            ))}
          </div>

          <Card className="gap-0 overflow-hidden border-border/60 bg-slate-950/95 py-0 text-slate-100">
            <div className="border-b border-border/60 px-4 py-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-50">
                    TV Guide
                  </p>
                  <p className="text-sm text-slate-400">
                    {channelsQuery.isLoading
                      ? 'Loading live channels...'
                      : channelsQuery.isError
                        ? 'Unable to load live channels'
                        : `Showing ${guideRows.length} channel${guideRows.length === 1 ? '' : 's'} in a ${GUIDE_WINDOW_HOURS}-hour window`}
                  </p>
                </div>
                <p className="text-xs text-slate-500">
                  {channelsQuery.data &&
                  channelsQuery.data.length > GUIDE_CHANNEL_LIMIT
                    ? `Displaying ${GUIDE_CHANNEL_LIMIT}`
                    : `Window ${new Date(windowStartMs).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })} - ${new Date(windowEndMs).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}`}
                </p>
              </div>
            </div>

            <Table className="table-fixed">
              <TableHeader>
                <TableRow className="border-border/60 bg-muted/20 hover:bg-muted/20">
                  <TableHead
                    className="sticky left-0 z-20 border-r border-border/60 bg-slate-950 text-slate-300"
                    style={{
                      width: CHANNEL_COLUMN_WIDTH,
                      minWidth: CHANNEL_COLUMN_WIDTH,
                    }}>
                    Channel
                  </TableHead>
                  <TableHead className="p-0">
                    <div
                      className="grid border-l border-border/60 bg-slate-950"
                      style={{
                        width: timelineWidth,
                        minWidth: timelineWidth,
                        gridTemplateColumns: `repeat(${timelineSlots.length}, ${GUIDE_SLOT_WIDTH}px)`,
                      }}>
                      {timelineSlots.map(slot => (
                        <div
                          key={slot.id}
                          className="border-r border-border/40 px-3 py-2 text-xs font-medium text-slate-400">
                          {slot.label}
                        </div>
                      ))}
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {channelsQuery.isLoading && (
                  <TableRow>
                    <TableCell
                      colSpan={2}
                      className="h-24 text-center text-muted-foreground">
                      Loading live channels...
                    </TableCell>
                  </TableRow>
                )}

                {channelsQuery.isError && (
                  <TableRow>
                    <TableCell
                      colSpan={2}
                      className="h-24 text-center text-muted-foreground">
                      {channelsQuery.error instanceof Error
                        ? channelsQuery.error.message
                        : 'Failed to load channels'}
                    </TableCell>
                  </TableRow>
                )}

                {!channelsQuery.isLoading &&
                  !channelsQuery.isError &&
                  guideRows.map(row => (
                    <GuideTimelineRow
                      key={`${row.channel.stream_id ?? row.channel.name}`}
                      row={row}
                      timelineWidth={timelineWidth}
                      windowStartMs={windowStartMs}
                      windowEndMs={windowEndMs}
                      isActive={row.channel.stream_id === activeStreamId}
                      onPlay={channel => playXtreamStream('live', channel)}
                    />
                  ))}

                {!channelsQuery.isLoading &&
                  !channelsQuery.isError &&
                  guideRows.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={2}
                        className="h-24 text-center text-muted-foreground">
                        No live channels were returned for this selection.
                      </TableCell>
                    </TableRow>
                  )}
              </TableBody>
            </Table>
          </Card>
        </>
      )}
    </RouteLayout>
  )
}
