import { describe, expect, it } from 'vitest'
import { assistenteVisible, navHref, resolveEstudioPath, resolveRoute } from './router'

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
    expect(resolveEstudioPath('/estudio/catalogo')).toBe('catalogo')
    expect(resolveEstudioPath('/estudio/paginas/home')).toBe('pagina-home')
    expect(resolveEstudioPath('/estudio/historias')).toBe('historias')
    expect(resolveEstudioPath('/estudio/materiais')).toBe('materiais')
    expect(resolveEstudioPath('/estudio/equipe')).toBe('equipe')
  })
})

describe('assistenteVisible', () => {
  it('aparece na home e em planos, não no estúdio', () => {
    expect(assistenteVisible('home')).toBe(true)
    expect(assistenteVisible('planos')).toBe(true)
    expect(assistenteVisible('estudio')).toBe(false)
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
