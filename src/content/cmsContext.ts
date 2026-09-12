import { createContext, useContext } from 'react'
import type { PricingCatalog, SiteContent } from './types'

export type CmsContextValue = {
  site: SiteContent
  pricing: PricingCatalog
  ready: boolean
  refresh: () => Promise<void>
}

export const CmsContext = createContext<CmsContextValue | null>(null)

export function useCms(): CmsContextValue {
  const value = useContext(CmsContext)
  if (!value) {
    throw new Error('useCms must be used within CmsProvider')
  }
  return value
}
