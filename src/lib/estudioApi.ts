import type { Session } from '@supabase/supabase-js'
import { getSupabase } from './supabase'

/**
 * A sessão guardada nas telas só muda quando troca o usuário (useAuth), então o token dela pode estar velho.
 * getSession() lê do armazenamento local (sem ida à rede) e já vem com o token renovado.
 */
async function currentAccessToken(fallback: Session): Promise<string> {
  try {
    const { data } = await getSupabase().auth.getSession()
    return data.session?.access_token ?? fallback.access_token
  } catch {
    return fallback.access_token
  }
}

export type StudioMember = {
  id: string
  email: string
  admin: boolean
}

export function messageForFailedStudioResponse(status: number): string {
  if (status === 404) {
    return 'A API do estúdio não está no ar. Confere se o servidor local subiu na porta certa.'
  }
  return 'O estúdio não respondeu.'
}

export async function estudioRequest<T>(
  path: string,
  session: Session,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      Authorization: `Bearer ${await currentAccessToken(session)}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })

  const payload = (await response.json().catch(() => ({}))) as { error?: string } & T
  if (!response.ok) {
    throw new Error(payload.error || messageForFailedStudioResponse(response.status))
  }
  return payload
}

export function listStudioUsers(session: Session) {
  return estudioRequest<{ users: StudioMember[] }>('/api/estudio/users', session)
}

export function createStudioUser(
  session: Session,
  input: { email: string; password: string; promote: boolean },
) {
  return estudioRequest<{ user: StudioMember }>('/api/estudio/users', session, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function promoteStudioUser(session: Session, email: string) {
  return estudioRequest<{ user: StudioMember }>('/api/estudio/users/promote', session, {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}
