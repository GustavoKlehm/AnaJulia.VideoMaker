import { describe, expect, it } from 'vitest'
import {
  COMBO,
  emptyPlanosState,
  parsePlanosSearch,
  serializePlanosSearch,
} from './planosState'

describe('parsePlanosSearch', () => {
  it('começa sem seleção', () => {
    expect(parsePlanosSearch('')).toEqual(emptyPlanosState())
  })

  it('lê a linha, a categoria, o serviço e o plano', () => {
    expect(
      parsePlanosSearch('?tipo=momentos&cat=casamentos&serv=casamentos-storymaker&plano=casamentos-story-enredo'),
    ).toEqual({
      view: 'guided',
      tipo: 'momentos',
      cat: 'casamentos',
      serv: 'casamentos-storymaker',
      plano: 'casamentos-story-enredo',
      plano2: null,
    })
  })

  it('lê o combo com os dois planos', () => {
    const state = parsePlanosSearch(
      `?tipo=marcas&cat=marcas-conteudo&serv=${COMBO}&plano=ritmo&plano2=destaque`,
    )
    expect(state.serv).toBe(COMBO)
    expect(state.plano).toBe('ritmo')
    expect(state.plano2).toBe('destaque')
  })

  it('ignora plano2 fora do combo', () => {
    const state = parsePlanosSearch('?tipo=marcas&cat=marcas-conteudo&serv=marcas-video&plano=ritmo&plano2=destaque')
    expect(state.plano2).toBeNull()
  })

  it('ignora a antiga linha Ocasiões', () => {
    expect(parsePlanosSearch('?tipo=ocasioes&entrega=bruto&tempo=meia')).toEqual(
      emptyPlanosState(),
    )
  })

  it('descarta o que vem abaixo de um nível que falta', () => {
    expect(parsePlanosSearch('?tipo=momentos&plano=historia')).toMatchObject({
      tipo: 'momentos',
      cat: null,
      serv: null,
      plano: null,
    })
  })

  it('descarta valores que não são slugs', () => {
    expect(parsePlanosSearch('?tipo=momentos&cat=Casa%20mentos').cat).toBeNull()
  })

  it('reconhece a vista de todos os planos', () => {
    expect(parsePlanosSearch('?ver=todos').view).toBe('all')
  })
})

describe('serializePlanosSearch', () => {
  it('volta um link compartilhável', () => {
    expect(
      serializePlanosSearch({
        view: 'guided',
        tipo: 'momentos',
        cat: 'ensaios',
        serv: 'ensaios-videomaker',
        plano: 'historia',
        plano2: null,
      }),
    ).toBe('?tipo=momentos&cat=ensaios&serv=ensaios-videomaker&plano=historia')
  })

  it('não inclui parâmetros vazios', () => {
    expect(serializePlanosSearch({ ...emptyPlanosState(), tipo: 'marcas' })).toBe('?tipo=marcas')
  })

  it('serializa a vista completa', () => {
    expect(serializePlanosSearch({ ...emptyPlanosState(), view: 'all' })).toBe('?ver=todos')
  })

  it('ida e volta mantém o estado', () => {
    const state = {
      view: 'guided' as const,
      tipo: 'momentos' as const,
      cat: 'festas',
      serv: COMBO,
      plano: 'festas-story-enredo',
      plano2: 'festas-video-enredo',
    }
    expect(parsePlanosSearch(serializePlanosSearch(state))).toEqual(state)
  })
})
