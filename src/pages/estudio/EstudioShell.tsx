import type { ReactNode } from 'react'
import type { EstudioPath } from '../../lib/router'
import { RouteLink } from '../../components/RouteLink'
import './estudio.css'

const LINKS: { href: string; label: string; path: EstudioPath }[] = [
  { href: '/estudio', label: 'Início', path: 'inicio' },
  { href: '/estudio/catalogo', label: 'Catálogo', path: 'catalogo' },
  { href: '/estudio/paginas/home', label: 'Home', path: 'pagina-home' },
  { href: '/estudio/historias', label: 'Histórias', path: 'historias' },
  { href: '/estudio/materiais', label: 'Materiais', path: 'materiais' },
  { href: '/estudio/equipe', label: 'Equipe', path: 'equipe' },
]

type EstudioShellProps = {
  path: EstudioPath
  onSignOut: () => void
  children: ReactNode
}

export function EstudioShell({ path, onSignOut, children }: EstudioShellProps) {
  return (
    <div className="estudio-shell">
      <a className="estudio__skip" href="#estudio-conteudo">
        Ir ao conteúdo
      </a>
      <nav className="estudio-nav" aria-label="Estúdio">
        <RouteLink className="estudio-nav__brand" to="/estudio">
          Estúdio
        </RouteLink>
        {LINKS.map((item) => (
          <RouteLink
            key={item.href}
            className={path === item.path ? 'is-on' : undefined}
            to={item.href}
          >
            {item.label}
          </RouteLink>
        ))}
        <RouteLink to="/">Ver o site</RouteLink>
        <button type="button" onClick={onSignOut}>
          Sair
        </button>
      </nav>
      <div id="estudio-conteudo">{children}</div>
    </div>
  )
}
