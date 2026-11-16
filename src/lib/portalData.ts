import type { PlanFormat, PlanSection } from '../shared/portalPlan'
import { groupReviews, itemReviewState, summarize, type ItemReviewState, type PlanSummary, type ReviewRow } from '../shared/portalStatus'
import { getSupabase } from './supabase'

export type PortalClient = {
  id: string
  slug: string
  nome: string
  instagram: string
  cor_principal: string
  cor_secundaria: string
}

export type PortalPlan = {
  id: string
  client_id: string
  periodo: string
  titulo: string
  introducao: string
  inicio: string
  fim: string
  status: 'previa' | 'publicado'
  enviado_em: string
}

export type PortalItem = {
  id: string
  chave: string
  data: string
  formato: PlanFormat
  titulo: string
  selos: string[]
  secoes: PlanSection[]
  versao: number
  ordem: number
}

export type PortalItemView = PortalItem & { review: ItemReviewState }

export type PortalNote = {
  id: string
  plan_id: string | null
  titulo: string
  detalhes: string
  quando: string
  autor_id: string | null
  autor_nome: string
  created_at: string
}

export type PlanWithSummary = PortalPlan & { resumo: PlanSummary }

function check<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message)
  return result.data as T
}

const CLIENT_COLUMNS = 'id, slug, nome, instagram, cor_principal, cor_secundaria'
const PLAN_COLUMNS = 'id, client_id, periodo, titulo, introducao, inicio, fim, status, enviado_em'

async function loadReviews(itemIds: string[]): Promise<ReviewRow[]> {
  if (itemIds.length === 0) return []
  return check(
    await getSupabase()
      .from('portal_reviews')
      .select('item_id, versao, status, comentario, autor_nome, created_at')
      .in('item_id', itemIds),
  ) as ReviewRow[]
}

/** Clientes visíveis para quem está logado (o próprio, ou todos para a Ana) com os planos e o resumo de cada um. */
export async function loadOverview(): Promise<{ client: PortalClient; plans: PlanWithSummary[] }[]> {
  const db = getSupabase()
  const clients = check(await db.from('portal_clients').select(CLIENT_COLUMNS).eq('ativo', true).order('nome')) as PortalClient[]
  if (clients.length === 0) return []

  const plans = check(
    await db
      .from('portal_plans')
      .select(PLAN_COLUMNS)
      .in('client_id', clients.map((c) => c.id))
      .order('inicio', { ascending: false }),
  ) as PortalPlan[]

  const items =
    plans.length === 0
      ? []
      : (check(
          await db
            .from('portal_items')
            .select('id, plan_id, versao')
            .in('plan_id', plans.map((p) => p.id))
            .eq('arquivado', false),
        ) as { id: string; plan_id: string; versao: number }[])
  const byItem = groupReviews(await loadReviews(items.map((i) => i.id)))

  return clients.map((client) => ({
    client,
    plans: plans
      .filter((p) => p.client_id === client.id)
      .map((plan) => ({
        ...plan,
        resumo: summarize(
          items.filter((i) => i.plan_id === plan.id).map((i) => itemReviewState(i.versao, byItem.get(i.id) ?? [])),
        ),
      })),
  }))
}

export type PlanBundle = {
  client: PortalClient
  plan: PortalPlan
  items: PortalItemView[]
  notes: PortalNote[]
  /** Nome do contato logado neste cliente; null quando é a Ana olhando. */
  memberName: string | null
}

export async function loadPlan(slug: string, periodo: string, userId: string): Promise<PlanBundle | null> {
  const db = getSupabase()
  const client = check(await db.from('portal_clients').select(CLIENT_COLUMNS).eq('slug', slug).maybeSingle()) as PortalClient | null
  if (!client) return null

  const plan = check(
    await db.from('portal_plans').select(PLAN_COLUMNS).eq('client_id', client.id).eq('periodo', periodo).maybeSingle(),
  ) as PortalPlan | null
  if (!plan) return null

  const [itemsResult, notesResult, memberResult] = await Promise.all([
    db
      .from('portal_items')
      .select('id, chave, data, formato, titulo, selos, secoes, versao, ordem')
      .eq('plan_id', plan.id)
      .eq('arquivado', false)
      .order('data')
      .order('ordem'),
    db
      .from('portal_notes')
      .select('id, plan_id, titulo, detalhes, quando, autor_id, autor_nome, created_at')
      .eq('client_id', client.id)
      .or(`plan_id.eq.${plan.id},plan_id.is.null`)
      .order('created_at', { ascending: false }),
    db.from('portal_contacts').select('nome').eq('client_id', client.id).eq('user_id', userId).eq('ativo', true).maybeSingle(),
  ])

  const items = check(itemsResult) as PortalItem[]
  const byItem = groupReviews(await loadReviews(items.map((i) => i.id)))

  return {
    client,
    plan,
    items: items.map((item) => ({ ...item, review: itemReviewState(item.versao, byItem.get(item.id) ?? []) })),
    notes: check(notesResult) as PortalNote[],
    memberName: (check(memberResult) as { nome: string } | null)?.nome ?? null,
  }
}

function friendly(error: { message: string } | null) {
  if (error) throw new Error(error.message)
}

export async function submitReview(itemId: string, status: 'aprovado' | 'ajuste', comentario = '') {
  const { error } = await getSupabase().rpc('portal_review', { p_item: itemId, p_status: status, p_comentario: comentario })
  friendly(error)
}

export async function approvePending(planId: string): Promise<number> {
  const { data, error } = await getSupabase().rpc('portal_approve_pending', { p_plan: planId })
  friendly(error)
  return data as number
}

export async function addNote(input: { clientId: string; planId: string; titulo: string; detalhes: string; quando: string }) {
  const { error } = await getSupabase().rpc('portal_add_note', {
    p_client: input.clientId,
    p_plan: input.planId,
    p_titulo: input.titulo,
    p_detalhes: input.detalhes,
    p_quando: input.quando,
  })
  friendly(error)
}

export async function deleteNote(noteId: string) {
  const { error } = await getSupabase().rpc('portal_delete_note', { p_note: noteId })
  friendly(error)
}
