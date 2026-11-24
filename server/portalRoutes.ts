import type { Request, Response, Router } from 'express'
import express from 'express'
import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizePhone } from '../src/shared/phone.js'
import { parsePlan } from '../src/shared/portalPlan.js'
import { groupReviews, itemReviewState, summarize, type ReviewRow } from '../src/shared/portalStatus.js'
import { isAdminToken } from './adminAuth.js'
import { readBearerToken } from './estudioUsers.js'
import { deactivateContact, ensureContact, resetPin, type ContactRow, type NewAccess } from './portalAccounts.js'
import { matchesSyncToken, parseClient, parseContact, parseSlugParam } from './portalInput.js'
import { getSupabase } from './supabase.js'

type Origin = 'expx' | 'estudio'

export type ClientRow = {
  id: string
  slug: string
  nome: string
  instagram: string
  cor_principal: string
  cor_secundaria: string
  ativo: boolean
  created_at: string
  updated_at: string
}

type PlanRow = {
  id: string
  periodo: string
  titulo: string
  inicio: string
  fim: string
  status: string
  enviado_em: string
}

/** ExPx entra com o token de sincronização; o estúdio, com a sessão de admin. */
export async function authorize(req: Request, res: Response, onlyExpx = false): Promise<Origin | null> {
  const token = readBearerToken(req.headers.authorization)
  if (matchesSyncToken(token, process.env.EXPX_SYNC_TOKEN)) {
    return 'expx'
  }
  if (onlyExpx) {
    res.status(token ? 403 : 401).json({ error: 'Planos só são enviados pelo ExPx.' })
    return null
  }
  if (!token) {
    res.status(401).json({ error: 'Entre no estúdio (ou use o token do ExPx) para continuar.' })
    return null
  }
  try {
    if (!(await isAdminToken(token))) {
      res.status(403).json({ error: 'Essa chave não abre a área de clientes.' })
      return null
    }
    return 'estudio'
  } catch {
    res.status(500).json({ error: 'Não deu para conferir o login agora.' })
    return null
  }
}

export function fail(res: Response, cause: unknown, message: string) {
  console.error('[portal]', message, cause)
  res.status(500).json({ error: message })
}

function mapClient(row: ClientRow) {
  return {
    slug: row.slug,
    nome: row.nome,
    instagram: row.instagram,
    cores: { principal: row.cor_principal, secundaria: row.cor_secundaria },
    ativo: row.ativo,
    criadoEm: row.created_at,
    atualizadoEm: row.updated_at,
  }
}

function mapContact(row: ContactRow) {
  return { nome: row.nome, telefone: row.telefone, ativo: row.ativo, criadoEm: row.created_at }
}

export function portalUrl(req: Request, path: string): string {
  const base = process.env.PORTAL_PUBLIC_URL?.replace(/\/+$/, '') ?? `${req.protocol}://${req.get('host') ?? 'localhost'}`
  return `${base}${path}`
}

export async function loadClient(db: SupabaseClient, res: Response, rawSlug: unknown): Promise<ClientRow | null> {
  const slug = parseSlugParam(rawSlug)
  if (!slug) {
    res.status(400).json({ error: 'Slug inválido: use letras minúsculas, números e hífen.' })
    return null
  }
  const { data, error } = await db.from('portal_clients').select('*').eq('slug', slug).maybeSingle()
  if (error) throw error
  if (!data) {
    res.status(404).json({ error: `Cliente "${slug}" não existe.` })
    return null
  }
  return data as ClientRow
}

async function loadContact(db: SupabaseClient, res: Response, client: ClientRow, rawPhone: unknown) {
  const telefone = typeof rawPhone === 'string' ? normalizePhone(rawPhone) : null
  if (!telefone) {
    res.status(400).json({ error: 'Telefone inválido.' })
    return null
  }
  const { data, error } = await db
    .from('portal_contacts')
    .select('*')
    .eq('client_id', client.id)
    .eq('telefone', telefone)
    .maybeSingle()
  if (error) throw error
  if (!data) {
    res.status(404).json({ error: 'Esse telefone não é contato deste cliente.' })
    return null
  }
  return data as ContactRow
}

