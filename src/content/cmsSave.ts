import type { SupabaseClient } from '@supabase/supabase-js'
import type { PricingCatalog, SiteContent } from './types'

export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function throwIfError(error: { message: string } | null, label: string): void {
  if (error) {
    throw new Error(`${label}: ${error.message}`)
  }
}

export async function saveSiteSettings(
  client: SupabaseClient,
  site: SiteContent,
  heroMediaId: number | null,
): Promise<void> {
  const { error } = await client
    .from('site_settings')
    .update({
      slogan: site.slogan,
      slogan_line_1: site.sloganLines[0],
      slogan_line_2: site.sloganLines[1],
      roles_line: site.rolesLine,
      about_heading: site.about.heading,
      about_p1: site.about.p1,
      about_p2: site.about.p2,
      about_cta_label: site.about.ctaLabel,
      contact_heading: site.contactCopy.heading,
      contact_lead: site.contactCopy.lead,
      instagram_lead: site.contactCopy.instagramLead,
      whatsapp_phone: site.whatsappPhone,
      whatsapp_home_message: site.messages.home,
      whatsapp_plan_template: site.messages.plan,
      whatsapp_custom_message: site.messages.custom,
      whatsapp_planos_cta_message: site.messages.planosCta,
      instagram_url: site.instagramUrl,
      instagram_dm_url: site.instagramDmUrl,
      seo_title: site.seo.title,
      seo_description: site.seo.description,
      show_stories: site.showStories,
      hero_media_id: heroMediaId,
      planos_eyebrow: site.planos.eyebrow,
      planos_heading: site.planos.heading,
      planos_lead: site.planos.lead,
      planos_addons_lead: site.planos.addonsLead,
      planos_pieces_heading: site.planos.piecesHeading,
      planos_pieces_lead: site.planos.piecesLead,
      planos_rules_title: site.planos.rulesTitle,
      planos_rules_lead: site.planos.rulesLead,
      planos_cta_heading: site.planos.ctaHeading,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 1)

  throwIfError(error, 'site_settings')
}

export async function saveStories(
  client: SupabaseClient,
  stories: SiteContent['stories'],
  mediaIdByStory: Record<string, number | null>,
): Promise<void> {
  const rows = stories.map((story, index) => ({
    id: story.id,
    title: story.title,
    lead: story.lead,
    media_id: mediaIdByStory[story.id] ?? null,
    sort_order: index,
  }))

  const { error } = await client.from('stories').upsert(rows)
  throwIfError(error, 'stories')
}

export async function savePricing(client: SupabaseClient, catalog: PricingCatalog): Promise<void> {
  const lineRows = catalog.lines.map((line, index) => ({
    id: line.id,
    title: line.title,
    promise: line.promise,
    lead: line.lead,
    prompt: line.prompt,
    display: line.display,
    unit: line.unit,
    sort_order: index,
  }))

  const { error: lineError } = await client.from('pricing_lines').upsert(lineRows)
  throwIfError(lineError, 'pricing_lines')

  const { data: existingTiers, error: existingError } = await client
    .from('pricing_tiers')
    .select('id')
  throwIfError(existingError, 'pricing_tiers.select')

  const keepIds = new Set(catalog.lines.flatMap((line) => line.tiers.map((tier) => tier.id)))
  const removeIds = (existingTiers ?? [])
    .map((row) => row.id as string)
    .filter((id) => !keepIds.has(id))

  if (removeIds.length > 0) {
    const { error } = await client.from('pricing_tiers').delete().in('id', removeIds)
    throwIfError(error, 'pricing_tiers.delete')
  }

  const tierRows = catalog.lines.flatMap((line) =>
    line.tiers.map((tier, index) => ({
      id: tier.id,
      line_id: line.id,
      name: tier.name,
      need: tier.need,
      capture: tier.capture,
      delivery: [...tier.delivery],
      hours: tier.hours,
      price: tier.price,
      featured: tier.featured,
      sort_order: index,
    })),
  )

  const { error: tierError } = await client.from('pricing_tiers').upsert(tierRows)
  throwIfError(tierError, 'pricing_tiers')

  await replaceCollection(client, 'pricing_addons', catalog.addOns.map((item, index) => ({
    id: item.id,
    label: item.label,
    value: item.value,
    sort_order: index,
  })))

  await replaceCollection(client, 'pricing_pieces', catalog.pieces.map((item, index) => ({
    id: item.id,
    name: item.name,
    purpose: item.purpose,
    body: item.body,
    sort_order: index,
  })))

  await replaceCollection(client, 'pricing_rules', catalog.rules.map((item, index) => ({
    id: item.id,
    title: item.title,
    body: item.body,
    sort_order: index,
  })))

  const { error: customError } = await client
    .from('pricing_custom')
    .update({
      title: catalog.custom.title,
      lead: catalog.custom.lead,
      floor: catalog.custom.floor,
    })
    .eq('id', 1)
  throwIfError(customError, 'pricing_custom')

  const { error: ocasioesError } = await client
    .from('pricing_ocasioes_choices')
    .update({
      receive_prompt: catalog.ocasioesChoices.receivePrompt,
      time_prompt: catalog.ocasioesChoices.timePrompt,
      bruto_label: catalog.ocasioesChoices.bruto.label,
      bruto_lead: catalog.ocasioesChoices.bruto.lead,
      editado_label: catalog.ocasioesChoices.editado.label,
      editado_lead: catalog.ocasioesChoices.editado.lead,
      meia_label: catalog.ocasioesChoices.meia.label,
      meia_lead: catalog.ocasioesChoices.meia.lead,
      diaria_label: catalog.ocasioesChoices.diaria.label,
      diaria_lead: catalog.ocasioesChoices.diaria.lead,
    })
    .eq('id', 1)
  throwIfError(ocasioesError, 'pricing_ocasioes_choices')
}

async function replaceCollection(
  client: SupabaseClient,
  table: 'pricing_addons' | 'pricing_pieces' | 'pricing_rules',
  rows: Record<string, unknown>[],
): Promise<void> {
  const { data, error } = await client.from(table).select('id')
  throwIfError(error, `${table}.select`)

  const keep = new Set(rows.map((row) => String(row.id)))
  const remove = (data ?? []).map((row) => row.id as string).filter((id) => !keep.has(id))
  if (remove.length > 0) {
    const { error: deleteError } = await client.from(table).delete().in('id', remove)
    throwIfError(deleteError, `${table}.delete`)
  }

  const { error: upsertError } = await client.from(table).upsert(rows)
  throwIfError(upsertError, table)
}
