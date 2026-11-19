import type { Category, PricingLine, Service, Tier } from '../content/pricing'
import type { PricingCatalog } from '../content/types'
import { slugify } from '../content/cmsSave'
import { planosHref } from './planosState'
import type { LineId } from './planosState'

/** O que está aberto no painel de detalhe. Ids, não índices: sobrevivem a mover e remover. */
export type Selection =
  | { kind: 'line'; line: string }
  | { kind: 'category'; line: string; cat: string }
  | { kind: 'service'; line: string; cat: string; serv: string }
  | { kind: 'tier'; line: string; cat: string; serv: string; tier: string }

export type Located = {
  lineIndex: number
  line: PricingLine
  categoryIndex?: number
  category?: Category
  serviceIndex?: number
  service?: Service
  tierIndex?: number
  tier?: Tier
}

/** Acha o item selecionado no catálogo. `null` quando ele foi removido. */
export function locate(catalog: PricingCatalog, selection: Selection): Located | null {
  const lineIndex = catalog.lines.findIndex((item) => item.id === selection.line)
  if (lineIndex < 0) {
    return null
  }
  const line = catalog.lines[lineIndex]
  if (selection.kind === 'line') {
    return { lineIndex, line }
  }

  const categoryIndex = line.categories.findIndex((item) => item.id === selection.cat)
  if (categoryIndex < 0) {
    return null
  }
  const category = line.categories[categoryIndex]
  if (selection.kind === 'category') {
    return { lineIndex, line, categoryIndex, category }
  }

  const serviceIndex = category.services.findIndex((item) => item.id === selection.serv)
  if (serviceIndex < 0) {
    return null
  }
  const service = category.services[serviceIndex]
  if (selection.kind === 'service') {
    return { lineIndex, line, categoryIndex, category, serviceIndex, service }
  }

  const tierIndex = service.tiers.findIndex((item) => item.id === selection.tier)
  if (tierIndex < 0) {
    return null
  }
  return {
    lineIndex,
    line,
    categoryIndex,
    category,
    serviceIndex,
    service,
    tierIndex,
    tier: service.tiers[tierIndex],
  }
}

/** Sobe um nível. Usado quando o item aberto some (removido) e no "voltar". */
export function parentOf(selection: Selection): Selection | null {
  switch (selection.kind) {
    case 'line':
      return null
    case 'category':
      return { kind: 'line', line: selection.line }
    case 'service':
      return { kind: 'category', line: selection.line, cat: selection.cat }
    case 'tier':
      return { kind: 'service', line: selection.line, cat: selection.cat, serv: selection.serv }
  }
}

/** Ids dos ancestrais (e do próprio item), para abrir a árvore até ele. */
export function selectionPath(selection: Selection): string[] {
  switch (selection.kind) {
    case 'line':
      return [selection.line]
    case 'category':
      return [selection.line, selection.cat]
    case 'service':
      return [selection.line, selection.cat, selection.serv]
    case 'tier':
      return [selection.line, selection.cat, selection.serv, selection.tier]
  }
}

export function sameSelection(a: Selection | null, b: Selection | null): boolean {
  if (!a || !b) {
    return a === b
  }
  return a.kind === b.kind && selectionPath(a).join('/') === selectionPath(b).join('/')
}

/** Troca o item de lugar com o vizinho. Fora dos limites devolve a mesma lista. */
export function moveItem<T>(items: T[], index: number, delta: -1 | 1): T[] {
  const target = index + delta
  if (index < 0 || index >= items.length || target < 0 || target >= items.length) {
    return items
  }
  const next = [...items]
  const [item] = next.splice(index, 1)
  next.splice(target, 0, item)
  return next
}

export function uniqueId(usedIds: Iterable<string>, base: string): string {
  const used = new Set(usedIds)
  const clean = slugify(base) || 'item'
  if (!used.has(clean)) {
    return clean
  }
  let index = 2
  while (used.has(`${clean}-${index}`)) {
    index += 1
  }
  return `${clean}-${index}`
}

export function allCategoryIds(catalog: PricingCatalog): string[] {
  return catalog.lines.flatMap((line) => line.categories.map((category) => category.id))
}

export function allServiceIds(catalog: PricingCatalog): string[] {
  return catalog.lines.flatMap((line) =>
    line.categories.flatMap((category) => category.services.map((service) => service.id)),
  )
}

export function allTierIds(catalog: PricingCatalog): string[] {
  return catalog.lines.flatMap((line) =>
    line.categories.flatMap((category) =>
      category.services.flatMap((service) => service.tiers.map((tier) => tier.id)),
    ),
  )
}

/** Cópia de um plano com id novo. A cópia nunca nasce como "Mais escolhido". */
export function duplicateTier(catalog: PricingCatalog, tier: Tier, serviceId: string): Tier {
  return {
    ...structuredClone(tier),
    id: uniqueId(allTierIds(catalog), `${serviceId}-${tier.name}-copia`),
    name: `${tier.name} (cópia)`,
    featured: false,
  }
}

/** Faixa de preço de um serviço para mostrar na árvore: "R$ 350–900". */
export function priceRange(tiers: Tier[]): string {
  if (tiers.length === 0) {
    return 'sem planos'
  }
  const prices = tiers.map((tier) => tier.price)
  const low = Math.min(...prices)
  const high = Math.max(...prices)
  const fmt = (value: number) => value.toLocaleString('pt-BR')
  return low === high ? `R$ ${fmt(low)}` : `R$ ${fmt(low)}–${fmt(high)}`
}

/** Link para ver o item como o cliente vê em /planos. */
export function siteHref(selection: Selection): string {
  const tipo = selection.line === 'momentos' || selection.line === 'marcas'
    ? (selection.line as LineId)
    : null
  return planosHref({
    view: 'guided',
    tipo,
    cat: selection.kind === 'line' ? null : selection.cat,
    serv: selection.kind === 'service' || selection.kind === 'tier' ? selection.serv : null,
    plano: selection.kind === 'tier' ? selection.tier : null,
    plano2: null,
  })
}

/** Avisos que não impedem salvar, mas que a Ana Julia precisa ver. */
export function tierWarnings(tier: Tier): string[] {
  const warnings: string[] = []
  if (!tier.name.trim()) {
    warnings.push('Sem nome.')
  }
  if (!(tier.price > 0)) {
    warnings.push('Preço zerado.')
  }
  if (tier.delivery.every((item) => !item.trim())) {
    warnings.push('Nenhuma entrega listada.')
  }
  return warnings
}

export function isDirty(current: PricingCatalog, baseline: PricingCatalog): boolean {
  return JSON.stringify(current) !== JSON.stringify(baseline)
}