async function planSummaries(db: SupabaseClient, plans: PlanRow[]) {
  if (plans.length === 0) return new Map<string, ReturnType<typeof summarize>>()
  const { data: items, error } = await db
    .from('portal_items')
    .select('id, plan_id, versao')
    .in('plan_id', plans.map((p) => p.id))
    .eq('arquivado', false)
  if (error) throw error
  const itemRows = (items ?? []) as { id: string; plan_id: string; versao: number }[]

  const reviews = await loadReviews(db, itemRows.map((i) => i.id))
  const byItem = groupReviews(reviews)
  const result = new Map<string, ReturnType<typeof summarize>>()
  for (const plan of plans) {
    const states = itemRows
      .filter((i) => i.plan_id === plan.id)
      .map((i) => itemReviewState(i.versao, byItem.get(i.id) ?? []))
    result.set(plan.id, summarize(states))
  }
  return result
}

async function loadReviews(db: SupabaseClient, itemIds: string[]): Promise<ReviewRow[]> {
  if (itemIds.length === 0) return []
  const { data, error } = await db
    .from('portal_reviews')
    .select('item_id, versao, status, comentario, autor_nome, created_at')
    .in('item_id', itemIds)
  if (error) throw error
  return (data ?? []) as ReviewRow[]
}

function accessMessage(req: Request, access: NewAccess): string {
  return [
    `Oi, ${access.nome.split(' ')[0]}! Seu planejamento de conteúdo agora fica na área do cliente da Ana Julia:`,
    portalUrl(req, '/cliente'),
    `Telefone: ${access.telefone.replace(/^(\d{2})(\d)(\d{4})(\d{4})$/, '($1) $2 $3-$4')}`,
    `PIN: ${access.pin}`,
  ].join('\n')
}

// ---------------------------------------------------------------------------

async function listClients(req: Request, res: Response) {
  if (!(await authorize(req, res))) return
  try {
    const db = getSupabase()
    const [clients, contacts, plans] = await Promise.all([
      db.from('portal_clients').select('*').order('nome'),
      db.from('portal_contacts').select('client_id').eq('ativo', true),
      db.from('portal_plans').select('client_id, periodo, enviado_em').order('enviado_em', { ascending: false }),
    ])
    if (clients.error) throw clients.error
    if (contacts.error) throw contacts.error
    if (plans.error) throw plans.error

    res.json({
      clientes: (clients.data as ClientRow[]).map((c) => {
        const own = (plans.data ?? []).filter((p) => p.client_id === c.id)
        return {
          ...mapClient(c),
          contatosAtivos: (contacts.data ?? []).filter((x) => x.client_id === c.id).length,
          planos: own.length,
          ultimoPlano: own[0]?.periodo ?? null,
        }
      }),
    })
  } catch (cause) {
    fail(res, cause, 'Não deu para listar os clientes.')
  }
}

async function getClient(req: Request, res: Response) {
  if (!(await authorize(req, res))) return
  try {
    const db = getSupabase()
    const client = await loadClient(db, res, req.params.slug)
    if (!client) return

    const [contacts, plans] = await Promise.all([
      db.from('portal_contacts').select('*').eq('client_id', client.id).order('created_at'),
      db
        .from('portal_plans')
        .select('id, periodo, titulo, inicio, fim, status, enviado_em')
        .eq('client_id', client.id)
        .order('inicio', { ascending: false }),
    ])
    if (contacts.error) throw contacts.error
    if (plans.error) throw plans.error

    const planRows = (plans.data ?? []) as PlanRow[]
    const summaries = await planSummaries(db, planRows)

    res.json({
      cliente: mapClient(client),
      contatos: ((contacts.data ?? []) as ContactRow[]).map(mapContact),
      planos: planRows.map((p) => ({
        periodo: p.periodo,
        titulo: p.titulo,
        inicio: p.inicio,
        fim: p.fim,
        status: p.status,
        enviadoEm: p.enviado_em,
        resumo: summaries.get(p.id),
        link: portalUrl(req, `/cliente/${client.slug}/${p.periodo}`),
      })),
    })
  } catch (cause) {
    fail(res, cause, 'Não deu para abrir o cliente.')
  }
}

