export type XtreamContentType = 'live' | 'vod' | 'series'

export type XtreamProfile = {
  baseUrl: string
  username: string
  password: string
  output: 'm3u8' | 'ts'
}

export type XtreamCategory = {
  category_id: string
  category_name: string
  parent_id?: number
}

export type XtreamStream = {
  stream_id?: number
  series_id?: number
  name?: string
  title?: string
  stream_icon?: string
  cover?: string
  container_extension?: string
  category_id?: string
  plot?: string
}

export type XtreamEpisode = {
  id: number
  title: string
  containerExtension: string
  episodeNum?: number
  info?: {
    duration?: string
    plot?: string
  }
}

export type XtreamAuthResponse = {
  user_info?: {
    auth?: number
    status?: string
    exp_date?: string
    active_cons?: string
    max_connections?: string
  }
  server_info?: {
    url?: string
    port?: string
    https_port?: string
    server_protocol?: string
    timezone?: string
  }
}

export type XtreamSeriesInfo = {
  info?: {
    name?: string
    plot?: string
    cover?: string
  }
  episodes?: Record<string, unknown>
}

const actionMap: Record<XtreamContentType, string> = {
  live: 'get_live_streams',
  vod: 'get_vod_streams',
  series: 'get_series',
}

const categoryMap: Record<XtreamContentType, string> = {
  live: 'get_live_categories',
  vod: 'get_vod_categories',
  series: 'get_series_categories',
}

export function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.trim().replace(/\/+$/, '')
}

function toArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) {
    return value as T[]
  }

  if (value && typeof value === 'object') {
    return Object.values(value) as T[]
  }

  return []
}

function createPlayerApiUrl(profile: XtreamProfile, params: Record<string, string>) {
  const url = new URL('player_api.php', `${normalizeBaseUrl(profile.baseUrl)}/`)
  url.searchParams.set('username', profile.username)
  url.searchParams.set('password', profile.password)

  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      url.searchParams.set(key, value)
    }
  })

  return url.toString()
}

async function fetchJson<T>(profile: XtreamProfile, params: Record<string, string> = {}) {
  return window.xtreamApi.request(createPlayerApiUrl(profile, params)) as Promise<T>
}

export async function authenticateXtream(profile: XtreamProfile) {
  return fetchJson<XtreamAuthResponse>(profile)
}

export async function getXtreamCategories(profile: XtreamProfile, contentType: XtreamContentType) {
  const categories = await fetchJson<unknown>(profile, { action: categoryMap[contentType] })
  return toArray<XtreamCategory>(categories)
}

export async function getXtreamStreams(
  profile: XtreamProfile,
  contentType: XtreamContentType,
  categoryId?: string,
) {
  const streams = await fetchJson<unknown>(profile, {
    action: actionMap[contentType],
    category_id: categoryId ?? '',
  })

  return toArray<XtreamStream>(streams)
}

export async function getXtreamSeriesInfo(profile: XtreamProfile, seriesId: number) {
  const primary = await fetchJson<XtreamSeriesInfo>(profile, {
    action: 'get_series_info',
    series_id: String(seriesId),
  })

  if (primary.episodes) {
    return primary
  }

  return fetchJson<XtreamSeriesInfo>(profile, {
    action: 'get_series_info',
    series: String(seriesId),
  })
}

export function getSeriesEpisodes(seriesInfo: XtreamSeriesInfo) {
  const seasons = toArray<Record<string, unknown>>(seriesInfo.episodes)
  const episodes: XtreamEpisode[] = []

  seasons.forEach((season) => {
    toArray<Record<string, unknown>>(season).forEach((episode) => {
      const info = episode.info as XtreamEpisode['info'] | undefined
      episodes.push({
        id: Number(episode.id),
        title: String(episode.title ?? `Episode ${episode.episode_num ?? ''}`.trim()),
        containerExtension: String(episode.container_extension ?? 'mp4'),
        episodeNum: Number(episode.episode_num ?? 0) || undefined,
        info,
      })
    })
  })

  return episodes.sort((left, right) => (left.episodeNum ?? 0) - (right.episodeNum ?? 0))
}

export function buildXtreamStreamUrl(
  profile: XtreamProfile,
  contentType: 'live' | 'vod',
  stream: XtreamStream,
) {
  const streamId = stream.stream_id

  if (!streamId) {
    throw new Error('Stream is missing a stream id')
  }

  if (contentType === 'live') {
    return `${normalizeBaseUrl(profile.baseUrl)}/live/${profile.username}/${profile.password}/${streamId}.${profile.output}`
  }

  const extension = stream.container_extension ?? 'mp4'
  return `${normalizeBaseUrl(profile.baseUrl)}/movie/${profile.username}/${profile.password}/${streamId}.${extension}`
}

export function buildXtreamEpisodeUrl(profile: XtreamProfile, episode: XtreamEpisode) {
  return `${normalizeBaseUrl(profile.baseUrl)}/series/${profile.username}/${profile.password}/${episode.id}.${episode.containerExtension}`
}
