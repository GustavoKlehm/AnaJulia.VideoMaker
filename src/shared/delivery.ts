/** Regras das entregas de vídeo, usadas pela API e pelas telas. */

export const DELIVERY_BUCKET = 'entregas'

/** Mesmo valor do bucket. O limite global do Supabase pode ser menor. */
export const MAX_FILE_BYTES = 5 * 1024 ** 3

/** Dias depois do vencimento até a limpeza apagar os arquivos (tempo para a Ana prorrogar). */
export const CLEANUP_GRACE_DAYS = 7

const TYPES: Record<string, string> = {
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
}

export const ACCEPTED_EXTENSIONS = Object.keys(TYPES).map((ext) => `.${ext}`)

/** O tipo vem da extensão, não do navegador (que às vezes manda vazio ou genérico). */
export function fileTypeFor(name: string): string | null {
  const ext = /\.([a-z0-9]+)$/i.exec(name.trim())?.[1]?.toLowerCase()
  return ext ? (TYPES[ext] ?? null) : null
}

export function isVideoType(tipo: string): boolean {
  return tipo.startsWith('video/')
}

/** "Stories Festa 01.MOV" → "stories-festa-01.mov" (sem acento, seguro para o Storage). */
export function safeFileName(name: string): string {
  const trimmed = name.trim()
  const dot = trimmed.lastIndexOf('.')
  const base = dot > 0 ? trimmed.slice(0, dot) : trimmed
  const ext = dot > 0 ? trimmed.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, '') : ''
  const clean =
    base
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80)
      .replace(/-+$/g, '') || 'arquivo'
  return ext ? `${clean}.${ext}` : clean
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !ISO_DATE.test(value)) return false
  const date = new Date(`${value}T12:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

/** Data de hoje no horário de Brasília, no formato AAAA-MM-DD. */
export function todayInBrazil(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

export function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

/** Escolha de validade nas telas do estúdio. */
export type Validity = { preset: 'none' | '7' | '30' | '90' | 'custom'; date: string }

export function validityToDate(v: Validity): string | null {
  if (v.preset === 'none') return null
  if (v.preset === 'custom') return isIsoDate(v.date) ? v.date : null
  return addDays(todayInBrazil(), Number(v.preset))
}

export function validityFromDate(expiraEm: string | null): Validity {
  return expiraEm ? { preset: 'custom', date: expiraEm } : { preset: 'none', date: '' }
}

export type DeliveryState = 'ativa' | 'desativada' | 'expirada' | 'apagada'

export function deliveryState(
  d: { ativo: boolean; expira_em: string | null; arquivos_apagados_em: string | null },
  today: string,
): DeliveryState {
  if (d.arquivos_apagados_em) return 'apagada'
  if (d.expira_em && d.expira_em < today) return 'expirada'
  if (!d.ativo) return 'desativada'
  return 'ativa'
}

export const DELIVERY_STATE_LABEL: Record<DeliveryState, string> = {
  ativa: 'No ar',
  desativada: 'Link desligado',
  expirada: 'Vencida',
  apagada: 'Arquivos apagados',
}

/** Entregas vencidas antes desta data têm os arquivos apagados pela limpeza. */
export function cleanupCutoff(today: string): string {
  return addDays(today, -CLEANUP_GRACE_DAYS)
}

export type DeliveryInput = {
  titulo?: string
  descricao?: string
  dataEvento?: string | null
  expiraEm?: string | null
  ativo?: boolean
}

type Result<T> = { ok: true; value: T } | { ok: false; error: string }

/** Valida criação (`partial = false`, título obrigatório) ou edição (só os campos enviados). */
export function parseDeliveryInput(raw: unknown, partial = false): Result<DeliveryInput> {
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'Envie os dados da entrega como JSON.' }
  const b = raw as Record<string, unknown>
  const value: DeliveryInput = {}

  if (b.titulo !== undefined || !partial) {
    const titulo = typeof b.titulo === 'string' ? b.titulo.trim() : ''
    if (!titulo || titulo.length > 200) return { ok: false, error: 'Dê um título para a entrega (até 200 caracteres).' }
    value.titulo = titulo
  }

  if (b.descricao !== undefined) {
    if (typeof b.descricao !== 'string' || b.descricao.length > 4000) {
      return { ok: false, error: 'A mensagem pode ter até 4000 caracteres.' }
    }
    value.descricao = b.descricao.trim()
  }

  for (const [key, label] of [
    ['dataEvento', 'Data do evento'],
    ['expiraEm', 'Validade'],
  ] as const) {
    const v = b[key]
    if (v === undefined) continue
    if (v === null || v === '') {
      value[key] = null
    } else if (isIsoDate(v)) {
      value[key] = v
    } else {
      return { ok: false, error: `${label}: use uma data no formato AAAA-MM-DD.` }
    }
  }

  if (b.ativo !== undefined) {
    if (typeof b.ativo !== 'boolean') return { ok: false, error: 'ativo precisa ser true ou false.' }
    value.ativo = b.ativo
  }

  return { ok: true, value }
}

export function isDeliveryToken(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{20,64}$/.test(value)
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(bytes < 10 * 1024 ** 2 ? 1 : 0).replace('.', ',')} MB`
  return `${(bytes / 1024 ** 3).toFixed(1).replace('.', ',')} GB`
}

