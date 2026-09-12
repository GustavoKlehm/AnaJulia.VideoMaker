import { useEffect, useRef, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { isAdminFromUser, needsStudioClaim } from '../lib/authRole'
import { getSupabase } from '../lib/supabase'

async function claimStudioIfNeeded(): Promise<boolean> {
  const client = getSupabase()
  const { data, error } = await client.rpc('claim_studio')
  if (error || data !== true) {
    return false
  }
  const { error: refreshError } = await client.auth.refreshSession()
  return !refreshError
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState(false)
  const [unavailable, setUnavailable] = useState(false)
  const claimTried = useRef(false)

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

    const { data } = client.auth.onAuthStateChange((_event, next) => {
      setSession(next)
    })

    return () => data.subscription.unsubscribe()
  }, [])

  const user: User | null = session?.user ?? null

  useEffect(() => {
    if (loading || !needsStudioClaim(user, claimTried.current)) {
      return
    }

    claimTried.current = true
    setClaiming(true)
    void claimStudioIfNeeded().finally(() => {
      setClaiming(false)
    })
  }, [loading, user])

  async function signIn(email: string, password: string) {
    const client = getSupabase()
    const { data, error } = await client.auth.signInWithPassword({ email, password })
    if (error) {
      throw error
    }
    if (needsStudioClaim(data.user, claimTried.current)) {
      claimTried.current = true
      await claimStudioIfNeeded()
    }
  }

  async function signOut() {
    claimTried.current = false
    await getSupabase().auth.signOut()
  }

  async function resetPassword(email: string) {
    const { error } = await getSupabase().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/estudio`,
    })
    if (error) {
      throw error
    }
  }

  return {
    session,
    user,
    isAdmin: isAdminFromUser(user),
    loading: loading || claiming,
    unavailable,
    signIn,
    signOut,
    resetPassword,
  }
}
