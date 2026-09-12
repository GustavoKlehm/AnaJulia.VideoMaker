const WINDOW_MS = 60 * 60 * 1000
const MAX_REQUESTS = 20

export type RateStore = Map<string, number[]>

const defaultStore: RateStore = new Map()

export function allowAssistenteRequest(
  ip: string,
  now = Date.now(),
  store: RateStore = defaultStore,
): boolean {
  const recent = (store.get(ip) ?? []).filter((stamp) => now - stamp < WINDOW_MS)
  if (recent.length >= MAX_REQUESTS) {
    store.set(ip, recent)
    return false
  }
  recent.push(now)
  store.set(ip, recent)
  return true
}
