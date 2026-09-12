import {
  addOns,
  custom,
  lines,
  ocasioesChoices,
  pieces,
  rules,
} from './pricing'
import { brand, contact, hero, showStories, slogan, sloganLines, stories, whatsappPhone } from './site'
import type { PricingCatalog, SiteContent } from './types'

export const fallbackSite: SiteContent = {
  slogan,
  sloganLines: [sloganLines[0], sloganLines[1]],
  rolesLine: 'Storymaker · Videomaker',
  brand,
  heroVideo: hero.video,
  whatsappPhone,
  messages: {
    home: 'Olá! Vim pelo site e gostaria de conhecer melhor o seu trabalho. 😊',
    plan: 'Olá! Vim pelo site e queria saber mais sobre o plano {name}.',
    custom: 'Olá! Vim pelo site e queria um orçamento personalizado.',
    planosCta: 'Olá! Vim pela página de planos e queria conversar sobre um projeto.',
  },
  instagramUrl: contact.instagram,
  instagramDmUrl: contact.instagramDm,
  showStories,
  about: {
    heading: 'Sobre',
    p1: 'Acreditamos que cada história começa nas experiências, nos detalhes e nos momentos que merecem ser contados.',
    p2: 'Registramos marcas, eventos e momentos especiais.',
    ctaLabel: 'Ver planos e valores',
  },
  contactCopy: {
    heading: 'Contato',
    lead: 'Conte o momento\nque você quer guardar',
    instagramLead: 'Conheça meu trabalho\nno Instagram',
  },
  seo: {
    title: 'Ana Julia — Storymaker e Videomaker',
    description:
      'Ana Julia — Storymaker e Videomaker. Transformando momentos em histórias.',
  },
  planos: {
    eyebrow: 'Planos',
    heading: 'O que você quer guardar?',
    lead: 'Escolha o que você procura. O restante da página se adapta.',
    addonsHeading: 'Adicionais',
    addonsLead:
      'Valem para qualquer plano e sempre aparecem discriminados no orçamento, nunca embutidos no total.',
    piecesHeading: 'O que é cada peça',
    piecesLead:
      'O filme é para guardar, o teaser é para postar, os cortes são para não sumir do feed. Cada um dá um trabalho diferente — é por isso que os planos custam preços diferentes.',
    rulesTitle: 'Como funciona',
    rulesLead: 'As mesmas condições para todo mundo, combinadas antes de começar.',
    ctaHeading: 'Conte o momento que você quer guardar',
  },
  stories: stories.map((story) => ({ ...story })),
}

export const fallbackPricing: PricingCatalog = {
  lines: lines.map((line) => ({
    ...line,
    tiers: line.tiers.map((tier) => ({ ...tier, delivery: [...tier.delivery] })),
  })),
  addOns: addOns.map((item) => ({ ...item })),
  pieces: pieces.map((item) => ({ ...item })),
  rules: rules.map((item) => ({ ...item })),
  custom: { ...custom },
  ocasioesChoices: {
    receivePrompt: ocasioesChoices.receivePrompt,
    timePrompt: ocasioesChoices.timePrompt,
    bruto: { ...ocasioesChoices.bruto },
    editado: { ...ocasioesChoices.editado },
    meia: { ...ocasioesChoices.meia },
    diaria: { ...ocasioesChoices.diaria },
  },
}
