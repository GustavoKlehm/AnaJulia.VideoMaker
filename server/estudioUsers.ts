export type StudioMember = {
  id: string
  email: string
  admin: boolean
}

type AuthLike = {
  id?: string
  email?: string | null
  app_metadata?: Record<string, unknown>
  user_metadata?: Record<string, unknown>
}

export function readBearerToken(header: string | undefined): string | null {
  if (!header?.startsWith('Bearer ')) {
    return null
  }
  const token = header.slice('Bearer '.length).trim()
  return token.length > 0 ? token : null
}

export function parseCreateUserBody(body: unknown):
  | { email: string; password: string; promote: boolean }
  | { error: string } {
  if (!body || typeof body !== 'object') {
    return { error: 'Informa e-mail e senha.' }
  }

  const record = body as { email?: unknown; password?: unknown; promote?: unknown }
  const email = typeof record.email === 'string' ? record.email.trim().toLowerCase() : ''
  const password = typeof record.password === 'string' ? record.password : ''
  const promote = record.promote !== false

  if (!email.includes('@') || email.length < 5) {
    return { error: 'Informa um e-mail válido.' }
  }
  if (password.length < 8) {
    return { error: 'A senha precisa de pelo menos 8 caracteres.' }
  }

  return { email, password, promote }
}

export function parsePromoteBody(body: unknown): { email: string } | { error: string } {
  if (!body || typeof body !== 'object') {
    return { error: 'Informa o e-mail.' }
  }
  const email =
    typeof (body as { email?: unknown }).email === 'string'
      ? (body as { email: string }).email.trim().toLowerCase()
      : ''
  if (!email.includes('@')) {
    return { error: 'Informa um e-mail válido.' }
  }
  return { email }
}

export function mapStudioMember(user: AuthLike): StudioMember {
  return {
    id: user.id ?? '',
    email: user.email ?? '',
    admin: user.app_metadata?.role === 'admin',
  }
}
