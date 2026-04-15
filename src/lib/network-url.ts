const HTTP_PROTOCOLS = new Set(['http:', 'https:'])

function parseUrl(value: string) {
  try {
    return new URL(value.trim())
  } catch {
    return null
  }
}

export function isHttpUrl(value: string) {
  const parsed = parseUrl(value)
  return parsed ? HTTP_PROTOCOLS.has(parsed.protocol) : false
}

export function toHttpUrlOrEmpty(value: string) {
  return isHttpUrl(value) ? value.trim() : ''
}
