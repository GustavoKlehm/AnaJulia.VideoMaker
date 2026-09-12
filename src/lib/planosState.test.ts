import { describe, expect, it } from 'vitest'
import {
  ocasioesTierId,
  parsePlanosSearch,
  planosHref,
  planosStateFromRecommendation,
  serializePlanosSearch,
} from './planosState'

describe('parsePlanosSearch', () => {
  it('começa sem seleção', () => {
    expect(parsePlanosSearch('')).toEqual({
      view: 'guided',
      tipo: null,
      plano: null,
      entrega: null,
      tempo: null,
    })
  })

  it('lê Momentos e o plano História', () => {
    expect(parsePlanosSearch('?tipo=momentos&plano=historia')).toMatchObject({
      view: 'guided',
      tipo: 'momentos',
      plano: 'historia',
    })
  })

  it('lê Ocasiões com entrega e tempo', () => {
    expect(parsePlanosSearch('?tipo=ocasioes&entrega=bruto&tempo=meia')).toMatchObject({
      tipo: 'ocasioes',
      entrega: 'bruto',
      tempo: 'meia',
    })
  })

  it('ignora valores que não existem no catálogo', () => {
    expect(parsePlanosSearch('?tipo=foo&plano=bar&entrega=x&tempo=y')).toEqual({
      view: 'guided',
      tipo: null,
      plano: null,
      entrega: null,
      tempo: null,
    })
  })

  it('reconhece a vista de todos os planos', () => {
    expect(parsePlanosSearch('?ver=todos').view).toBe('all')
  })

  it('descarta plano de outra linha', () => {
    expect(parsePlanosSearch('?tipo=momentos&plano=ritmo').plano).toBeNull()
  })
})

describe('serializePlanosSearch', () => {
  it('volta um link compartilhável', () => {
    expect(
      serializePlanosSearch({
        view: 'guided',
        tipo: 'momentos',
        plano: 'historia',
        entrega: null,
        tempo: null,
      }),
    ).toBe('?tipo=momentos&plano=historia')
  })

  it('não inclui parâmetros vazios', () => {
    expect(
      serializePlanosSearch({
        view: 'guided',
        tipo: 'marcas',
        plano: null,
        entrega: null,
        tempo: null,
      }),
    ).toBe('?tipo=marcas')
  })

  it('serializa a vista completa', () => {
    expect(
      serializePlanosSearch({
        view: 'all',
        tipo: null,
        plano: null,
        entrega: null,
        tempo: null,
      }),
    ).toBe('?ver=todos')
  })
})

describe('planosStateFromRecommendation', () => {
  it('abre Momentos no plano indicado', () => {
    expect(planosStateFromRecommendation({ tipo: 'momentos', plano: 'historia' })).toEqual({
      view: 'guided',
      tipo: 'momentos',
      plano: 'historia',
      entrega: null,
      tempo: null,
    })
    expect(planosHref(planosStateFromRecommendation({ tipo: 'momentos', plano: 'historia' })!)).toBe(
      '/planos?tipo=momentos&plano=historia',
    )
  })

  it('abre Ocasiões pela entrega e pelo tempo', () => {
    expect(planosStateFromRecommendation({ tipo: 'ocasioes', plano: 'diaria' })).toEqual({
      view: 'guided',
      tipo: 'ocasioes',
      plano: null,
      entrega: 'editado',
      tempo: 'diaria',
    })
    expect(planosHref(planosStateFromRecommendation({ tipo: 'ocasioes', plano: 'diaria' })!)).toBe(
      '/planos?tipo=ocasioes&entrega=editado&tempo=diaria',
    )
  })

  it('rejeita combinação que o catálogo não tem', () => {
    expect(planosStateFromRecommendation({ tipo: 'marcas', plano: 'historia' })).toBeNull()
    expect(planosStateFromRecommendation({ tipo: 'momentos', plano: 'desconhecido' })).toBeNull()
  })
})

describe('ocasioesTierId', () => {
  it('liga só captação + meia diária', () => {
    expect(ocasioesTierId('bruto', 'meia')).toBe('captacao-meia')
  })

  it('liga captação e edição + diária', () => {
    expect(ocasioesTierId('editado', 'diaria')).toBe('diaria')
  })

  it('espera as duas escolhas', () => {
    expect(ocasioesTierId('bruto', null)).toBeNull()
    expect(ocasioesTierId(null, 'meia')).toBeNull()
  })
})
