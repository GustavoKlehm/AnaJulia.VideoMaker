import { useEffect, useState } from 'react'
import { navigate } from './router'

export type LineId = 'momentos' | 'marcas'
export type CatalogView = 'guided' | 'all'

/** Aba aberta dentro da categoria: o id de um serviço ou o combo dos dois. */
export const COMBO = 'os-dois'

export type PlanosState = {
  view: CatalogView
  tipo: LineId | null
  /** Categoria (Casamentos, Eventos...). */
  cat: string | null
  /** Serviço aberto (storymaker, videomaker...) ou COMBO. */
  serv: string | null
  plano: string | null
  /** Segundo plano, só no combo em que o cliente escolhe um de cada. */
  plano2: string | null
}

const LINE_IDS = new Set<LineId>(['momentos', 'marcas'])
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function slugParam(params: URLSearchParams, key: string): string | null {
  const value = params.get(key)
  return value && SLUG.test(value) ? value : null
}

export function emptyPlanosState(): PlanosState {
  return { view: 'guided', tipo: null, cat: null, serv: null, plano: null, plano2: null }
}

/**
 * Lê só a forma dos parâmetros. Se o id existe no catálogo é a página que confere,
 * porque o catálogo é editável pelo estúdio.
 */
export function parsePlanosSearch(search: string): PlanosState {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  if (params.get('ver') === 'todos') {
    return { ...emptyPlanosState(), view: 'all' }
  }

  const tipoRaw = params.get('tipo')
  const tipo = tipoRaw && LINE_IDS.has(tipoRaw as LineId) ? (tipoRaw as LineId) : null
  if (!tipo) {
    return emptyPlanosState()
  }

  const cat = slugParam(params, 'cat')
  const serv = cat ? slugParam(params, 'serv') : null
  const plano = serv ? slugParam(params, 'plano') : null
  const plano2 = serv === COMBO ? slugParam(params, 'plano2') : null

  return { view: 'guided', tipo, cat, serv, plano, plano2 }
}

export function serializePlanosSearch(state: PlanosState): string {
  const params = new URLSearchParams()
  if (state.view === 'all') {
    params.set('ver', 'todos')
    return `?${params.toString()}`
  }
  const entries: [string, string | null][] = [
    ['tipo', state.tipo],
    ['cat', state.cat],
    ['serv', state.serv],
    ['plano', state.plano],
    ['plano2', state.plano2],
  ]
  for (const [key, value] of entries) {
    if (value) {
      params.set(key, value)
    }
  }
  const query = params.toString()
  return query ? `?${query}` : ''
}

export function planosHref(state: PlanosState): string {
  return `/planos${serializePlanosSearch(state)}`
}

export function usePlanosState(): [PlanosState, (next: PlanosState) => void] {
  const [state, setState] = useState<PlanosState>(() =>
    parsePlanosSearch(window.location.search),
  )

  useEffect(() => {
    function sync() {
      setState(parsePlanosSearch(window.location.search))
    }

    window.addEventListener('popstate', sync)
    return () => window.removeEventListener('popstate', sync)
  }, [])

  function replace(next: PlanosState) {
    setState(next)
    navigate(planosHref(next))
  }

  return [state, replace]
}
