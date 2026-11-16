import { describe, expect, it } from 'vitest'
import { normalizeHex, parsePlan } from './portalPlan'

type ItemFixture = { id: string; data: string; formato: string; titulo: string; selos: string[]; secoes: unknown[] }

function plan(overrides: Record<string, unknown> = {}): Record<string, unknown> & { itens: ItemFixture[] } {
  return {
    periodo: '2026-12',
    titulo: 'Planejamento de dezembro',
    introducao: 'Os 4 Reels do mês.',
    inicio: '2026-12-01',
    fim: '2026-12-31',
    itens: [
      {
        id: '2026-12-03-matriculas',
        data: '2026-12-03',
        formato: 'reels',
        titulo: 'Matrículas abertas',
        selos: ['~40 s', 'com fala'],
        secoes: [
          { tipo: 'texto', titulo: 'Objetivo', texto: 'Avisar das matrículas.' },
          { tipo: 'cortes', titulo: 'Roteiro', cortes: [{ tempo: '0–5 s', cena: 'Dona', tela: 'Já garantiu?', fala: '“Oi”' }] },
          { tipo: 'roteiro', titulo: 'Fala', linhas: ['[caixa] Alguns presentes…'] },
          { tipo: 'referencia', titulo: 'Referência', url: 'https://www.instagram.com/reel/DePnZT8ve9h/' },
        ],
      },
    ],
    ...overrides,
  }
}

describe('parsePlan', () => {
  it('aceita um plano completo e publica por padrão', () => {
    const r = parsePlan(plan(), '2026-12')
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.status).toBe('publicado')
      expect(r.value.itens[0].secoes).toHaveLength(4)
      expect(r.value.itens[0].secoes[3]).toMatchObject({ tipo: 'referencia', texto: '' })
    }
  })

  it('aceita período de dois meses como 2026-11-e-12', () => {
    const r = parsePlan(plan({ periodo: undefined, inicio: '2026-11-01' }), '2026-11-e-12')
    expect(r.ok).toBe(true)
  })

  it('recusa período diferente da URL', () => {
    const r = parsePlan(plan(), '2026-11')
    expect(r).toMatchObject({ ok: false })
  })

  it('recusa post fora do período', () => {
    const p = plan()
    p.itens[0].data = '2027-01-02'
    expect(parsePlan(p, '2026-12')).toMatchObject({ ok: false, error: expect.stringContaining('fora do período') })
  })

  it('recusa ids repetidos', () => {
    const p = plan()
    p.itens.push({ ...p.itens[0] })
    expect(parsePlan(p, '2026-12')).toMatchObject({ ok: false, error: expect.stringContaining('repetido') })
  })

  it('recusa seção desconhecida e link sem https', () => {
    const a = plan()
    a.itens[0].secoes = [{ tipo: 'html', titulo: 'x', texto: '<b>' }]
    expect(parsePlan(a, '2026-12').ok).toBe(false)

    const b = plan()
    b.itens[0].secoes = [{ tipo: 'referencia', titulo: 'x', url: 'javascript:alert(1)' }]
    expect(parsePlan(b, '2026-12').ok).toBe(false)
  })

  it('recusa data impossível e status inválido', () => {
    expect(parsePlan(plan({ fim: '2026-12-32' }), '2026-12').ok).toBe(false)
    expect(parsePlan(plan({ status: 'rascunho' }), '2026-12').ok).toBe(false)
  })
})

describe('normalizeHex', () => {
  it('aceita com e sem #, curto e maiúsculo', () => {
    expect(normalizeHex('#B8322A')).toBe('#b8322a')
    expect(normalizeHex('b8322a')).toBe('#b8322a')
    expect(normalizeHex('#abc')).toBe('#aabbcc')
    expect(normalizeHex('red')).toBeNull()
  })
})