async function upsertClient(req: Request, res: Response) {
  if (!(await authorize(req, res))) return
  const slug = parseSlugParam(req.params.slug)
  if (!slug) {
    res.status(400).json({ error: 'Slug inválido: use letras minúsculas, números e hífen (ex.: soul-circo).' })
    return
  }
  const parsed = parseClient(req.body)
  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error })
    return
  }
  const input = parsed.value

  try {
    const db = getSupabase()
    const { data: existing, error: findError } = await db.from('portal_clients').select('id').eq('slug', slug).maybeSingle()
    if (findError) throw findError
    if (existing && req.query.novo === '1') {
      res.status(409).json({ error: `Já existe um cliente com o endereço "${slug}".` })
      return
    }

    const { data: saved, error } = await db
      .from('portal_clients')
      .upsert(
        {
          slug,
          nome: input.nome,
          instagram: input.instagram,
          cor_principal: input.corPrincipal,
          cor_secundaria: input.corSecundaria,
          ...(input.ativo === undefined ? {} : { ativo: input.ativo }),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'slug' },
      )
      .select('*')
      .single()
    if (error) throw error
    const client = saved as ClientRow

    const acessos: NewAccess[] = []
    const reaproveitados: string[] = []
    const desativados: string[] = []
    if (input.contatos) {
      for (const contact of input.contatos) {
        const result = await ensureContact(db, client.id, contact)
        if (result.acesso) acessos.push(result.acesso)
        if (result.reaproveitado) reaproveitados.push(contact.telefone)
      }
      const keep = new Set(input.contatos.map((c) => c.telefone))
      const { data: current, error: listError } = await db
        .from('portal_contacts')
        .select('*')
        .eq('client_id', client.id)
        .eq('ativo', true)
      if (listError) throw listError
      for (const row of (current ?? []) as ContactRow[]) {
        if (!keep.has(row.telefone)) {
          await deactivateContact(db, row)
          desativados.push(row.telefone)
        }
      }
    }

    const { data: contacts, error: contactsError } = await db
      .from('portal_contacts')
      .select('*')
      .eq('client_id', client.id)
      .order('created_at')
    if (contactsError) throw contactsError

    res.status(existing ? 200 : 201).json({
      criado: !existing,
      cliente: mapClient(client),
      contatos: ((contacts ?? []) as ContactRow[]).map(mapContact),
      acessos: acessos.map((a) => ({ ...a, mensagem: accessMessage(req, a) })),
      reaproveitados,
      desativados,
      link: portalUrl(req, '/cliente'),
    })
  } catch (cause) {
    fail(res, cause, 'Não deu para salvar o cliente.')
  }
}

async function addContact(req: Request, res: Response) {
  if (!(await authorize(req, res))) return
  const parsed = parseContact(req.body)
  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error })
    return
  }
  try {
    const db = getSupabase()
    const client = await loadClient(db, res, req.params.slug)
    if (!client) return
    const result = await ensureContact(db, client.id, parsed.value)
    res.status(201).json({
      contato: mapContact(result.contato),
      acesso: result.acesso ? { ...result.acesso, mensagem: accessMessage(req, result.acesso) } : null,
      reaproveitado: result.reaproveitado,
    })
  } catch (cause) {
    fail(res, cause, 'Não deu para adicionar o contato.')
  }
}

async function removeContact(req: Request, res: Response) {
  if (!(await authorize(req, res))) return
  try {
    const db = getSupabase()
    const client = await loadClient(db, res, req.params.slug)
    if (!client) return
    const contact = await loadContact(db, res, client, req.params.telefone)
    if (!contact) return
    if (contact.ativo) await deactivateContact(db, contact)
    res.json({ ok: true })
  } catch (cause) {
    fail(res, cause, 'Não deu para desativar o contato.')
  }
}

async function newPin(req: Request, res: Response) {
  if (!(await authorize(req, res))) return
  try {
    const db = getSupabase()
    const client = await loadClient(db, res, req.params.slug)
    if (!client) return
    const contact = await loadContact(db, res, client, req.params.telefone)
    if (!contact) return
    if (!contact.ativo) {
      res.status(409).json({ error: 'Esse contato está desativado. Adicione de novo para reativar.' })
      return
    }
    const access = await resetPin(db, contact)
    res.json({ acesso: { ...access, mensagem: accessMessage(req, access) } })
  } catch (cause) {
    fail(res, cause, 'Não deu para gerar um PIN novo.')
  }
}

