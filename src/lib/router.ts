import { useEffect, useState } from 'react'
import type { NavItem } from '../content/site'

export type Route = 'home' | 'planos'

export function resolveRoute(pathname: string): Route {
  const normalized = pathname.replace(/\/+$/, '')
  return normalized === '/planos' ? 'planos' : 'home'
}

export function navHref(item: NavItem, route: Route): string {
  if (item.route) {
    return item.href
  }
  return route === 'home' ? item.href : `/${item.href}`
}

export function navigate(to: string): void {
  if (window.location.pathname === to) {
    return
  }
  window.history.pushState({}, '', to)
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
