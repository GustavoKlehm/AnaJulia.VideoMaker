import { describe, expect, it } from 'vitest'
import { navHref, resolveRoute } from './router'

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
