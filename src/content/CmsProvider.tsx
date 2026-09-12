import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { resolveRoute } from '../lib/router'
import { getSupabase } from '../lib/supabase'
import { CmsContext } from './cmsContext'
import { fetchCms } from './cmsFetch'
import { fallbackPricing, fallbackSite } from './fallback'
import type { PricingCatalog, SiteContent } from './types'

function applySeo(site: SiteContent) {
  if (resolveRoute(window.location.pathname) === 'estudio') {
    return
  }
  document.title = site.seo.title
  const meta = document.querySelector('meta[name="description"]')
  if (meta) {
    meta.setAttribute('content', site.seo.description)
  }
}

export function CmsProvider({ children }: { children: ReactNode }) {
  const [site, setSite] = useState<SiteContent>(fallbackSite)
  const [pricing, setPricing] = useState<PricingCatalog>(fallbackPricing)
  const [ready, setReady] = useState(false)

  const refresh = useMemo(() => {
    return async () => {
      try {
        const snapshot = await fetchCms(getSupabase())
        setSite(snapshot.site)
        setPricing(snapshot.pricing)
        applySeo(snapshot.site)
      } catch {
        setSite(fallbackSite)
        setPricing(fallbackPricing)
        applySeo(fallbackSite)
      } finally {
        setReady(true)
      }
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const value = useMemo(
    () => ({ site, pricing, ready, refresh }),
    [site, pricing, ready, refresh],
  )

  return <CmsContext.Provider value={value}>{children}</CmsContext.Provider>
}
