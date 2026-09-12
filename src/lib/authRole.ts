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
