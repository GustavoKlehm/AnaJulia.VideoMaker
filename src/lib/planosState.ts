import { useEffect, useState } from 'react'
import { navigate } from './router'

export type LineId = 'momentos' | 'ocasioes' | 'marcas'
export type Entrega = 'bruto' | 'editado'
export type Tempo = 'meia' | 'diaria'
export type CatalogView = 'guided' | 'all'

export type PlanosState = {
  view: CatalogView
  tipo: LineId | null
  plano: string | null
  entrega: Entrega | null
  tempo: Tempo | null
}

const LINE_IDS = new Set<LineId>(['momentos', 'ocasioes', 'marcas'])
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const TIER_LINE: Record<string, LineId> = {
  retrato: 'momentos',
  historia: 'momentos',
  capitulo: 'momentos',
  'captacao-meia': 'ocasioes',
  'captacao-diaria': 'ocasioes',
  'meia-diaria': 'ocasioes',
  diaria: 'ocasioes',
  presenca: 'marcas',
  ritmo: 'marcas',
  narrativa: 'marcas',
}
const ENTREGAS = new Set<Entrega>(['bruto', 'editado'])
const TEMPOS = new Set<Tempo>(['meia', 'diaria'])

const OCASIOES_TIERS: Record<`${Entrega}-${Tempo}`, string> = {
  'bruto-meia': 'captacao-meia',
  'bruto-diaria': 'captacao-diaria',
  'editado-meia': 'meia-diaria',
  'editado-diaria': 'diaria',
}

const OCASIOES_FROM_TIER: Record<string, { entrega: Entrega; tempo: Tempo }> = {
  'captacao-meia': { entrega: 'bruto', tempo: 'meia' },
  'captacao-diaria': { entrega: 'bruto', tempo: 'diaria' },
  'meia-diaria': { entrega: 'editado', tempo: 'meia' },
  diaria: { entrega: 'editado', tempo: 'diaria' },
}

export type PlanRecommendation = {
  tipo: LineId
  plano: string
}

export function planosStateFromRecommendation(
  recommendation: PlanRecommendation,
): PlanosState | null {
  const ownedBy = TIER_LINE[recommendation.plano]
  if (!ownedBy || ownedBy !== recommendation.tipo) {
    return null
  }

  if (recommendation.tipo === 'ocasioes') {
    const cut = OCASIOES_FROM_TIER[recommendation.plano]
    if (!cut) {
      return null
    }
    return {
      view: 'guided',
      tipo: 'ocasioes',
      plano: null,
      entrega: cut.entrega,
      tempo: cut.tempo,
    }
  }

  return {
    view: 'guided',
    tipo: recommendation.tipo,
    plano: recommendation.plano,
    entrega: null,
    tempo: null,
  }
}

function readParam(params: URLSearchParams, key: string): string | null {
  return params.get(key)
}

export function parsePlanosSearch(search: string): PlanosState {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  const view: CatalogView = readParam(params, 'ver') === 'todos' ? 'all' : 'guided'

  const tipoRaw = readParam(params, 'tipo')
  const tipo = tipoRaw && LINE_IDS.has(tipoRaw as LineId) ? (tipoRaw as LineId) : null

  const entregaRaw = readParam(params, 'entrega')
  const entrega =
    tipo === 'ocasioes' && entregaRaw && ENTREGAS.has(entregaRaw as Entrega)
      ? (entregaRaw as Entrega)
      : null

  const tempoRaw = readParam(params, 'tempo')
  const tempo =
    tipo === 'ocasioes' && tempoRaw && TEMPOS.has(tempoRaw as Tempo)
      ? (tempoRaw as Tempo)
      : null

  const planoRaw = readParam(params, 'plano')
  const ownedBy = planoRaw ? TIER_LINE[planoRaw] : undefined
  const plano =
    tipo &&
    tipo !== 'ocasioes' &&
    planoRaw &&
    SLUG.test(planoRaw) &&
    (!ownedBy || ownedBy === tipo)
      ? planoRaw
      : null

  return { view, tipo, plano, entrega, tempo }
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
  if (state.entrega) {
    params.set('entrega', state.entrega)
  }
  if (state.tempo) {
    params.set('tempo', state.tempo)
  }
  const query = params.toString()
  return query ? `?${query}` : ''
}

export function ocasioesTierId(entrega: Entrega | null, tempo: Tempo | null): string | null {
  if (!entrega || !tempo) {
    return null
  }
  return OCASIOES_TIERS[`${entrega}-${tempo}`]
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
