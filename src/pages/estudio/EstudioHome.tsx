import { RouteLink } from '../../components/RouteLink'
import './estudio.css'

export function EstudioHome() {
  return (
    <main className="estudio-page">
      <div>
        <p className="estudio-kicker">Estúdio</p>
        <h1>O que você quer ajustar?</h1>
      </div>
      <nav className="estudio-home-links" aria-label="Atalhos">
        <RouteLink to="/estudio/catalogo">
          Catálogo <span aria-hidden="true">→</span>
        </RouteLink>
        <RouteLink to="/estudio/paginas/home">
          Home <span aria-hidden="true">→</span>
        </RouteLink>
        <RouteLink to="/estudio/historias">
          Histórias <span aria-hidden="true">→</span>
        </RouteLink>
        <RouteLink to="/estudio/materiais">
          Materiais <span aria-hidden="true">→</span>
        </RouteLink>
        <RouteLink to="/estudio/equipe">
          Equipe <span aria-hidden="true">→</span>
        </RouteLink>
      </nav>
    </main>
  )
}
