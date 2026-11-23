import { randomInt, timingSafeEqual } from 'node:crypto'
import { normalizePhone } from '../src/shared/phone.js'
import { isSlug, normalizeHex } from '../src/shared/portalPlan.js'

type Result<T> = { ok: true; value: T } | { ok: false; error: string }

export type ContactInput = { nome: string; telefone: string }

export type ClientInput = {
  nome: string
  instagram: string
  corPrincipal: string
  corSecundaria: string
  ativo: boolean | undefined
  /** undefined = não mexe nos contatos; lista = sincroniza (novos entram, ausentes são desativados). */
  contatos: ContactInput[] | undefined
}

export function parseContact(raw: unknown, where = 'contato'): Result<ContactInput> {
  if (!raw || typeof raw !== 'object') return { ok: false, error: `${where}: informe nome e telefone.` }
  const c = raw as Record<string, unknown>
  const nome = typeof c.nome === 'string' ? c.nome.trim() : ''
  if (!nome || nome.length > 120) return { ok: false, error: `${where}: informe o nome (até 120 caracteres).` }
  const telefone = typeof c.telefone === 'string' ? normalizePhone(c.telefone) : null
  if (!telefone) return { ok: false, error: `${where}: "${String(c.telefone ?? '')}" não é um celular válido com DDD.` }
  return { ok: true, value: { nome, telefone } }
}

export function parseClient(raw: unknown): Result<ClientInput> {
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'Envie os dados do cliente como JSON.' }
  const b = raw as Record<string, unknown>

  const nome = typeof b.nome === 'string' ? b.nome.trim() : ''
  if (!nome || nome.length > 120) return { ok: false, error: 'Informe o nome do cliente (até 120 caracteres).' }

  let instagram = typeof b.instagram === 'string' ? b.instagram.trim() : ''
  if (instagram && !instagram.startsWith('@')) instagram = `@${instagram}`
  if (instagram.length > 60) return { ok: false, error: 'Instagram longo demais.' }

  const cores = (b.cores ?? {}) as Record<string, unknown>
  const corPrincipal = normalizeHex(cores.principal)
  const corSecundaria = normalizeHex(cores.secundaria)
  if (!corPrincipal || !corSecundaria) {
    return { ok: false, error: 'Informe as duas cores em hexadecimal, ex.: { "principal": "#b8322a", "secundaria": "#f9e0dc" }.' }
  }

  if (b.ativo !== undefined && typeof b.ativo !== 'boolean') return { ok: false, error: 'ativo precisa ser true ou false.' }

  let contatos: ContactInput[] | undefined
  if (b.contatos !== undefined) {
    if (!Array.isArray(b.contatos) || b.contatos.length > 20) {
      return { ok: false, error: 'contatos precisa ser uma lista de até 20 pessoas.' }
    }
    contatos = []
    const vistos = new Set<string>()
    for (const [i, raw] of b.contatos.entries()) {
      const r = parseContact(raw, `contatos[${i}]`)
      if (!r.ok) return r
      if (vistos.has(r.value.telefone)) return { ok: false, error: `contatos[${i}]: telefone repetido.` }
      vistos.add(r.value.telefone)
      contatos.push(r.value)
    }
  }

  return {
    ok: true,
    value: { nome, instagram, corPrincipal, corSecundaria, ativo: b.ativo as boolean | undefined, contatos },
  }
}

export function parseSlugParam(value: unknown): string | null {
  return isSlug(value) ? value : null
}

/** PINs fáceis de chutar ficam de fora. */
export function isWeakPin(pin: string): boolean {
  if (/^(\d)\1{5}$/.test(pin)) return true
  const digits = pin.split('').map(Number)
  const steps = digits.slice(1).map((d, i) => d - digits[i])
  if (steps.every((s) => s === 1) || steps.every((s) => s === -1)) return true
  if (/^(\d\d)\1\1$/.test(pin) || /^(\d{3})\1$/.test(pin)) return true
  return false
}

export function generatePin(): string {
  for (;;) {
    const pin = String(randomInt(0, 1_000_000)).padStart(6, '0')
    if (!isWeakPin(pin)) return pin
  }
}

/** Compara o Bearer com o token do ExPx em tempo constante. Token curto demais desliga o acesso. */
export function matchesSyncToken(bearer: string | null, expected: string | undefined): boolean {
  if (!bearer || !expected || expected.length < 32) return false
  const a = Buffer.from(bearer)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}
