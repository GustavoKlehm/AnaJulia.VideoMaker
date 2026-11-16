import type { Session } from '@supabase/supabase-js'
import type { PlanSummary } from '../shared/portalStatus'
import { estudioRequest } from './estudioApi'

/** Mesmas rotas que o ExPx usa (/api/portal), chamadas com a sessão de admin do estúdio. */

export type AdminClient = {
  slug: string
  nome: string
  instagram: string
  cores: { principal: string; secundaria: string }
  ativo: boolean
  contatosAtivos?: number
  planos?: number
  ultimoPlano?: string | null
}

export type AdminContact = { nome: string; telefone: string; ativo: boolean; criadoEm: string }

export type AdminAccess = { nome: string; telefone: string; pin: string; mensagem: string }

export type AdminPlan = {
  periodo: string
  titulo: string
  inicio: string
  fim: string
  status: 'previa' | 'publicado'
  enviadoEm: string
  resumo: PlanSummary
  link: string
}

export type ClientPayload = {
  nome: string
  instagram: string
  cores: { principal: string; secundaria: string }
  ativo?: boolean
  contatos?: { nome: string; telefone: string }[]
}

const base = '/api/portal/clientes'

export function listClients(session: Session) {
  return estudioRequest<{ clientes: AdminClient[] }>(base, session)
}

export function getClient(session: Session, slug: string) {
  return estudioRequest<{ cliente: AdminClient; contatos: AdminContact[]; planos: AdminPlan[] }>(
    `${base}/${encodeURIComponent(slug)}`,
    session,
  )
}

export function saveClient(session: Session, slug: string, payload: ClientPayload, onlyCreate = false) {
  return estudioRequest<{ cliente: AdminClient; contatos: AdminContact[]; acessos: AdminAccess[]; reaproveitados: string[] }>(
    `${base}/${encodeURIComponent(slug)}${onlyCreate ? '?novo=1' : ''}`,
    session,
    { method: 'PUT', body: JSON.stringify(payload) },
  )
}

export function addContact(session: Session, slug: string, contact: { nome: string; telefone: string }) {
  return estudioRequest<{ contato: AdminContact; acesso: AdminAccess | null; reaproveitado: boolean }>(
    `${base}/${encodeURIComponent(slug)}/contatos`,
    session,
    { method: 'POST', body: JSON.stringify(contact) },
  )
}

export function removeContact(session: Session, slug: string, telefone: string) {
  return estudioRequest<{ ok: true }>(`${base}/${encodeURIComponent(slug)}/contatos/${telefone}`, session, {
    method: 'DELETE',
  })
}

export function newPin(session: Session, slug: string, telefone: string) {
  return estudioRequest<{ acesso: AdminAccess }>(`${base}/${encodeURIComponent(slug)}/contatos/${telefone}/pin`, session, {
    method: 'POST',
  })
}

/** "Soul Circo" → "soul-circo" */
export function slugify(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '')
}
