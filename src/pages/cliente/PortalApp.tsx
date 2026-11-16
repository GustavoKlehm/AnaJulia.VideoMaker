import { useEffect, useState } from 'react'
import { usePortalSession } from '../../hooks/usePortalSession'
import { resolvePortalPath } from '../../lib/router'
import { PortalInicio } from './PortalInicio'
import { PortalLogin } from './PortalLogin'
import { PortalPlano } from './PortalPlano'
import './portal.css'

export function PortalApp() {
  const { user, isAdmin, loading, unavailable, signIn, signOut } = usePortalSession()
  const [path, setPath] = useState(() => resolvePortalPath(window.location.pathname))

  useEffect(() => {
    function sync() {
      setPath(resolvePortalPath(window.location.pathname))
    }
    window.addEventListener('popstate', sync)
    return () => window.removeEventListener('popstate', sync)
  }, [])

  useEffect(() => {
    document.title = 'Área do cliente — Ana Julia'
  }, [path])

  if (unavailable) {
    return (
      <main className="portal portal-gate">
        <p>A área do cliente está fora do ar neste ambiente.</p>
      </main>
    )
  }

  if (loading) {
    return (
      <main className="portal portal-gate" aria-busy="true">
        <p>Abrindo…</p>
      </main>
    )
  }

  if (!user) {
    return <PortalLogin onSignIn={signIn} />
  }

  if (path.view === 'plano') {
    return (
      <PortalPlano
        key={`${path.slug}/${path.periodo}`}
        slug={path.slug}
        periodo={path.periodo}
        userId={user.id}
        isAdmin={isAdmin}
        onSignOut={() => void signOut()}
      />
    )
  }

  return <PortalInicio isAdmin={isAdmin} onSignOut={() => void signOut()} />
}
