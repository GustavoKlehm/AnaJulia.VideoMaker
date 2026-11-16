import { useEffect, useState } from 'react'
import type { NavItem } from '../content/site'

export type Route = 'home' | 'planos' | 'estudio' | 'cliente'
export type EstudioPath =
  | 'inicio'
  | 'catalogo'
  | 'pagina-home'
  | 'historias'
  | 'materiais'
  | 'equipe'
  | 'clientes'
  | 'cliente'

export function resolveRoute(pathname: string): Route {
  const normalized = pathname.replace(/\/+$/, '') || '/'
  if (normalized === '/planos') {
    return 'planos'
  }
  if (normalized === '/estudio' || normalized.startsWith('/estudio/')) {
    return 'estudio'
  }
  if (normalized === '/cliente' || normalized.startsWith('/cliente/')) {
    return 'cliente'
  }
  return 'home'
}

export type PortalPath = { view: 'inicio' } | { view: 'plano'; slug: string; periodo: string }

/** /cliente → lista de planos; /cliente/<slug>/<periodo> → um plano. */
export function resolvePortalPath(pathname: string): PortalPath {
  const match = /^\/cliente\/([a-z0-9-]+)\/([a-z0-9-]+)\/?$/.exec(pathname)
  return match ? { view: 'plano', slug: match[1], periodo: match[2] } : { view: 'inicio' }
}

/** Slug do cliente em /estudio/clientes/<slug>. */
export function estudioClienteSlug(pathname: string): string | null {
  const match = /^\/estudio\/clientes\/([a-z0-9-]+)\/?$/.exec(pathname)
  return match ? match[1] : null
}

export function resolveEstudioPath(pathname: string): EstudioPath {
  const normalized = pathname.replace(/\/+$/, '') || '/'
  if (normalized === '/estudio/catalogo') {
    return 'catalogo'
  }
  if (normalized === '/estudio/paginas/home') {
    return 'pagina-home'
  }
  if (normalized === '/estudio/historias') {
    return 'historias'
  }
  if (normalized === '/estudio/materiais') {
    return 'materiais'
  }
  if (normalized === '/estudio/equipe') {
    return 'equipe'
  }
  if (normalized === '/estudio/clientes') {
    return 'clientes'
  }
  if (estudioClienteSlug(normalized)) {
    return 'cliente'
  }
  return 'inicio'
}

export function navHref(item: NavItem, route: Route): string {
  if (item.route) {
    return item.href
  }
  return route === 'home' ? item.href : `/${item.href}`
}

export function navigate(to: string): void {
  const url = new URL(to, window.location.origin)
  const next = `${url.pathname}${url.search}`
  const current = `${window.location.pathname}${window.location.search}`
  if (current === next) {
    return
  }
  window.history.pushState({}, '', next)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => resolveRoute(window.location.pathname))

  useEffect(() => {
    function sync() {
      setRoute(resolveRoute(window.location.pathname))
    }

    window.addEventListener('popstate', sync)
    return () => window.removeEventListener('popstate', sync)
  }, [])

  return route
}
