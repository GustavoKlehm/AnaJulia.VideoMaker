import { getSupabase } from './supabase'
import { fallbackAssistenteCatalog } from './assistenteCatalog'
import type { AssistenteCatalog, AssistenteLine } from './assistenteKnowledge'

type LineRow = {
  id: string
  title: string
  promise: string
  lead: string
  sort_order: number
}

type TierRow = {
  id: string
  line_id: string
  name: string
  need: string
  capture: string
  delivery: string[]
  price: number
  sort_order: number
}

type NamedRow = {
  label?: string
  value?: string
  name?: string
  purpose?: string
  body?: string
  title?: string
  sort_order: number
}

type SettingsRow = {
  slogan: string
  about_heading: string
  about_p1: string
  about_p2: string
  contact_heading: string
  contact_lead: string
}

function byOrder<T extends { sort_order: number }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.sort_order - b.sort_order)
}

export async function loadAssistenteCatalog(): Promise<AssistenteCatalog> {
  try {
    const client = getSupabase()
    const [settingsRes, linesRes, tiersRes, addOnsRes, piecesRes, rulesRes, customRes] =
      await Promise.all([
        client.from('site_settings').select('slogan, about_heading, about_p1, about_p2, contact_heading, contact_lead').eq('id', 1).maybeSingle(),
        client.from('pricing_lines').select('id, title, promise, lead, sort_order'),
        client.from('pricing_tiers').select('id, line_id, name, need, capture, delivery, price, sort_order'),
        client.from('pricing_addons').select('label, value, sort_order'),
        client.from('pricing_pieces').select('name, purpose, body, sort_order'),
        client.from('pricing_rules').select('title, body, sort_order'),
        client.from('pricing_custom').select('title, lead, floor').eq('id', 1).maybeSingle(),
      ])

    if (
      settingsRes.error ||
      linesRes.error ||
      tiersRes.error ||
      addOnsRes.error ||
      piecesRes.error ||
      rulesRes.error ||
      customRes.error
    ) {
      return fallbackAssistenteCatalog()
    }

    const lineRows = byOrder((linesRes.data ?? []) as LineRow[])
    if (lineRows.length === 0) {
      return fallbackAssistenteCatalog()
    }

    const tiersByLine = new Map<string, TierRow[]>()
    for (const tier of byOrder((tiersRes.data ?? []) as TierRow[])) {
      const list = tiersByLine.get(tier.line_id) ?? []
      list.push(tier)
      tiersByLine.set(tier.line_id, list)
    }

    const settings = settingsRes.data as SettingsRow | null
    const fallback = fallbackAssistenteCatalog()
    const custom = customRes.data as { title: string; lead: string; floor: number } | null

    const lines: AssistenteLine[] = lineRows.map((line) => ({
      id: line.id,
      title: line.title,
      promise: line.promise,
      lead: line.lead,
      tiers: (tiersByLine.get(line.id) ?? []).map((tier) => ({
        id: tier.id,
        name: tier.name,
        need: tier.need,
        capture: tier.capture,
        delivery: [...tier.delivery],
        price: Number(tier.price),
      })),
    }))

    return {
      slogan: settings?.slogan ?? fallback.slogan,
      about: {
        heading: settings?.about_heading ?? fallback.about.heading,
        p1: settings?.about_p1 ?? fallback.about.p1,
        p2: settings?.about_p2 ?? fallback.about.p2,
      },
      contact: {
        heading: settings?.contact_heading ?? fallback.contact.heading,
        lead: settings?.contact_lead ?? fallback.contact.lead,
      },
      lines,
      addOns: byOrder((addOnsRes.data ?? []) as NamedRow[]).map((item) => ({
        label: item.label ?? '',
        value: item.value ?? '',
      })),
      pieces: byOrder((piecesRes.data ?? []) as NamedRow[]).map((item) => ({
        name: item.name ?? '',
        purpose: item.purpose ?? '',
        body: item.body ?? '',
      })),
      rules: byOrder((rulesRes.data ?? []) as NamedRow[]).map((item) => ({
        title: item.title ?? '',
        body: item.body ?? '',
      })),
      custom: custom
        ? { title: custom.title, lead: custom.lead, floor: Number(custom.floor) }
        : fallback.custom,
    }
  } catch {
    return fallbackAssistenteCatalog()
  }
}
