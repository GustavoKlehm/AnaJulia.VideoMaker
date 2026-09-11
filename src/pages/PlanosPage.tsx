import { SiteHeader } from '../components/SiteHeader'
import { PlanTier } from '../components/PlanTier'
import { Reveal } from '../components/Reveal'
import type { PricingLine } from '../content/pricing'
import { addOns, custom, formatBRL, lines } from '../content/pricing'
import { whatsappLink } from '../content/site'
import './PlanosPage.css'

function startingAt(line: PricingLine): string {
  const lowest = Math.min(...line.tiers.map((tier) => tier.price))
  const suffix = line.unit === 'month' ? '/mês' : ''
  return `A partir de ${formatBRL(lowest)}${suffix}`
}

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

        {lines.map((line) => (
          <section className="line" key={line.id} aria-labelledby={`linha-${line.id}`}>
            <div className="line__inner">
              <Reveal className="line__head">
                <h2 className="line__title" id={`linha-${line.id}`}>
                  {line.title}
                </h2>
                {line.display === 'from' ? (
                  <p className="line__from">{startingAt(line)}</p>
                ) : null}
                <p className="line__lead">{line.lead}</p>
              </Reveal>
              <div className="tiers">
                {line.tiers.map((tier) => (
                  <PlanTier key={tier.id} tier={tier} unit={line.unit} />
                ))}
              </div>
            </div>
          </section>
        ))}

        <section className="line" aria-labelledby="linha-personalizado">
          <div className="line__inner line__inner--narrow">
            <Reveal>
              <h2 className="line__title" id="linha-personalizado">
                {custom.title}
              </h2>
              <p className="line__lead">{custom.lead}</p>
              <p className="custom__floor">
                Orçamento mínimo de {formatBRL(custom.floor)}.
              </p>
              <a
                className="tier__cta custom__cta"
                href={whatsappLink(
                  'Olá! Vim pelo site e queria um orçamento personalizado.',
                )}
                target="_blank"
                rel="noopener noreferrer"
              >
                Pedir orçamento
              </a>
            </Reveal>
          </div>
        </section>

        <section className="line" aria-labelledby="linha-adicionais">
          <div className="line__inner line__inner--narrow">
            <Reveal>
              <h2 className="line__title" id="linha-adicionais">
                Adicionais
              </h2>
              <p className="line__lead">
                Valem para qualquer plano e sempre aparecem discriminados no
                orçamento, nunca embutidos no total.
              </p>
            </Reveal>
            <dl className="addons">
              {addOns.map((addOn) => (
                <div className="addons__row" key={addOn.id}>
                  <dt>{addOn.label}</dt>
                  <dd>{addOn.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      </main>
    </>
  )
}
