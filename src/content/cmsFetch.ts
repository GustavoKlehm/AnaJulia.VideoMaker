import type { SupabaseClient } from '@supabase/supabase-js'
import { mapPricing, mapSite } from './cmsMap'
import type {
  MediaAssetRow,
  PricingCatalog,
  PricingCategoryRow,
  PricingCustomRow,
  PricingLineRow,
  PricingServiceRow,
  PricingTierRow,
  SiteContent,
  SiteSettingsRow,
  SortableRow,
  StoryRow,
} from './types'

export type CmsSnapshot = {
  site: SiteContent
  pricing: PricingCatalog
}

function throwIfError(error: { message: string } | null, label: string): void {
  if (error) {
    throw new Error(`${label}: ${error.message}`)
  }
}

export async function fetchCms(client: SupabaseClient): Promise<CmsSnapshot> {
  const [
    settingsRes,
    storiesRes,
    mediaRes,
    linesRes,
    categoriesRes,
    servicesRes,
    tiersRes,
    addOnsRes,
    piecesRes,
    rulesRes,
    customRes,
  ] = await Promise.all([
    client.from('site_settings').select('*').eq('id', 1).maybeSingle(),
    client.from('stories').select('*').order('sort_order'),
    client.from('media_assets').select('*'),
    client.from('pricing_lines').select('*').order('sort_order'),
    client.from('pricing_categories').select('*').order('sort_order'),
    client.from('pricing_services').select('*').order('sort_order'),
    client.from('pricing_tiers').select('*').order('sort_order'),
    client.from('pricing_addons').select('*').order('sort_order'),
    client.from('pricing_pieces').select('*').order('sort_order'),
    client.from('pricing_rules').select('*').order('sort_order'),
    client.from('pricing_custom').select('*').eq('id', 1).maybeSingle(),
  ])

  throwIfError(settingsRes.error, 'site_settings')
  throwIfError(storiesRes.error, 'stories')
  throwIfError(mediaRes.error, 'media_assets')
  throwIfError(linesRes.error, 'pricing_lines')
  throwIfError(categoriesRes.error, 'pricing_categories')
  throwIfError(servicesRes.error, 'pricing_services')
  throwIfError(tiersRes.error, 'pricing_tiers')
  throwIfError(addOnsRes.error, 'pricing_addons')
  throwIfError(piecesRes.error, 'pricing_pieces')
  throwIfError(rulesRes.error, 'pricing_rules')
  throwIfError(customRes.error, 'pricing_custom')

  const mediaById: Record<number, MediaAssetRow> = {}
  for (const row of (mediaRes.data ?? []) as MediaAssetRow[]) {
    mediaById[row.id] = row
  }

  return {
    site: mapSite(
      (settingsRes.data as SiteSettingsRow | null) ?? null,
      (storiesRes.data ?? []) as StoryRow[],
      mediaById,
    ),
    pricing: mapPricing({
      lines: (linesRes.data ?? []) as PricingLineRow[],
      categories: (categoriesRes.data ?? []) as PricingCategoryRow[],
      services: (servicesRes.data ?? []) as PricingServiceRow[],
      tiers: (tiersRes.data ?? []) as PricingTierRow[],
      addOns: (addOnsRes.data ?? []) as SortableRow[],
      pieces: (piecesRes.data ?? []) as SortableRow[],
      rules: (rulesRes.data ?? []) as SortableRow[],
      custom: (customRes.data as PricingCustomRow | null) ?? null,
    }),
  }
}
