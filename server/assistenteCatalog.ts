import { addOns, custom, lines, pieces, rules } from '../src/content/pricing'
import type { AssistenteCatalog } from './assistenteKnowledge'

export function fallbackAssistenteCatalog(): AssistenteCatalog {
  return {
    slogan: 'Transformando momentos em histórias',
    about: {
      heading: 'Sobre',
      p1: 'Acreditamos que cada história começa nas experiências, nos detalhes e nos momentos que merecem ser contados.',
      p2: 'Registramos marcas, eventos e momentos especiais.',
    },
    contact: {
      heading: 'Contato',
      lead: 'Conte o momento que você quer guardar',
    },
    lines: lines.map((line) => ({
      id: line.id,
      title: line.title,
      promise: line.promise,
      lead: line.lead,
      tiers: line.tiers.map((tier) => ({
        id: tier.id,
        name: tier.name,
        need: tier.need,
        capture: tier.capture,
        delivery: [...tier.delivery],
        price: tier.price,
      })),
    })),
    addOns: addOns.map((item) => ({ label: item.label, value: item.value })),
    pieces: pieces.map((item) => ({
      name: item.name,
      purpose: item.purpose,
      body: item.body,
    })),
    rules: rules.map((item) => ({ title: item.title, body: item.body })),
    custom: { ...custom },
  }
}
