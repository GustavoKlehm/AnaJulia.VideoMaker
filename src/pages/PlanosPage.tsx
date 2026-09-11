import { SiteHeader } from '../components/SiteHeader'
import { Reveal } from '../components/Reveal'
import './PlanosPage.css'

export function PlanosPage() {
  return (
    <>
      <a className="skip-link" href="#planos-conteudo">
        Ir ao conteúdo
      </a>
      <SiteHeader onCinema={false} />

      <main className="planos" id="planos-conteudo">
        <section className="planos__intro">
          <Reveal>
            <p className="planos__eyebrow">Planos</p>
            <h1 className="planos__title">Quanto custa guardar um momento</h1>
            <p className="planos__lead">
              Cada plano diz exatamente quanto tempo eu fico com você, o que você
              recebe e em quanto tempo. Sem valor escondido e sem surpresa no meio
              do caminho.
            </p>
          </Reveal>
        </section>
      </main>
    </>
  )
}
