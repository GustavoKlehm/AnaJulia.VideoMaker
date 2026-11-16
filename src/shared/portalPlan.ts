/**
 * Formato do plano que o ExPx envia ao site e que o portal exibe.
 * A validação roda na API antes de gravar; o portal confia no que está no banco.
 */

export const PLAN_FORMATS = ['reels', 'foto', 'carrossel', 'stories', 'video'] as const
export type PlanFormat = (typeof PLAN_FORMATS)[number]

export const PLAN_STATUSES = ['previa', 'publicado'] as const
export type PlanStatus = (typeof PLAN_STATUSES)[number]

export type PlanCut = { tempo: string; cena: string; tela: string; fala: string }

export type PlanSection =
  | { tipo: 'texto'; titulo: string; texto: string }
  | { tipo: 'roteiro'; titulo: string; linhas: string[] }
  | { tipo: 'cortes'; titulo: string; cortes: PlanCut[] }
  | { tipo: 'referencia'; titulo: string; url: string; texto: string }

export type PlanItemInput = {
  id: string
  data: string
  formato: PlanFormat
  titulo: string
  selos: string[]
  secoes: PlanSection[]
}

export type PlanInput = {
  periodo: string
  titulo: string
  introducao: string
  inicio: string
  fim: string
  status: PlanStatus
  itens: PlanItemInput[]
}

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const ITEM_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,79}$/
const HEX_PATTERN = /^#[0-9a-f]{6}$/

const LIMITS = {
  titulo: 200,
  introducao: 4000,
  texto: 8000,
  linha: 2000,
  selo: 40,
  selos: 8,
  secoes: 30,
  linhas: 120,
  cortes: 80,
  itens: 120,
}

type Result<T> = { ok: true; value: T } | { ok: false; error: string }

function fail<T>(error: string): Result<T> {
  return { ok: false, error }
}

function str(value: unknown, field: string, max: number, required = true): Result<string> {
  if (value === undefined || value === null) {
    return required ? fail(`${field} é obrigatório.`) : { ok: true, value: '' }
  }
  if (typeof value !== 'string') return fail(`${field} precisa ser texto.`)
  const trimmed = value.trim()
  if (required && trimmed.length === 0) return fail(`${field} está vazio.`)
  if (trimmed.length > max) return fail(`${field} passou de ${max} caracteres.`)
  return { ok: true, value: trimmed }
}

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [y, m, d] = value.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d
}

export function isSlug(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 60 && SLUG_PATTERN.test(value)
}

export function normalizeHex(value: unknown): string | null {
  if (typeof value !== 'string') return null
  let hex = value.trim().toLowerCase()
  if (!hex.startsWith('#')) hex = `#${hex}`
  if (/^#[0-9a-f]{3}$/.test(hex)) {
    hex = `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
  }
  return HEX_PATTERN.test(hex) ? hex : null
}

function parseSection(raw: unknown, where: string): Result<PlanSection> {
  if (!raw || typeof raw !== 'object') return fail(`${where}: seção inválida.`)
  const s = raw as Record<string, unknown>
  const titulo = str(s.titulo, `${where}.titulo`, LIMITS.titulo)
  if (!titulo.ok) return titulo

  switch (s.tipo) {
    case 'texto': {
      const texto = str(s.texto, `${where}.texto`, LIMITS.texto)
      if (!texto.ok) return texto
      return { ok: true, value: { tipo: 'texto', titulo: titulo.value, texto: texto.value } }
    }
    case 'roteiro': {
      if (!Array.isArray(s.linhas) || s.linhas.length === 0 || s.linhas.length > LIMITS.linhas) {
        return fail(`${where}.linhas precisa ter de 1 a ${LIMITS.linhas} linhas.`)
      }
      const linhas: string[] = []
      for (const [i, linha] of s.linhas.entries()) {
        const r = str(linha, `${where}.linhas[${i}]`, LIMITS.linha)
        if (!r.ok) return r
        linhas.push(r.value)
      }
      return { ok: true, value: { tipo: 'roteiro', titulo: titulo.value, linhas } }
    }
    case 'cortes': {
      if (!Array.isArray(s.cortes) || s.cortes.length === 0 || s.cortes.length > LIMITS.cortes) {
        return fail(`${where}.cortes precisa ter de 1 a ${LIMITS.cortes} cortes.`)
      }
      const cortes: PlanCut[] = []
      for (const [i, corte] of s.cortes.entries()) {
        if (!corte || typeof corte !== 'object') return fail(`${where}.cortes[${i}] inválido.`)
        const c = corte as Record<string, unknown>
        const parts: Partial<PlanCut> = {}
        for (const key of ['tempo', 'cena', 'tela', 'fala'] as const) {
          const r = str(c[key], `${where}.cortes[${i}].${key}`, LIMITS.linha, false)
          if (!r.ok) return r
          parts[key] = r.value
        }
        if (!parts.cena && !parts.tela && !parts.fala) {
          return fail(`${where}.cortes[${i}] está vazio.`)
        }
        cortes.push(parts as PlanCut)
      }
      return { ok: true, value: { tipo: 'cortes', titulo: titulo.value, cortes } }
    }
    case 'referencia': {
      const url = str(s.url, `${where}.url`, 500)
      if (!url.ok) return url
      let parsed: URL
      try {
        parsed = new URL(url.value)
      } catch {
        return fail(`${where}.url não é um link válido.`)
      }
      if (parsed.protocol !== 'https:') return fail(`${where}.url precisa começar com https://.`)
      const texto = str(s.texto, `${where}.texto`, LIMITS.texto, false)
      if (!texto.ok) return texto
      return {
        ok: true,
        value: { tipo: 'referencia', titulo: titulo.value, url: parsed.toString(), texto: texto.value },
      }
    }
    default:
      return fail(`${where}.tipo precisa ser texto, roteiro, cortes ou referencia.`)
  }
}

