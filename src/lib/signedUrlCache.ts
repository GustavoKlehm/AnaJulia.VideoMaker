/**
 * Cache das URLs assinadas do Storage (bucket privado `entregas`).
 *
 * Cada URL assinada tem um token diferente, e o navegador trata URL diferente como arquivo diferente: se a tela
 * trocar o `src` a cada busca, baixa tudo de novo. Aqui cada arquivo guarda a sua URL (em memória e no
 * sessionStorage da aba) até faltar pouco para ela vencer, e só então pega outra.
 */

type Entry = { url: string; validaAte: number }

/** Folga antes do vencimento: abaixo disso a URL é trocada (um vídeo começado perto do fim ainda carrega). */
const MARGIN_MS = 5 * 60 * 1000
const STORAGE_PREFIX = 'aj:url:'

const memory = new Map<string, Entry>()
const pending = new Map<string, Promise<string>>()

function readStorage(key: string): Entry | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_PREFIX + key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<Entry>
    return typeof parsed.url === 'string' && typeof parsed.validaAte === 'number'
      ? { url: parsed.url, validaAte: parsed.validaAte }
      : null
  } catch {
    return null
  }
}

function writeStorage(key: string, entry: Entry | null) {
  try {
    if (entry) window.sessionStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(entry))
    else window.sessionStorage.removeItem(STORAGE_PREFIX + key)
  } catch {
    // Aba anônima, armazenamento cheio ou bloqueado: fica só a memória.
  }
}

function parseTime(value: string | number): number {
  return typeof value === 'number' ? value : Date.parse(value)
}

/** URL ainda boa para `key`, ou null. */
export function cachedUrl(key: string, now: number = Date.now()): string | null {
  const entry = memory.get(key) ?? readStorage(key)
  if (!entry) return null
  if (entry.validaAte - now <= MARGIN_MS) {
    memory.delete(key)
    writeStorage(key, null)
    return null
  }
  memory.set(key, entry)
  return entry.url
}

export function rememberUrl(key: string, url: string, validaAte: string | number) {
  const entry = { url, validaAte: parseTime(validaAte) }
  if (!Number.isFinite(entry.validaAte)) return
  memory.set(key, entry)
  writeStorage(key, entry)
}

/**
 * Para URLs que já vieram numa lista: devolve a guardada se ainda vale (mantém o `src` estável entre buscas e
 * recargas da página) ou guarda e devolve a nova.
 */
export function stableUrl(key: string, url: string, validaAte: string | number, now: number = Date.now()): string {
  const cached = cachedUrl(key, now)
  if (cached) return cached
  rememberUrl(key, url, validaAte)
  return url
}

/** Para URLs geradas no clique: usa a guardada ou busca uma (cliques repetidos esperam a mesma busca). */
export function signedUrl(key: string, fetcher: () => Promise<{ url: string; validaAte: string }>): Promise<string> {
  const cached = cachedUrl(key)
  if (cached) return Promise.resolve(cached)
  const inFlight = pending.get(key)
  if (inFlight) return inFlight
  const request = fetcher()
    .then(({ url, validaAte }) => {
      rememberUrl(key, url, validaAte)
      return url
    })
    .finally(() => pending.delete(key))
  pending.set(key, request)
  return request
}

/** Só para testes. */
export function clearSignedUrlCache() {
  memory.clear()
  pending.clear()
}
