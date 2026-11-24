import { createHash } from 'node:crypto'
import { getSupabase } from './supabase.js'

type Verdict = { admin: boolean; until: number }

/** Quanto tempo um token já conferido vale sem perguntar de novo (nunca passa do vencimento do próprio JWT). */
const MAX_CACHE_MS = 10 * 60 * 1000
const NEGATIVE_CACHE_MS = 60 * 1000
const MAX_ENTRIES = 500

const cache = new Map<string, Verdict>()

function keyFor(token: string): string {
  return createHash('sha256').update(token).digest('base64url')
}

function remember(key: string, verdict: Verdict) {
  if (cache.size >= MAX_ENTRIES) {
    const now = Date.now()
    for (const [k, v] of cache) if (v.until <= now) cache.delete(k)
    if (cache.size >= MAX_ENTRIES) cache.delete(cache.keys().next().value as string)
  }
  cache.set(key, verdict)
}

/**
 * Confere se o JWT é de admin. Usa getClaims (verificação local quando o projeto tem chaves assimétricas;
 * com a chave antiga HS256 ele cai no /auth/v1/user) e guarda o resultado em memória até o token vencer,
 * para não bater no Auth a cada requisição do estúdio. Lança erro só se o Auth estiver fora.
 */
export async function isAdminToken(token: string): Promise<boolean> {
  const key = keyFor(token)
  const now = Date.now()
  const cached = cache.get(key)
  if (cached && cached.until > now) return cached.admin
  if (cached) cache.delete(key)

  const { data, error } = await getSupabase().auth.getClaims(token)
  if (error || !data?.claims) {
    remember(key, { admin: false, until: now + NEGATIVE_CACHE_MS })
    return false
  }
  const claims = data.claims as { exp?: number; app_metadata?: { role?: unknown } }
  const admin = claims.app_metadata?.role === 'admin'
  const expMs = typeof claims.exp === 'number' ? claims.exp * 1000 : now + MAX_CACHE_MS
  remember(key, { admin, until: Math.min(expMs, now + (admin ? MAX_CACHE_MS : NEGATIVE_CACHE_MS)) })
  return admin
}
