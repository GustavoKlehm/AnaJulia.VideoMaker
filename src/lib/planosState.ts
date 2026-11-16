import { useEffect, useState } from 'react'
import { navigate } from './router'

export type LineId = 'momentos' | 'marcas'
export type CatalogView = 'guided' | 'all'

export type PlanosState = {
  view: CatalogView
  tipo: LineId | null
  plano: string | null
}

const LINE_IDS = new Set<LineId>(['momentos', 'marcas'])
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const TIER_LINE: Record<string, LineId> = {
  retrato: 'momentos',
  historia: 'momentos',
  capitulo: 'momentos',
  presenca: 'marcas',
  ritmo: 'marcas',
  narrativa: 'marcas',
}

function readParam(params: URLSearchParams, key: string): string | null {
  return params.get(key)
}

export function parsePlanosSearch(search: string): PlanosState {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  const view: CatalogView = readParam(params, 'ver') === 'todos' ? 'all' : 'guided'

  const tipoRaw = readParam(params, 'tipo')
  const tipo = tipoRaw && LINE_IDS.has(tipoRaw as LineId) ? (tipoRaw as LineId) : null

  const planoRaw = readParam(params, 'plano')
  const ownedBy = planoRaw ? TIER_LINE[planoRaw] : undefined
  const plano =
    tipo && planoRaw && SLUG.test(planoRaw) && (!ownedBy || ownedBy === tipo) ? planoRaw : null

  return { view, tipo, plano }
}

export function serializePlanosSearch(state: PlanosState): string {
  const params = new URLSearchParams()
  if (state.view === 'all') {
    params.set('ver', 'todos')
    const query = params.toString()
    return query ? `?${query}` : ''
  }
  if (state.tipo) {
    params.set('tipo', state.tipo)
  }
  if (state.plano) {
    params.set('plano', state.plano)
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
