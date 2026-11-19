import { describe, expect, it } from 'vitest'
import { entregaToken, estudioClienteSlug, estudioEntregaId, navHref, resolveEstudioPath, resolvePortalPath, resolveRoute } from './router'

describe('resolveRoute', () => {
  it('reconhece a rota de planos', () => {
    expect(resolveRoute('/planos')).toBe('planos')
  })

  it('ignora barra final', () => {
    expect(resolveRoute('/planos/')).toBe('planos')
  })

  it('trata a raiz como home', () => {
    expect(resolveRoute('/')).toBe('home')
  })

  it('trata rota desconhecida como home', () => {
    expect(resolveRoute('/qualquer-coisa')).toBe('home')
  })

  it('reconhece o estúdio e as subrotas', () => {
    expect(resolveRoute('/estudio')).toBe('estudio')
    expect(resolveRoute('/estudio/')).toBe('estudio')
    expect(resolveRoute('/estudio/catalogo')).toBe('estudio')
    expect(resolveRoute('/estudio/paginas/home')).toBe('estudio')
    expect(resolveRoute('/estudio/historias')).toBe('estudio')
    expect(resolveRoute('/estudio/materiais')).toBe('estudio')
    expect(resolveRoute('/estudio/equipe')).toBe('estudio')
  })
})

describe('resolveEstudioPath', () => {
  it('mapeia as seções do estúdio', () => {
    expect(resolveEstudioPath('/estudio')).toBe('inicio')
    expect(resolveEstudioPath('/estudio/agenda')).toBe('agenda')
    expect(resolveEstudioPath('/estudio/catalogo')).toBe('catalogo')
    expect(resolveEstudioPath('/estudio/paginas/home')).toBe('pagina-home')
    expect(resolveEstudioPath('/estudio/historias')).toBe('historias')
    expect(resolveEstudioPath('/estudio/materiais')).toBe('materiais')
    expect(resolveEstudioPath('/estudio/equipe')).toBe('equipe')
    expect(resolveEstudioPath('/estudio/clientes')).toBe('clientes')
    expect(resolveEstudioPath('/estudio/clientes/soul-circo')).toBe('cliente')
  })

  it('lê o slug do cliente no estúdio', () => {
    expect(estudioClienteSlug('/estudio/clientes/soul-circo')).toBe('soul-circo')
    expect(estudioClienteSlug('/estudio/clientes')).toBeNull()
  })
})

describe('área do cliente', () => {
  it('reconhece /cliente e as subrotas', () => {
    expect(resolveRoute('/cliente')).toBe('cliente')
    expect(resolveRoute('/cliente/soul-circo/2026-12')).toBe('cliente')
    expect(resolveRoute('/clientes')).toBe('home')
  })

  it('separa a lista do plano', () => {
    expect(resolvePortalPath('/cliente')).toEqual({ view: 'inicio' })
    expect(resolvePortalPath('/cliente/soul-circo/2026-12')).toEqual({
      view: 'plano',
      slug: 'soul-circo',
      periodo: '2026-12',
    })
    expect(resolvePortalPath('/cliente/soul-circo/2026-11-e-12/')).toMatchObject({ periodo: '2026-11-e-12' })
    expect(resolvePortalPath('/cliente/Soul/x')).toEqual({ view: 'inicio' })
  })
})

describe('entregas', () => {
  const token = 'Ab3_-xYz0123456789abcdEF'
  const id = '6f1c2a9e-1b2c-4d5e-8f90-123456789abc'

  it('reconhece o link público da entrega', () => {
    expect(resolveRoute(`/entrega/${token}`)).toBe('entrega')
    expect(entregaToken(`/entrega/${token}/`)).toBe(token)
    expect(resolveRoute('/entrega/curto')).toBe('home')
  })

  it('mapeia a lista e o detalhe no estúdio', () => {
    expect(resolveEstudioPath('/estudio/entregas')).toBe('entregas')
    expect(resolveEstudioPath(`/estudio/entregas/${id}`)).toBe('entrega')
    expect(estudioEntregaId(`/estudio/entregas/${id}`)).toBe(id)
    expect(estudioEntregaId('/estudio/entregas')).toBeNull()
  })
})

describe('navHref', () => {
  it('mantém a âncora quando já está na home', () => {
    expect(navHref({ href: '#sobre', label: 'Sobre' }, 'home')).toBe('#sobre')
  })

  it('aponta a âncora para a home quando está em outra rota', () => {
    expect(navHref({ href: '#sobre', label: 'Sobre' }, 'planos')).toBe('/#sobre')
  })

  it('mantém o caminho de rota em qualquer página', () => {
    const item = { href: '/planos', label: 'Planos', route: true }
    expect(navHref(item, 'home')).toBe('/planos')
    expect(navHref(item, 'planos')).toBe('/planos')
  })
})
