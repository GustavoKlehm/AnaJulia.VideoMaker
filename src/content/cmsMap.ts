import { fallbackPricing, fallbackSite } from './fallback'
import type {
  MediaAssetRow,
  PricingCatalog,
  PricingCustomRow,
  PricingLineRow,
  PricingOcasioesRow,
  PricingTierRow,
  SiteContent,
  SiteSettingsRow,
  SortableRow,
  StoryRow,
} from './types'

export function planWhatsappMessage(template: string, planName: string): string {
  return template.replaceAll('{name}', planName)
}

function mediaUrl(
  mediaById: Record<number, MediaAssetRow> | null,
  id: number | null | undefined,
): string | undefined {
  if (!id || !mediaById) {
    return undefined
  }
  return mediaById[id]?.public_url
}

export function mapSite(
  settings: SiteSettingsRow | null,
  stories: StoryRow[],
  mediaById: Record<number, MediaAssetRow> | null,
): SiteContent {
  if (!settings) {
    return structuredClone(fallbackSite)
  }

  const heroVideo = mediaUrl(mediaById, settings.hero_media_id) ?? fallbackSite.heroVideo
  const mappedStories =
    stories.length > 0
      ? [...stories]
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((story) => ({
            id: story.id,
            title: story.title,
            lead: story.lead,
            media: mediaUrl(mediaById, story.media_id),
          }))
      : structuredClone(fallbackSite.stories)

  return {
    slogan: settings.slogan,
    sloganLines: [settings.slogan_line_1, settings.slogan_line_2],
    rolesLine: settings.roles_line,
    brand: fallbackSite.brand,
    heroVideo,
    whatsappPhone: settings.whatsapp_phone,
    messages: {
      home: settings.whatsapp_home_message,
      plan: settings.whatsapp_plan_template,
      custom: settings.whatsapp_custom_message,
      planosCta: settings.whatsapp_planos_cta_message,
    },
    instagramUrl: settings.instagram_url,
    instagramDmUrl: settings.instagram_dm_url,
    showStories: settings.show_stories,
    about: {
      heading: settings.about_heading,
      p1: settings.about_p1,
      p2: settings.about_p2,
      ctaLabel: settings.about_cta_label,
    },
    contactCopy: {
      heading: settings.contact_heading,
      lead: settings.contact_lead,
      instagramLead: settings.instagram_lead,
    },
    seo: {
      title: settings.seo_title,
      description: settings.seo_description,
    },
    planos: {
      eyebrow: settings.planos_eyebrow,
      heading: settings.planos_heading,
      lead: settings.planos_lead,
      addonsHeading: fallbackSite.planos.addonsHeading,
      addonsLead: settings.planos_addons_lead,
      piecesHeading: settings.planos_pieces_heading,
      piecesLead: settings.planos_pieces_lead,
      rulesTitle: settings.planos_rules_title,
      rulesLead: settings.planos_rules_lead,
      ctaHeading: settings.planos_cta_heading,
    },
    stories: mappedStories,
  }
}

function sortRows<T extends { sort_order: number }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.sort_order - b.sort_order)
}

export function mapPricing(input: {
  lines: PricingLineRow[]
  tiers: PricingTierRow[]
  addOns: SortableRow[]
  pieces: SortableRow[]
  rules: SortableRow[]
  custom: PricingCustomRow | null
  ocasioes: PricingOcasioesRow | null
}): PricingCatalog {
  if (input.lines.length === 0) {
    return structuredClone(fallbackPricing)
  }

  const tiersByLine = new Map<string, PricingTierRow[]>()
  for (const tier of sortRows(input.tiers)) {
    const list = tiersByLine.get(tier.line_id) ?? []
    list.push(tier)
    tiersByLine.set(tier.line_id, list)
  }

  return {
    lines: sortRows(input.lines).map((line) => ({
      id: line.id,
      title: line.title,
      promise: line.promise,
      lead: line.lead,
      prompt: line.prompt,
      display: line.display === 'from' ? 'from' : 'exact',
      unit: line.unit === 'month' ? 'month' : 'project',
      tiers: (tiersByLine.get(line.id) ?? []).map((tier) => ({
        id: tier.id,
        name: tier.name,
        need: tier.need,
        capture: tier.capture,
        delivery: [...tier.delivery],
        hours: Number(tier.hours),
        price: Number(tier.price),
        featured: tier.featured,
      })),
    })),
    addOns: sortRows(input.addOns).map((item) => ({
      id: item.id,
      label: item.label ?? '',
      value: item.value ?? '',
    })),
    pieces: sortRows(input.pieces).map((item) => ({
      id: item.id,
      name: item.name ?? '',
      purpose: item.purpose ?? '',
      body: item.body ?? '',
    })),
    rules: sortRows(input.rules).map((item) => ({
      id: item.id,
      title: item.title ?? '',
      body: item.body ?? '',
    })),
    custom: input.custom
      ? {
          title: input.custom.title,
          lead: input.custom.lead,
          floor: Number(input.custom.floor),
        }
      : { ...fallbackPricing.custom },
    ocasioesChoices: input.ocasioes
      ? {
          receivePrompt: input.ocasioes.receive_prompt,
          timePrompt: input.ocasioes.time_prompt,
          bruto: {
            id: 'bruto',
            label: input.ocasioes.bruto_label,
            lead: input.ocasioes.bruto_lead,
          },
          editado: {
            id: 'editado',
            label: input.ocasioes.editado_label,
            lead: input.ocasioes.editado_lead,
          },
          meia: {
            id: 'meia',
            label: input.ocasioes.meia_label,
            lead: input.ocasioes.meia_lead,
          },
          diaria: {
            id: 'diaria',
            label: input.ocasioes.diaria_label,
            lead: input.ocasioes.diaria_lead,
          },
        }
      : structuredClone(fallbackPricing.ocasioesChoices),
  }
}
