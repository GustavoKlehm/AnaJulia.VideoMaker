import type { AddOn, Piece, PricingLine, Rule } from './pricing'

export type StoryContent = {
  id: string
  title: string
  lead: string
  media?: string
}

export type SiteContent = {
  slogan: string
  sloganLines: [string, string]
  rolesLine: string
  brand: {
    wordmark: string
    icon: string
    iconNegative: string
  }
  heroVideo: string
  whatsappPhone: string
  messages: {
    home: string
    plan: string
    custom: string
    planosCta: string
  }
  instagramUrl: string
  instagramDmUrl: string
  showStories: boolean
  about: {
    heading: string
    p1: string
    p2: string
    ctaLabel: string
  }
  contactCopy: {
    heading: string
    lead: string
    instagramLead: string
  }
  seo: {
    title: string
    description: string
  }
  planos: {
    eyebrow: string
    heading: string
    lead: string
    addonsHeading: string
    addonsLead: string
    piecesHeading: string
    piecesLead: string
    rulesTitle: string
    rulesLead: string
    ctaHeading: string
  }
  stories: StoryContent[]
}

export type OcasioesChoices = {
  receivePrompt: string
  timePrompt: string
  bruto: { id: 'bruto'; label: string; lead: string }
  editado: { id: 'editado'; label: string; lead: string }
  meia: { id: 'meia'; label: string; lead: string }
  diaria: { id: 'diaria'; label: string; lead: string }
}

export type PricingCatalog = {
  lines: PricingLine[]
  addOns: AddOn[]
  pieces: Piece[]
  rules: Rule[]
  custom: {
    title: string
    lead: string
    floor: number
  }
  ocasioesChoices: OcasioesChoices
}

export type MediaAssetRow = {
  id: number
  bucket?: string
  path?: string
  public_url: string
  kind: 'video' | 'image' | string
  alt: string
  title?: string | null
}

export type SiteSettingsRow = {
  slogan: string
  slogan_line_1: string
  slogan_line_2: string
  roles_line: string
  about_heading: string
  about_p1: string
  about_p2: string
  about_cta_label: string
  contact_heading: string
  contact_lead: string
  instagram_lead: string
  whatsapp_phone: string
  whatsapp_home_message: string
  whatsapp_plan_template: string
  whatsapp_custom_message: string
  whatsapp_planos_cta_message: string
  instagram_url: string
  instagram_dm_url: string
  seo_title: string
  seo_description: string
  show_stories: boolean
  hero_media_id: number | null
  planos_eyebrow: string
  planos_heading: string
  planos_lead: string
  planos_addons_lead: string
  planos_pieces_heading: string
  planos_pieces_lead: string
  planos_rules_title: string
  planos_rules_lead: string
  planos_cta_heading: string
}

export type StoryRow = {
  id: string
  title: string
  lead: string
  media_id: number | null
  sort_order: number
}

export type PricingLineRow = {
  id: string
  title: string
  promise: string
  lead: string
  prompt: string
  display: 'exact' | 'from' | string
  unit: 'project' | 'month' | string
  sort_order: number
}

export type PricingTierRow = {
  id: string
  line_id: string
  name: string
  need: string
  capture: string
  delivery: string[]
  hours: number
  price: number
  featured: boolean
  sort_order: number
}

export type SortableRow = {
  id: string
  label?: string
  value?: string
  name?: string
  purpose?: string
  body?: string
  title?: string
  sort_order: number
}

export type PricingCustomRow = {
  title: string
  lead: string
  floor: number
}

export type PricingOcasioesRow = {
  receive_prompt: string
  time_prompt: string
  bruto_label: string
  bruto_lead: string
  editado_label: string
  editado_lead: string
  meia_label: string
  meia_lead: string
  diaria_label: string
  diaria_lead: string
}
