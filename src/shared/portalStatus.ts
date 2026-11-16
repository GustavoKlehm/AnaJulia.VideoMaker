export type ReviewStatus = 'aprovado' | 'ajuste'
export type ItemStatus = ReviewStatus | 'pendente'

export type ReviewRow = {
  item_id: string
  versao: number
  status: ReviewStatus
  comentario: string
  autor_nome: string
  created_at: string
}

export type ItemReviewState = {
  status: ItemStatus
  comentario: string
  autor: string
  em: string | null
  /** A versão atual mudou depois de uma resposta: o post foi atualizado pela Ana. */
  atualizado: boolean
  /** Último pedido de ajuste de uma versão anterior, para o cliente lembrar o que pediu. */
  ajusteAnterior: { comentario: string; em: string } | null
}

/** Status de um post: a última resposta da versão atual. */
export function itemReviewState(versaoAtual: number, reviews: ReviewRow[]): ItemReviewState {
  const ordered = [...reviews].sort((a, b) => b.created_at.localeCompare(a.created_at))
  const current = ordered.find((r) => r.versao === versaoAtual)
  const previous = ordered.find((r) => r.versao < versaoAtual)
  const previousFix = ordered.find((r) => r.versao < versaoAtual && r.status === 'ajuste')

  return {
    status: current?.status ?? 'pendente',
    comentario: current?.comentario ?? '',
    autor: current?.autor_nome ?? '',
    em: current?.created_at ?? null,
    atualizado: !current && Boolean(previous),
    ajusteAnterior: !current && previousFix ? { comentario: previousFix.comentario, em: previousFix.created_at } : null,
  }
}

export type PlanSummary = { total: number; aprovados: number; ajustes: number; pendentes: number }

export function summarize(states: { status: ItemStatus }[]): PlanSummary {
  const summary: PlanSummary = { total: states.length, aprovados: 0, ajustes: 0, pendentes: 0 }
  for (const s of states) {
    if (s.status === 'aprovado') summary.aprovados += 1
    else if (s.status === 'ajuste') summary.ajustes += 1
    else summary.pendentes += 1
  }
  return summary
}

export function groupReviews(reviews: ReviewRow[]): Map<string, ReviewRow[]> {
  const map = new Map<string, ReviewRow[]>()
  for (const r of reviews) {
    const list = map.get(r.item_id)
    if (list) list.push(r)
    else map.set(r.item_id, [r])
  }
  return map
}
