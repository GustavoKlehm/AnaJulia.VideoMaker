import { describe, expect, it } from 'vitest'
import { itemReviewState, summarize, type ReviewRow } from './portalStatus'

const r = (versao: number, status: ReviewRow['status'], created_at: string, comentario = ''): ReviewRow => ({
  item_id: 'a',
  versao,
  status,
  comentario,
  autor_nome: 'Vanessa',
  created_at,
})

describe('itemReviewState', () => {
  it('sem resposta é pendente', () => {
    expect(itemReviewState(1, [])).toMatchObject({ status: 'pendente', atualizado: false, ajusteAnterior: null })
  })

  it('vale a última resposta da versão atual', () => {
    const s = itemReviewState(1, [
      r(1, 'ajuste', '2026-11-10T10:00:00Z', 'troca a música'),
      r(1, 'aprovado', '2026-11-11T10:00:00Z'),
    ])
    expect(s.status).toBe('aprovado')
  })

  it('post atualizado pela Ana volta a pendente e lembra o ajuste pedido', () => {
    const s = itemReviewState(2, [r(1, 'ajuste', '2026-11-10T10:00:00Z', 'troca a música')])
    expect(s).toMatchObject({
      status: 'pendente',
      atualizado: true,
      ajusteAnterior: { comentario: 'troca a música' },
    })
  })

  it('depois de responder a versão nova, deixa de mostrar como atualizado', () => {
    const s = itemReviewState(2, [r(1, 'ajuste', '2026-11-10T10:00:00Z', 'x'), r(2, 'aprovado', '2026-11-12T10:00:00Z')])
    expect(s).toMatchObject({ status: 'aprovado', atualizado: false, ajusteAnterior: null })
  })
})

describe('summarize', () => {
  it('conta cada status', () => {
    expect(summarize([{ status: 'aprovado' }, { status: 'ajuste' }, { status: 'pendente' }, { status: 'aprovado' }])).toEqual({
      total: 4,
      aprovados: 2,
      ajustes: 1,
      pendentes: 1,
    })
  })
})
