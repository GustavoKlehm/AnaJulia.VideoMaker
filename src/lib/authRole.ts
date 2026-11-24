type AuthLikeUser = {
  app_metadata?: Record<string, unknown>
  user_metadata?: Record<string, unknown>
} | null

export function isAdminFromUser(user: AuthLikeUser): boolean {
  return user?.app_metadata?.role === 'admin'
}

export function needsStudioClaim(user: AuthLikeUser, alreadyTried: boolean): boolean {
  return Boolean(user) && !isAdminFromUser(user) && !alreadyTried
}

type IdentityUser = { id: string; app_metadata?: Record<string, unknown> } | null | undefined

/**
 * O supabase-js dispara SIGNED_IN/TOKEN_REFRESHED toda vez que a aba volta a ficar visível, sempre com um objeto
 * de sessão novo. Só vale atualizar a tela quando muda quem está logado (ou o papel dele, ex.: virou admin).
 */
export function sameAuthIdentity(a: IdentityUser, b: IdentityUser): boolean {
  if (!a || !b) return !a && !b
  return a.id === b.id && a.app_metadata?.role === b.app_metadata?.role
}
