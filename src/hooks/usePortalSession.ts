import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { isAdminFromUser, sameAuthIdentity } from '../lib/authRole'
import { getSupabase } from '../lib/supabase'
import { loginEmailForPhone, normalizePhone } from '../shared/phone'

/** Sessão da área do cliente. Diferente do useAuth: nunca tenta pegar a chave do estúdio. */
export function usePortalSession() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [unavailable, setUnavailable] = useState(false)

  useEffect(() => {
    let client
    try {
      client = getSupabase()
    } catch {
      setUnavailable(true)
      setLoading(false)
      return
    }
    void client.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    // Ignora TOKEN_REFRESHED e o SIGNED_IN repetido de quando a aba volta a ficar visível: só muda com outro usuário.
    const { data } = client.auth.onAuthStateChange((_event, next) => {
      setSession((current) => (sameAuthIdentity(current?.user, next?.user) ? current : next))
    })
    return () => data.subscription.unsubscribe()
  }, [])

  async function signIn(phone: string, pin: string) {
    const normalized = normalizePhone(phone)
    if (!normalized) throw new Error('telefone')
    const { error } = await getSupabase().auth.signInWithPassword({
      email: loginEmailForPhone(normalized),
      password: pin,
    })
    if (error) throw error
  }

  async function signOut() {
    await getSupabase().auth.signOut()
  }

  const user = session?.user ?? null
  return { session, user, isAdmin: isAdminFromUser(user), loading, unavailable, signIn, signOut }
}
