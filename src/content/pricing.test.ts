import { describe, expect, it } from 'vitest'
import {
  HOURLY_COST,
  MARGIN,
  addOns,
  comboPrice,
  custom,
  formatBRL,
  hasCombo,
  lineTiers,
  lines,
  pairedCombos,
  pieces,
  rules,
} from './pricing'
import { whatsappLink } from './site'

const allTiers = lines.flatMap(lineTiers)
const allCategories = lines.flatMap((line) => line.categories)
const allServices = allCategories.flatMap((category) => category.services)
const FLOOR_RATE = HOURLY_COST * MARGIN
const CEILING_RATE = 130

function byId<T extends { id: string }>(items: readonly T[], id: string): T {
  const found = items.find((item) => item.id === id)
  if (!found) {
    throw new Error(`não achei ${id}`)
  }
  return found
}

describe('tabela de preços', () => {
  it('nenhum plano rende menos que o piso por hora', () => {
    for (const tier of allTiers) {
      expect(tier.price / tier.hours, `${tier.id} abaixo do piso`).toBeGreaterThanOrEqual(FLOOR_RATE)
    }
  })

  it('nenhum plano passa do teto por hora (sinal de horas subestimadas)', () => {
    for (const tier of allTiers) {
      expect(tier.price / tier.hours, `${tier.id} acima do teto`).toBeLessThanOrEqual(CEILING_RATE)
    }
  })

  it('nenhum plano fica abaixo do piso absoluto do personalizado', () => {
    for (const tier of allTiers) {
      expect(tier.price).toBeGreaterThanOrEqual(custom.floor)
    }
  })

  it('cada serviço tem no máximo um plano destacado', () => {
    for (const service of allServices) {
      const featured = service.tiers.filter((tier) => tier.featured)
      expect(featured.length, service.id).toBeLessThanOrEqual(1)
    }
  })

  it('os ids são únicos em todo o catálogo', () => {
    for (const ids of [
      allTiers.map((tier) => tier.id),
      allServices.map((service) => service.id),
      allCategories.map((category) => category.id),
    ]) {
      expect(new Set(ids).size).toBe(ids.length)
    }
  })

  it('os preços sobem dentro de cada serviço', () => {
    for (const service of allServices) {
      const prices = service.tiers.map((tier) => tier.price)
      expect(prices, service.id).toEqual([...prices].sort((a, b) => a - b))
    }
  })

  it('existem as duas linhas na ordem do catálogo', () => {
    expect(lines.map((line) => line.id)).toEqual(['momentos', 'marcas'])
  })

  it('Momentos tem as quatro categorias', () => {
    expect(byId(lines, 'momentos').categories.map((category) => category.id)).toEqual([
      'casamentos',
      'eventos',
      'festas',
      'ensaios',
    ])
  })

  it('cada linha tem uma promessa e cada plano uma necessidade', () => {
    for (const line of lines) {
      expect(line.promise.trim().length).toBeGreaterThan(0)
      expect(line.prompt.trim().length).toBeGreaterThan(0)
    }
    for (const tier of allTiers) {
      expect(tier.need.trim().length, tier.id).toBeGreaterThan(0)
    }
  })

  it('a linha Marcas é cobrada por mês', () => {
    expect(byId(lines, 'marcas').unit).toBe('month')
  })
})

describe('os dois juntos', () => {
  it('soma, aplica o desconto e arredonda para a dezena', () => {
    expect(comboPrice(550, 790, 0.15)).toBe(1140)
    expect(comboPrice(1390, 1890, 0.15)).toBe(2790)
    expect(comboPrice(390, 650, 0.05)).toBe(990)
  })

  it('casamentos, eventos e festas combinam o mesmo tempo de cobertura', () => {
    for (const id of ['casamentos', 'eventos', 'festas']) {
      const category = byId(allCategories, id)
      expect(category.comboMode).toBe('paired')
      expect(hasCombo(category), id).toBe(true)
      for (const pair of pairedCombos(category)) {
        expect(pair.first.capture, pair.first.id).toBe(pair.second.capture)
        expect(pair.price).toBeLessThan(pair.full)
      }
    }
  })

  it('os valores aprovados do combo de Momentos', () => {
    const prices = (id: string) => pairedCombos(byId(allCategories, id)).map((pair) => pair.price)
    expect(prices('casamentos')).toEqual([1140, 1990, 2790])
    expect(prices('eventos')).toEqual([970, 1770, 2360])
    expect(prices('festas')).toEqual([830, 1510, 2190])
  })

  it('ensaios não têm combo', () => {
    expect(hasCombo(byId(allCategories, 'ensaios'))).toBe(false)
  })

  it('Marcas combina um plano de vídeo com um de social media, com 5%', () => {
    const category = byId(allCategories, 'marcas-conteudo')
    expect(category.comboMode).toBe('free')
    expect(category.comboDiscount).toBe(0.05)
    expect(hasCombo(category)).toBe(true)
  })
})

describe('conteúdo de apoio', () => {
  it('o dicionário cobre stories, Reels e post estático', () => {
    expect(pieces.map((piece) => piece.id)).toEqual([
      'stories',
      'reel-momentos',
      'reels-curtos',
      'estatico',
    ])
  })

  it('as regras comerciais cobrem sinal, revisões, planos mensais e direitos', () => {
    const ids = rules.map((rule) => rule.id)
    for (const id of ['sinal', 'revisoes', 'mensal', 'social-escopo', 'direitos']) {
      expect(ids).toContain(id)
    }
  })

  it('todo adicional tem valor preenchido', () => {
    for (const addOn of addOns) {
      expect(addOn.value.trim().length).toBeGreaterThan(0)
    }
  })
})

describe('formatação', () => {
  it('formata em real sem centavos', () => {
    expect(formatBRL(690).replace(/ /g, ' ')).toBe('R$ 690')
  })

  it('formata milhar com separador', () => {
    expect(formatBRL(1190).replace(/ /g, ' ')).toBe('R$ 1.190')
  })

  it('monta o link de WhatsApp com a mensagem codificada', () => {
    const link = whatsappLink('Olá!')
    expect(link).toBe('https://api.whatsapp.com/send/?phone=5546999343683&text=Ol%C3%A1!')
  })
})