/** "2026-12-03" → "3/12/2026" */
export function formatDateBr(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${Number(d)}/${Number(m)}/${y}`
}

export function deliveryMessage(input: { titulo: string; link: string; expiraEm: string | null }): string {
  return [
    `Oi! Seus vídeos de "${input.titulo}" estão prontos 🎬`,
    `É só abrir para assistir e baixar: ${input.link}`,
    input.expiraEm ? `O link fica no ar até ${formatDateBr(input.expiraEm)}. Baixe antes dessa data.` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

// ---------------------------------------------------------------------------
// Capas dos vídeos e atualização automática
// ---------------------------------------------------------------------------

const STILL_SUFFIX = /[-_ ]still$/i

/** "IMG_1234.MOV" → "img_1234" (nome original, sem extensão, minúsculo). */
function baseOf(nome: string): string {
  const trimmed = nome.trim()
  const dot = trimmed.lastIndexOf('.')
  return (dot > 0 ? trimmed.slice(0, dot) : trimmed).toLowerCase()
}

/**
 * Casa cada vídeo com a foto "-still" de mesmo nome ("IMG_1234.MOV" + "IMG_1234-still.jpeg"), que vira a capa.
 * Devolve vídeo → still. O casamento é pelo nome original, porque no Storage cada arquivo ganha um prefixo.
 */
export function pairStills<T extends { id: string; nome: string; tipo: string }>(files: T[]): Map<string, T> {
  const stills = new Map<string, T>()
  for (const f of files) {
    if (isVideoType(f.tipo) || !f.tipo.startsWith('image/')) continue
    const base = baseOf(f.nome)
    if (STILL_SUFFIX.test(base)) stills.set(base.replace(STILL_SUFFIX, ''), f)
  }
  const pairs = new Map<string, T>()
  if (stills.size === 0) return pairs
  for (const f of files) {
    if (!isVideoType(f.tipo)) continue
    const still = stills.get(baseOf(f.nome))
    if (still) pairs.set(f.id, still)
  }
  return pairs
}

/** Horas depois de criada em que a página do cliente ainda confere arquivos novos sozinha. */
const LIVE_WINDOW_MS = 24 * 60 * 60 * 1000

/**
 * A página do cliente só se atualiza sozinha enquanto a Ana pode estar subindo stories: no dia do evento
 * ou nas primeiras 24 h da entrega. Fora disso, só com o botão "Atualizar".
 */
export function isDeliveryLive(
  d: { dataEvento: string | null; criadaEm: string },
  now: Date = new Date(),
): boolean {
  if (d.dataEvento && d.dataEvento === todayInBrazil(now)) return true
  const created = Date.parse(d.criadaEm)
  return Number.isFinite(created) && now.getTime() - created < LIVE_WINDOW_MS
}