async function syncPlan(req: Request, res: Response) {
  if (!(await authorize(req, res, true))) return
  const slug = parseSlugParam(req.params.slug)
  if (!slug) {
    res.status(400).json({ error: 'Slug inválido.' })
    return
  }
  const parsed = parsePlan(req.body, String(req.params.periodo))
  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error })
    return
  }
  try {
    const db = getSupabase()
    const { data, error } = await db.rpc('portal_sync_plan', { p_client_slug: slug, p_plan: parsed.value })
    if (error) {
      if (error.code === 'P0002') {
        res.status(404).json({ error: `Cliente "${slug}" não existe. Envie o cliente antes do plano.` })
        return
      }
      throw error
    }
    const result = data as { novos: number; alterados: number; mantidos: number; arquivados: number }
    res.json({
      ok: true,
      status: parsed.value.status,
      novos: result.novos,
      alterados: result.alterados,
      mantidos: result.mantidos,
      arquivados: result.arquivados,
      link: portalUrl(req, `/cliente/${slug}/${parsed.value.periodo}`),
    })
  } catch (cause) {
    fail(res, cause, 'Não deu para gravar o plano.')
  }
}

async function getResponses(req: Request, res: Response) {
  if (!(await authorize(req, res))) return
  try {
    const db = getSupabase()
    const client = await loadClient(db, res, req.params.slug)
    if (!client) return
    const { data: plan, error } = await db
      .from('portal_plans')
      .select('id, periodo, titulo, inicio, fim, status, enviado_em')
      .eq('client_id', client.id)
      .eq('periodo', String(req.params.periodo))
      .maybeSingle()
    if (error) throw error
    if (!plan) {
      res.status(404).json({ error: 'Esse plano não existe.' })
      return
    }

    const { data: items, error: itemsError } = await db
      .from('portal_items')
      .select('id, chave, data, formato, titulo, versao, ordem')
      .eq('plan_id', plan.id)
      .eq('arquivado', false)
      .order('data')
      .order('ordem')
    if (itemsError) throw itemsError
    const itemRows = (items ?? []) as { id: string; chave: string; data: string; formato: string; titulo: string; versao: number }[]

    const reviews = await loadReviews(db, itemRows.map((i) => i.id))
    const byItem = groupReviews(reviews)

    const { data: notes, error: notesError } = await db
      .from('portal_notes')
      .select('titulo, detalhes, quando, autor_nome, created_at, plan_id')
      .eq('client_id', client.id)
      .or(`plan_id.eq.${plan.id},plan_id.is.null`)
      .order('created_at', { ascending: false })
    if (notesError) throw notesError

    const itens = itemRows.map((i) => {
      const history = (byItem.get(i.id) ?? []).sort((a, b) => a.created_at.localeCompare(b.created_at))
      const state = itemReviewState(i.versao, history)
      return {
        id: i.chave,
        data: i.data,
        formato: i.formato,
        titulo: i.titulo,
        versao: i.versao,
        status: state.status,
        comentario: state.comentario,
        autor: state.autor,
        respondidoEm: state.em,
        historico: history.map((r) => ({
          versao: r.versao,
          status: r.status,
          comentario: r.comentario,
          autor: r.autor_nome,
          em: r.created_at,
        })),
      }
    })

    res.json({
      cliente: { slug: client.slug, nome: client.nome },
      plano: { periodo: plan.periodo, titulo: plan.titulo, inicio: plan.inicio, fim: plan.fim, status: plan.status, enviadoEm: plan.enviado_em },
      resumo: summarize(itens),
      itens,
      novidades: (notes ?? []).map((n) => ({
        titulo: n.titulo,
        detalhes: n.detalhes,
        quando: n.quando,
        autor: n.autor_nome,
        em: n.created_at,
        geral: n.plan_id === null,
      })),
    })
  } catch (cause) {
    fail(res, cause, 'Não deu para ler as respostas.')
  }
}

export function portalRouter(): Router {
  const router = express.Router()
  const run = (handler: (req: Request, res: Response) => Promise<void>) => (req: Request, res: Response) => {
    void handler(req, res)
  }

  router.get('/clientes', run(listClients))
  router.get('/clientes/:slug', run(getClient))
  router.put('/clientes/:slug', run(upsertClient))
  router.post('/clientes/:slug/contatos', run(addContact))
  router.delete('/clientes/:slug/contatos/:telefone', run(removeContact))
  router.post('/clientes/:slug/contatos/:telefone/pin', run(newPin))
  router.put('/clientes/:slug/planos/:periodo', run(syncPlan))
  router.get('/clientes/:slug/planos/:periodo/respostas', run(getResponses))

  return router
}
