import { describe, expect, it } from 'vitest'
import {
  HOURLY_COST,
  MARGIN,
  addOns,
  custom,
  formatBRL,
  lines,
  pieces,
  rules,
} from './pricing'
import { whatsappLink } from './site'

const allTiers = lines.flatMap((line) => line.tiers)

describe('tabela de preços', () => {
  it('nenhum pacote fica abaixo do piso da fórmula', () => {
    for (const tier of allTiers) {
      const floor = tier.hours * HOURLY_COST * MARGIN
      expect(tier.price, `${tier.id} abaixo do piso`).toBeGreaterThanOrEqual(floor)
    }
  })

  it('nenhum pacote passa de 25% acima do piso', () => {
    for (const tier of allTiers) {
      const floor = tier.hours * HOURLY_COST * MARGIN
      expect(tier.price, `${tier.id} arredondado demais`).toBeLessThanOrEqual(floor * 1.25)
    }
  })

  it('nenhum pacote fica abaixo do piso absoluto do personalizado', () => {
    for (const tier of allTiers) {
      expect(tier.price).toBeGreaterThanOrEqual(custom.floor)
    }
  })

  it('cada linha tem no máximo um pacote destacado', () => {
    for (const line of lines) {
      const featured = line.tiers.filter((tier) => tier.featured)
      expect(featured.length, `linha ${line.id}`).toBeLessThanOrEqual(1)
    }
  })

  it('os destacados são exatamente o História e o Ritmo', () => {
    const featured = allTiers.filter((tier) => tier.featured).map((tier) => tier.id)
    expect(featured).toEqual(['historia', 'ritmo'])
  })

  it('os ids são únicos em todo o catálogo', () => {
    const ids = allTiers.map((tier) => tier.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('os preços sobem dentro de cada linha', () => {
    for (const line of lines) {
      const prices = line.tiers.map((tier) => tier.price)
      const sorted = [...prices].sort((a, b) => a - b)
      expect(prices, `linha ${line.id}`).toEqual(sorted)
    }
  })

  it('existem as três linhas na ordem do catálogo', () => {
    expect(lines.map((line) => line.id)).toEqual(['momentos', 'ocasioes', 'marcas'])
  })

  it('a linha Marcas é cobrada por mês', () => {
    const marcas = lines.find((line) => line.id === 'marcas')
    expect(marcas?.unit).toBe('month')
  })
})

describe('conteúdo de apoio', () => {
  it('o dicionário cobre filme, teaser e cortes', () => {
    const ids = pieces.map((piece) => piece.id)
    expect(ids).toContain('filme')
    expect(ids).toContain('teaser')
    expect(ids).toContain('cortes')
  })

  it('as regras comerciais cobrem sinal, revisões e direitos', () => {
    const ids = rules.map((rule) => rule.id)
    expect(ids).toContain('sinal')
    expect(ids).toContain('revisoes')
    expect(ids).toContain('direitos')
  })

  it('todo adicional tem valor preenchido', () => {
    for (const addOn of addOns) {
      expect(addOn.value.trim().length).toBeGreaterThan(0)
    }
  })
})

describe('formatação', () => {
  it('formata em real sem centavos', () => {
    expect(formatBRL(690).replace(/\u00a0/g, ' ')).toBe('R$ 690')
  })

  it('formata milhar com separador', () => {
    expect(formatBRL(1190).replace(/\u00a0/g, ' ')).toBe('R$ 1.190')
  })

  it('monta o link de WhatsApp com a mensagem codificada', () => {
    const link = whatsappLink('Olá!')
    expect(link).toBe('https://api.whatsapp.com/send/?phone=5546999343683&text=Ol%C3%A1!')
  })
})
