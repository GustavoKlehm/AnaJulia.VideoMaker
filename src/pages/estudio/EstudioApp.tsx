import { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { resolveEstudioPath } from '../../lib/router'
import { EstudioCatalogo } from './EstudioCatalogo'
import { EstudioEquipe } from './EstudioEquipe'
import { EstudioHistorias } from './EstudioHistorias'
import { EstudioHome } from './EstudioHome'
import { EstudioLogin } from './EstudioLogin'
import { EstudioMateriais } from './EstudioMateriais'
import { EstudioPaginaHome } from './EstudioPaginaHome'
import { EstudioShell } from './EstudioShell'
import './estudio.css'

export function EstudioApp() {
  const { isAdmin, loading, unavailable, signIn, signOut, resetPassword, user } = useAuth()
  const [path, setPath] = useState(() => resolveEstudioPath(window.location.pathname))

  useEffect(() => {
    document.title = 'Estúdio — Ana Julia'
    function sync() {
      setPath(resolveEstudioPath(window.location.pathname))
    }
    window.addEventListener('popstate', sync)
    return () => window.removeEventListener('popstate', sync)
  }, [])

  if (unavailable) {
    return (
      <div className="estudio">
        <main className="estudio-gate">
          <div className="estudio-gate__card">
            <p className="estudio-kicker">Backstage</p>
            <h1>O estúdio está sem chave.</h1>
            <p>Falta configurar o Supabase neste ambiente.</p>
          </div>
        </main>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="estudio">
        <main className="estudio-gate">
          <p className="estudio-kicker">Abrindo o estúdio…</p>
        </main>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="estudio">
        <EstudioLogin onSignIn={signIn} onReset={resetPassword} />
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="estudio">
        <main className="estudio-gate">
          <div className="estudio-gate__card">
            <p className="estudio-kicker">Backstage</p>
            <h1>Essa chave não abre o estúdio.</h1>
            <p>
              O login existe, mas ainda não é da Ana Júlia. Sai e entra de novo —
              o primeiro acesso ganha a chave.
            </p>
            <button className="estudio-button-ghost" type="button" onClick={() => void signOut()}>
              Sair
            </button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="estudio">
      <EstudioShell path={path} onSignOut={() => void signOut()}>
        {path === 'catalogo' ? <EstudioCatalogo /> : null}
        {path === 'pagina-home' ? <EstudioPaginaHome /> : null}
        {path === 'historias' ? <EstudioHistorias /> : null}
        {path === 'materiais' ? <EstudioMateriais /> : null}
        {path === 'equipe' ? <EstudioEquipe /> : null}
        {path === 'inicio' ? <EstudioHome /> : null}
      </EstudioShell>
    </div>
  )
}
