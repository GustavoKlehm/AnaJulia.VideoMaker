import { describe, expect, it } from 'vitest'
import {
  parsePlanosSearch,
  serializePlanosSearch,
} from './planosState'

describe('parsePlanosSearch', () => {
  it('começa sem seleção', () => {
    expect(parsePlanosSearch('')).toEqual({
      view: 'guided',
      tipo: null,
      plano: null,
    })
  })

  it('lê Momentos e o plano História', () => {
    expect(parsePlanosSearch('?tipo=momentos&plano=historia')).toMatchObject({
      view: 'guided',
      tipo: 'momentos',
      plano: 'historia',
    })
  })

  it('ignora a antiga linha Ocasiões', () => {
    expect(parsePlanosSearch('?tipo=ocasioes&entrega=bruto&tempo=meia')).toEqual({
      view: 'guided',
      tipo: null,
      plano: null,
    })
  })

  it('ignora valores que não existem no catálogo', () => {
    expect(parsePlanosSearch('?tipo=foo&plano=bar&entrega=x&tempo=y')).toEqual({
      view: 'guided',
      tipo: null,
      plano: null,
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
      }),
    ).toBe('?tipo=momentos&plano=historia')
  })

  it('não inclui parâmetros vazios', () => {
    expect(
      serializePlanosSearch({
        view: 'guided',
        tipo: 'marcas',
        plano: null,
      }),
    ).toBe('?tipo=marcas')
  })

  it('serializa a vista completa', () => {
    expect(
      serializePlanosSearch({
        view: 'all',
        tipo: null,
        plano: null,
      }),
    ).toBe('?ver=todos')
  })
})