function parseItem(raw: unknown, where: string, inicio: string, fim: string): Result<PlanItemInput> {
  if (!raw || typeof raw !== 'object') return fail(`${where}: post inválido.`)
  const it = raw as Record<string, unknown>

  if (typeof it.id !== 'string' || !ITEM_ID_PATTERN.test(it.id)) {
    return fail(`${where}.id precisa ter até 80 letras, números, ponto, hífen, dois-pontos ou _.`)
  }
  if (!isIsoDate(it.data)) return fail(`${where}.data precisa estar no formato AAAA-MM-DD.`)
  if (it.data < inicio || it.data > fim) return fail(`${where}.data está fora do período do plano.`)
  if (typeof it.formato !== 'string' || !PLAN_FORMATS.includes(it.formato as PlanFormat)) {
    return fail(`${where}.formato precisa ser ${PLAN_FORMATS.join(', ')}.`)
  }
  const titulo = str(it.titulo, `${where}.titulo`, LIMITS.titulo)
  if (!titulo.ok) return titulo

  const selos: string[] = []
  if (it.selos !== undefined) {
    if (!Array.isArray(it.selos) || it.selos.length > LIMITS.selos) {
      return fail(`${where}.selos precisa ser uma lista de até ${LIMITS.selos} itens.`)
    }
    for (const [i, selo] of it.selos.entries()) {
      const r = str(selo, `${where}.selos[${i}]`, LIMITS.selo)
      if (!r.ok) return r
      selos.push(r.value)
    }
  }

  if (!Array.isArray(it.secoes) || it.secoes.length === 0 || it.secoes.length > LIMITS.secoes) {
    return fail(`${where}.secoes precisa ter de 1 a ${LIMITS.secoes} seções.`)
  }
  const secoes: PlanSection[] = []
  for (const [i, sec] of it.secoes.entries()) {
    const r = parseSection(sec, `${where}.secoes[${i}]`)
    if (!r.ok) return r
    secoes.push(r.value)
  }

  return {
    ok: true,
    value: { id: it.id, data: it.data, formato: it.formato as PlanFormat, titulo: titulo.value, selos, secoes },
  }
}

/** Valida o plano enviado pelo ExPx. `periodo` vem da URL e precisa bater com o corpo, se o corpo trouxer. */
export function parsePlan(raw: unknown, periodoDaRota: string): Result<PlanInput> {
  if (!raw || typeof raw !== 'object') return fail('Envie o plano como JSON.')
  const p = raw as Record<string, unknown>

  if (!isSlug(periodoDaRota)) return fail('O período na URL precisa ser algo como 2026-12.')
  if (p.periodo !== undefined && p.periodo !== periodoDaRota) {
    return fail(`O período do corpo (${String(p.periodo)}) não bate com o da URL (${periodoDaRota}).`)
  }

  const titulo = str(p.titulo, 'titulo', LIMITS.titulo)
  if (!titulo.ok) return titulo
  const introducao = str(p.introducao, 'introducao', LIMITS.introducao, false)
  if (!introducao.ok) return introducao

  if (!isIsoDate(p.inicio) || !isIsoDate(p.fim)) return fail('inicio e fim precisam estar no formato AAAA-MM-DD.')
  if (p.fim < p.inicio) return fail('fim vem antes de inicio.')
  const dias = (Date.parse(p.fim) - Date.parse(p.inicio)) / 86_400_000
  if (dias > 100) return fail('O plano pode cobrir no máximo 3 meses.')

  const status = p.status === undefined ? 'publicado' : p.status
  if (!PLAN_STATUSES.includes(status as PlanStatus)) return fail('status precisa ser previa ou publicado.')

  if (!Array.isArray(p.itens) || p.itens.length === 0 || p.itens.length > LIMITS.itens) {
    return fail(`itens precisa ter de 1 a ${LIMITS.itens} posts.`)
  }
  const itens: PlanItemInput[] = []
  const ids = new Set<string>()
  for (const [i, raw] of p.itens.entries()) {
    const r = parseItem(raw, `itens[${i}]`, p.inicio, p.fim)
    if (!r.ok) return r
    if (ids.has(r.value.id)) return fail(`itens[${i}].id "${r.value.id}" está repetido.`)
    ids.add(r.value.id)
    itens.push(r.value)
  }

  return {
    ok: true,
    value: {
      periodo: periodoDaRota,
      titulo: titulo.value,
      introducao: introducao.value,
      inicio: p.inicio,
      fim: p.fim,
      status: status as PlanStatus,
      itens,
    },
  }
}
