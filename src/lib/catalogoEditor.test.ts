import { describe, expect, it } from 'vitest'
import { fallbackPricing } from '../content/fallback'
import type { Tier } from '../content/pricing'
import {
  allTierIds,
  duplicateTier,
  isDirty,
  locate,
  moveItem,
  parentOf,
  priceRange,
  sameSelection,
  siteHref,
  tierWarnings,
  uniqueId,
} from './catalogoEditor'

const catalog = structuredClone(fallbackPricing)
const line = catalog.lines[0]
const category = line.categories[0]
const service = category.services[0]
const tier = service.tiers[0]

const tierSelection = {
  kind: 'tier' as const,
  line: line.id,
  cat: category.id,
  serv: service.id,
  tier: tier.id,
}

describe('locate', () => {
  it('acha um plano pelos ids', () => {
    const found = locate(catalog, tierSelection)
    expect(found?.tier?.id).toBe(tier.id)
    expect(found?.serviceIndex).toBe(0)
  })

  it('devolve null quando o item foi removido', () => {
    expect(locate(catalog, { ...tierSelection, tier: 'nao-existe' })).toBeNull()
    expect(locate(catalog, { kind: 'line', line: 'nao-existe' })).toBeNull()
  })
})

describe('parentOf', () => {
  it('sobe um nível por vez até a linha', () => {
    const service = parentOf(tierSelection)
    expect(service?.kind).toBe('service')
    const cat = parentOf(service!)
    expect(cat?.kind).toBe('category')
    const ln = parentOf(cat!)
    expect(ln).toEqual({ kind: 'line', line: line.id })
    expect(parentOf(ln!)).toBeNull()
  })
})

describe('sameSelection', () => {
  it('compara tipo e caminho', () => {
    expect(sameSelection(tierSelection, { ...tierSelection })).toBe(true)
    expect(sameSelection(tierSelection, parentOf(tierSelection))).toBe(false)
    expect(sameSelection(null, null)).toBe(true)
  })
})

describe('moveItem', () => {
  it('troca com o vizinho', () => {
    expect(moveItem(['a', 'b', 'c'], 0, 1)).toEqual(['b', 'a', 'c'])
    expect(moveItem(['a', 'b', 'c'], 2, -1)).toEqual(['a', 'c', 'b'])
  })

  it('não sai dos limites', () => {
    const items = ['a', 'b']
    expect(moveItem(items, 0, -1)).toBe(items)
    expect(moveItem(items, 1, 1)).toBe(items)
  })
})

describe('uniqueId', () => {
  it('numera quando o id já existe', () => {
    expect(uniqueId(['plano'], 'Plano')).toBe('plano-2')
    expect(uniqueId(['plano', 'plano-2'], 'plano')).toBe('plano-3')
    expect(uniqueId([], 'Novo Plano')).toBe('novo-plano')
  })
})

describe('duplicateTier', () => {
  it('gera id novo e não copia o destaque', () => {
    const copy = duplicateTier(catalog, { ...tier, featured: true }, service.id)
    expect(allTierIds(catalog)).not.toContain(copy.id)
    expect(copy.featured).toBe(false)
    expect(copy.name).toContain('(cópia)')
    expect(copy.delivery).not.toBe(tier.delivery)
  })
})

describe('priceRange', () => {
  const at = (price: number): Tier => ({ ...tier, price })
  it('mostra faixa ou valor único', () => {
    expect(priceRange([])).toBe('sem planos')
    expect(priceRange([at(350)])).toBe('R$ 350')
    expect(priceRange([at(900), at(350)])).toBe('R$ 350–900')
    expect(priceRange([at(1200), at(3500)])).toBe('R$ 1.200–3.500')
  })
})

describe('siteHref', () => {
  it('leva ao plano em /planos', () => {
    expect(siteHref(tierSelection)).toBe(
      `/planos?tipo=${line.id}&cat=${category.id}&serv=${service.id}&plano=${tier.id}`,
    )
    expect(siteHref({ kind: 'line', line: line.id })).toBe(`/planos?tipo=${line.id}`)
  })
})

describe('tierWarnings', () => {
  it('aponta nome vazio, preço zerado e sem entregas', () => {
    expect(tierWarnings(tier)).toEqual([])
    expect(tierWarnings({ ...tier, name: ' ', price: 0, delivery: [''] })).toHaveLength(3)
  })
})

describe('isDirty', () => {
  it('detecta qualquer mudança', () => {
    const copy = structuredClone(catalog)
    expect(isDirty(copy, catalog)).toBe(false)
    copy.lines[0].categories[0].services[0].tiers[0].price += 10
    expect(isDirty(copy, catalog)).toBe(true)
  })
})
