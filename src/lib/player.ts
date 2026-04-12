export type SourceKind = 'hls' | 'mpegts' | 'native'

export function isHlsSource(url: string) {
  return /\.m3u8($|\?)/i.test(url)
}

export function isMpegtsSource(url: string) {
  return /\.ts($|\?)/i.test(url)
}

export function getSourceKind(url: string): SourceKind {
  if (isHlsSource(url)) {
    return 'hls'
  }

  if (isMpegtsSource(url)) {
    return 'mpegts'
  }

  return 'native'
}
